import { getStore } from '@netlify/blobs';
import { getIdentityConfig, getUser, verifyRequestOrigin } from '@netlify/identity';
import Stripe from 'stripe';

export const config = { path: '/api/membership' };

const headers = { 'Cache-Control': 'private, no-store' };
const json = (data, status = 200) => Response.json(data, { status, headers });
const liveStatuses = new Set(['active', 'trialing']);
const billingStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete']);
const lessons = [
  { id: 'divine', title: 'Divine Light', description: 'A quiet practice for reconnecting with yourself.', content: 'Find a comfortable seat and let your hands rest. Notice where your body meets the chair or floor. Take a few easy breaths, then ask yourself what would feel supportive today. Give yourself a moment to listen before you return to your day.' },
  { id: 'sleep', title: 'Sleep', description: 'A gentle way to transition into rest.', content: 'Lower the lights and get comfortable. Let your shoulders soften and notice the rhythm of your breathing. When your thoughts wander, gently return your attention to the next breath.', audio: '/library-relax' },
];

// Files a one-time library buyer can download. Add new recordings here.
const downloads = [
  { id: "relax", title: "Relax", file: "/media/relax.mp3", name: "Divine-Light-Relax.mp3", size: "44 MB" },
];

export function isLibraryPurchase(session, libraryPrice) {
  return session.mode === "payment" && session.payment_status === "paid" && session.metadata?.libraryPrice === libraryPrice;
}

export function matchesMembership(subscription, price, statuses = liveStatuses) {
  return statuses.has(subscription.status) && subscription.items.data.some(item => item.price.id === price);
}

export default async function membership(request) {
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
  if (request.method === 'POST') {
    try { verifyRequestOrigin(request); }
    catch { return json({ error: 'Request origin is invalid.' }, 403); }
  }

  try {
    const user = await getUser();
    if (!user?.id) return getIdentityConfig()
      ? json({ error: 'Sign in to continue.' }, 401)
      : json({ error: 'Member sign-in is being set up.' }, 503);

    const price = process.env.STRIPE_MEMBERSHIP_PRICE_ID;
    const libraryPrice = process.env.STRIPE_LIBRARY_PRICE_ID;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!price || !stripeKey) return json({ error: 'Membership billing is being set up.' }, 503);

    const stripe = new Stripe(stripeKey);
    const accounts = getStore({ name: 'member-accounts', consistency: 'strong' });
    const progress = getStore({ name: 'member-progress', consistency: 'strong' });
    const origin = new URL(request.url).origin;
    const userKey = encodeURIComponent(user.id);
    const body = request.method === 'POST' ? await request.json().catch(() => null) : null;
    let customer = await accounts.get(userKey);
    const ensureCustomer = async () => {
      if (customer) return customer;
      const record = await stripe.customers.create({ email: user.email, metadata: { memberId: user.id } }, {
        idempotencyKey: `divine-light-member-${userKey}`,
      });
      await accounts.set(userKey, record.id);
      return record.id;
    };
    let active = false;
    let hasBilling = false;

    if (customer) {
      for await (const subscription of stripe.subscriptions.list({ customer, status: 'all', limit: 100 })) {
        active ||= matchesMembership(subscription, price);
        hasBilling ||= matchesMembership(subscription, price, billingStatuses);
        if (active) break;
      }
    }

    // One-time $100 library purchase: remembered once Stripe confirms payment.
    const ownedKey = `${userKey}/library`;
    let ownsLibrary = (await accounts.get(ownedKey)) === "owned";
    if (!ownsLibrary && customer && libraryPrice) {
      for await (const session of stripe.checkout.sessions.list({ customer, status: "complete", limit: 100 })) {
        if (isLibraryPurchase(session, libraryPrice)) { ownsLibrary = true; await accounts.set(ownedKey, "owned"); break; }
      }
    }

    if (request.method === 'GET') {
      const completed = active ? await Promise.all(lessons.map(async ({ id }) =>
        (await progress.get(`${userKey}/${id}`)) === 'complete' ? id : null)) : [];
      return json({ email: user.email, active, hasBilling, lessons: active ? lessons : [], completed: completed.filter(Boolean),
        libraryForSale: Boolean(libraryPrice), ownsLibrary, downloads: ownsLibrary ? downloads : [] });
    }

    if (body?.action === 'complete' && lessons.some(lesson => lesson.id === body.lesson) && typeof body.complete === 'boolean') {
      if (!active) return json({ error: 'An active membership is required.' }, 403);
      const key = `${userKey}/${body.lesson}`;
      if (body.complete) await progress.set(key, 'complete');
      else await progress.delete(key);
      return json({ complete: body.complete });
    }

    if (body?.action === 'manage' && customer) {
      const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${origin}/members` });
      return json({ url: session.url });
    }

    if (body?.action === 'checkout') {
      if (hasBilling) return json({ error: 'Manage your existing membership from this page.' }, 409);
      const plan = await stripe.prices.retrieve(price);
      if (!plan.active || plan.currency !== 'usd' || plan.unit_amount !== 2500 ||
          plan.recurring?.interval !== 'month' || plan.recurring.interval_count !== 1) {
        return json({ error: 'Membership checkout is temporarily unavailable.' }, 503);
      }

      customer = await ensureCustomer();

      for await (const session of stripe.checkout.sessions.list({ customer, status: 'open', limit: 10 })) {
        if (session.mode === 'subscription' && session.metadata?.memberPrice === price && session.url) {
          return json({ url: session.url });
        }
      }

      const session = await stripe.checkout.sessions.create({
        customer,
        mode: 'subscription',
        line_items: [{ price, quantity: 1 }],
        metadata: { memberPrice: price },
        success_url: `${origin}/members?checkout=complete`,
        cancel_url: `${origin}/members`,
      }, { idempotencyKey: `divine-light-checkout-${customer}-${Math.floor(Date.now() / 60000)}` });
      return json({ url: session.url });
    }

    if (body?.action === "buy-library") {
      if (!libraryPrice) return json({ error: "The library download is not for sale yet." }, 503);
      if (ownsLibrary) return json({ error: "You already own the library. Your downloads are on this page." }, 409);
      const item = await stripe.prices.retrieve(libraryPrice);
      if (!item.active || item.currency !== "usd" || item.unit_amount !== 10000 || item.type !== "one_time") {
        return json({ error: "Library checkout is temporarily unavailable." }, 503);
      }
      customer = await ensureCustomer();
      for await (const session of stripe.checkout.sessions.list({ customer, status: "open", limit: 10 })) {
        if (session.mode === "payment" && session.metadata?.libraryPrice === libraryPrice && session.url) return json({ url: session.url });
      }
      const session = await stripe.checkout.sessions.create({
        customer,
        mode: "payment",
        line_items: [{ price: libraryPrice, quantity: 1 }],
        metadata: { libraryPrice },
        success_url: `${origin}/members?purchase=complete`,
        cancel_url: `${origin}/members`,
      }, { idempotencyKey: `divine-light-library-${customer}-${Math.floor(Date.now() / 60000)}` });
      return json({ url: session.url });
    }

    return json({ error: 'Unknown membership action.' }, 400);
  } catch (error) {
    console.error('Membership request failed', error?.type || error?.name);
    return json({ error: 'Membership is temporarily unavailable. Please try again shortly.' }, 503);
  }
}
