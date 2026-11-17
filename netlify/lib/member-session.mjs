import { createHash, randomBytes } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const cookieName = '__Host-dl_member';
const sessionSeconds = 7 * 24 * 60 * 60;
export const digest = value => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export const validToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export const authStore = () => getStore({ name: 'member-auth', consistency: 'strong' });
export const sameOrigin = request => request.headers.get('origin') === new URL(request.url).origin;

function sessionKey(request) {
  const value = request.headers.get('cookie')?.split(/;\s*/).find(cookie => cookie.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  return validToken(value) ? 'session/' + digest(value) : null;
}

export async function getMember(request) {
  const key = sessionKey(request);
  if (!key) return null;
  const session = await authStore().get(key, { type: 'json' });
  return session?.expires > Date.now() ? session.user : null;
}

export async function endSession(request) {
  const key = sessionKey(request);
  if (key) await authStore().delete(key);
  return cookie('', 0);
}

function cookie(value, age) {
  return `${cookieName}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
}

export async function startSession(request, email) {
  await endSession(request);
  const value = token();
  const user = { id: digest(email), email };
  await authStore().setJSON('session/' + digest(value), { user, expires: Date.now() + sessionSeconds * 1000 });
  return cookie(value, sessionSeconds);
}
