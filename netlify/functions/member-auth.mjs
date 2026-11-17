import { authStore, digest, endSession, getMember, sameOrigin, startSession, token, validToken } from '../lib/member-session.mjs';

export const config = { path: '/api/member-auth' };
const linkLifetime = 15 * 60 * 1000;
const minute = 60 * 1000;
const sendMessage = 'If the address can receive mail, a sign-in link will arrive shortly.';
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const json = (payload, status = 200, cookies) => Response.json(payload, {
  status,
  headers: { 'Cache-Control': 'private, no-store', ...(cookies ? { 'Set-Cookie': cookies } : {}) },
});

async function sendLink(request, context, email) {
  const apiKey = process.env.MEMBER_EMAIL_API_KEY;
  const from = process.env.MEMBER_EMAIL_FROM;
  if (!apiKey || !from) return json({ error: 'Email sign-in is being set up.' }, 503);
  if (typeof email !== 'string' || email.length > 254 || !emailPattern.test(email)) {
    return json({ error: 'Enter a valid email address.' }, 400);
  }

  const store = authStore();
  const current = Date.now();
  const ip = digest(context?.ip || 'unknown');
  const window = Math.floor(current / minute);
  const emailId = digest(email);
  const allowed = await store.set('send/' + emailId + '/' + window, '', { onlyIfNew: true });
  if (!allowed.modified) return json({ message: sendMessage });

  // Ten slots per IP per minute, claimed atomically across instances.
  let claimed = false;
  for (let slot = 0; slot < 10 && !claimed; slot++) {
    claimed = (await store.set(`limit/${ip}/${window}/${slot}`, '', { onlyIfNew: true })).modified;
  }
  if (!claimed) return json({ error: 'Too many requests. Try again in a minute.' }, 429);

  const code = token();
  const codeKey = 'link/' + digest(code);
  await store.setJSON(codeKey, { email, expires: current + linkLifetime });
  const url = new URL('/members', request.url);
  url.hash = 'member_link=' + code;
  let accepted = false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [email], subject: 'Sign in to Divine Light',
        text: 'Open this link to continue to your Divine Light account. It expires in 15 minutes.\n\n' + url.href +
          '\n\nIf you did not request this email, you can ignore it.',
      }),
      signal: AbortSignal.timeout(8000),
    });
    accepted = response.ok;
  } finally {
    if (!accepted) {
      await store.delete(codeKey);
      await store.delete('send/' + emailId + '/' + window);
    }
  }
  return accepted ? json({ message: sendMessage }) : json({ error: 'Email delivery is temporarily unavailable.' }, 503);
}

export default async function auth(request, context) {
  try {
    if (request.method === 'GET') return json({ signedIn: Boolean(await getMember(request)) });
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (!sameOrigin(request)) return json({ error: 'Request origin is invalid.' }, 403);

    const body = await request.json().catch(() => null);
    if (body?.action === 'send') {
      return await sendLink(request, context, typeof body.email === 'string' ? body.email.trim().toLowerCase() : null);
    }
    if (body?.action === 'logout') return json({ signedIn: false }, 200, await endSession(request));

    if (body?.action === 'redeem' && validToken(body.code)) {
      const store = authStore();
      const key = 'link/' + digest(body.code);
      const record = await store.getWithMetadata(key, { type: 'json' });
      if (record?.data?.expires > Date.now()) {
        const redeemed = await store.setJSON(key, { expires: 0 }, { onlyIfMatch: record.etag });
        if (redeemed.modified) return json({ signedIn: true }, 200, await startSession(request, { id: digest(record.data.email), email: record.data.email }));
      }
      return json({ error: 'This link expired or was already used. Request a new sign-in email.' }, 400);
    }
    return json({ error: 'Invalid sign-in request.' }, 400);
  } catch (error) {
    console.error('Member sign-in failed', error?.name);
    return json({ error: 'Sign-in is temporarily unavailable. Please try again.' }, 503);
  }
}
