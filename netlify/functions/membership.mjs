import { getStore } from '@netlify/blobs';
import { getMember, sameOrigin } from '../lib/member-session.mjs';
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

export function matchesMembership(subscription, price, statuses = liveStatuses) {
  return statuses.has(subscription.status) && subscription.items.data.some(item => item.price.id === price);
}

export default async function membership(request) {
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
  if (request.method === 'POST' && !sameOrigin(request)) return json({ error: 'Request origin is invalid.' }, 403);

  try {
    const user = await getMember(request);
    if (!user) return json({ error: 'Sign in to continue.' }, 401);

    const price = process.env.STRIPE_MEMBERSHIP_PRICE_ID;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!price || !stripeKey) {
      return request.method === 'GET'
        ? json({ email: user.email, active: false, hasBilling: false, billingReady: false, lessons: [], completed: [] })
        : json({ error: 'Membership billing is being set up.' }, 503);
    }

    const stripe = new Stripe(stripeKey);
    const accounts = getStore({ name: 'member-accounts', consistency: 'strong' });
    const progress = getStore({ name: 'member-progress', consistency: 'strong' });
    const origin = new URL(request.url).origin;
    const userKey = encodeURIComponent(user.id);
    const body = request.method === 'POST' ? await request.json().catch(() => null) : null;
    let customer = await accounts.get(userKey);
    let active = false;
    let hasBilling = false;

    if (customer) {
      for await (const subscription of stripe.subscriptions.list({ customer, status: 'all', limit: 100 })) {
        active ||= matchesMembership(subscription, price);
        hasBilling ||= matchesMembership(subscription, price, billingStatuses);
        if (active) break;
      }
    }

    if (request.method === 'GET') {
      const completed = active ? await Promise.all(lessons.map(async ({ id }) =>
        (await progress.get(`${userKey}/${id}`)) === 'complete' ? id : null)) : [];
      return json({ email: user.email, active, hasBilling, billingReady: true, lessons: active ? lessons : [], completed: completed.filter(Boolean) });
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

      if (!customer) {
        const record = await stripe.customers.create({ metadata: { memberId: user.id } }, {
          idempotencyKey: `divine-light-member-${userKey}`,
        });
        customer = record.id;
        await accounts.set(userKey, customer);
      }

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

    return json({ error: 'Unknown membership action.' }, 400);
  } catch (error) {
    console.error('Membership request failed', error?.type || error?.name);
    return json({ error: 'Membership is temporarily unavailable. Please try again shortly.' }, 503);
  }
}
