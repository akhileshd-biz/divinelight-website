import {
  generateAuthenticationOptions, generateRegistrationOptions,
  verifyAuthenticationResponse, verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { authStore, digest, sameOrigin, startSession, token, validToken } from '../lib/member-session.mjs';

export const config = { path: '/api/member-passkey' };
const json = (body, status = 200, cookie) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'private, no-store', ...(cookie ? { 'Set-Cookie': cookie } : {}) },
});
const unavailable = () => json({ error: 'Passkey verification failed. Please try again.' }, 400);
const credentialKey = id => 'passkey/' + digest(id);

export default async function passkey(request, context) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!sameOrigin(request)) return json({ error: 'Request origin is invalid.' }, 403);
  const { hostname: rpID, origin } = new URL(request.url);
  const input = await request.json().catch(() => null);
  const register = input?.kind === 'register';
  if (!register && input?.kind !== 'login') return unavailable();

  try {
    const store = authStore();
    if (input.action === 'begin') {
      const bucket = Math.floor(Date.now() / 60_000);
      const ip = digest(context?.ip || 'unknown');
      let allowed = false;
      for (let slot = 0; slot < 12 && !allowed; slot++) {
        allowed = (await store.set(`passkey-limit/${ip}/${bucket}/${slot}`, '', { onlyIfNew: true })).modified;
      }
      if (!allowed) return json({ error: 'Too many requests. Try again in a minute.' }, 429);
      const flow = token();
      const user = register ? { id: 'passkey-' + token() } : null;
      const options = register
        ? await generateRegistrationOptions({
            rpName: 'Divine Light',
            rpID,
            userID: new TextEncoder().encode(user.id),
            userName: user.id,
            userDisplayName: 'Divine Light Member',
            attestationType: 'none',
            authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
          })
        : await generateAuthenticationOptions({ rpID, userVerification: 'required' });
      await store.setJSON('passkey-flow/' + digest(flow), {
        challenge: options.challenge, kind: input.kind, origin, user, expires: Date.now() + 5 * 60 * 1000,
      });
      return json({ flow, options });
    }

    if (input.action !== 'finish' || !validToken(input.flow) ||
        typeof input.response?.id !== 'string' || input.response.id.length > 2048) return unavailable();
    const flowKey = 'passkey-flow/' + digest(input.flow);
    const record = await store.getWithMetadata(flowKey, { type: 'json' });
    const data = record?.data;
    if (!data || data.expires <= Date.now() || data.origin !== origin || data.kind !== input.kind) return unavailable();
    const consumed = await store.setJSON(flowKey, { expires: 0 }, { onlyIfMatch: record.etag });
    if (!consumed.modified) return unavailable();

    const expected = { expectedChallenge: data.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true };
    if (register) {
      const result = await verifyRegistrationResponse({ ...expected, response: input.response }).catch(() => null);
      if (!result?.verified || !result.registrationInfo) return unavailable();
      const { id, publicKey, counter, transports } = result.registrationInfo.credential;
      const credential = { id, publicKey: Buffer.from(publicKey).toString('base64url'), counter, transports };
      const saved = await store.setJSON(credentialKey(id), { user: data.user, credential }, { onlyIfNew: true });
      if (!saved.modified) return unavailable();
      return json({ signedIn: true }, 200, await startSession(request, data.user));
    }

    const registered = await store.getWithMetadata(credentialKey(input.response.id), { type: 'json' });
    if (!registered) return unavailable();
    const { user, credential } = registered.data;
    const verified = await verifyAuthenticationResponse({
      ...expected, response: input.response,
      credential: { ...credential, publicKey: Buffer.from(credential.publicKey, 'base64url') },
    }).catch(() => null);
    if (!verified?.verified) return unavailable();
    if (credential.counter !== verified.authenticationInfo.newCounter) {
      const saved = await store.setJSON(credentialKey(credential.id), {
        user, credential: { ...credential, counter: verified.authenticationInfo.newCounter },
      }, { onlyIfMatch: registered.etag });
      if (!saved.modified) return unavailable();
    }
    return json({ signedIn: true }, 200, await startSession(request, user));
  } catch (error) {
    console.error('Member passkey request failed', error?.name);
    return json({ error: 'Passkey sign-in is temporarily unavailable.' }, 503);
  }
}
