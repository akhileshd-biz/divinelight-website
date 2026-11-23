import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const liveUrl = process.env.MEMBERSHIP_TEST_URL;
const buildDir = resolve('_site');
const demoPath = '/members?demo=1&view=library';
const contentTypes = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml' };
let server;
let browser;

if (!liveUrl) {
  const config = await readFile('netlify.toml', 'utf8');
  const demoRedirect = /\[\[redirects\]\]\s+from = "\/membership-test"\s+to = "([^"]+)"\s+status = 302/.exec(config);
  assert.equal(demoRedirect?.[1], demoPath);
  server = createServer(async (request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    if (pathname === '/membership-test') {
      response.writeHead(302, { Location: demoRedirect[1] }).end();
      return;
    }
    const route = pathname === '/' ? '/index.html' : pathname.includes('.') ? pathname : pathname + '.html';
    const file = resolve(buildDir, '.' + route);
    if (!file.startsWith(buildDir + sep)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const content = await readFile(file);
      response.writeHead(200, { 'Content-Type': contentTypes[file.split('.').at(-1)] || 'application/octet-stream' }).end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
}

const origin = liveUrl ? new URL(liveUrl).origin : `http://127.0.0.1:${server.address().port}`;

try {
  if (liveUrl) {
    const auth = await fetch(origin + '/api/member-auth');
    assert.equal(auth.status, 200);
    assert.equal((await auth.json()).signedIn, false);
    const membership = await fetch(origin + '/api/membership');
    assert.equal(membership.status, 401);
  }

  browser = await chromium.launch({
    executablePath: process.env.MEMBERSHIP_CHROMIUM_PATH,
  });
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const apiCalls = [];
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) apiCalls.push(url.pathname);
      return url.origin === origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
    });
    page.setDefaultTimeout(10000);

    assert.equal((await page.goto(origin))?.status(), 200);
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await Promise.all([
      page.waitForRequest(origin + '/api/member-auth'),
      nav.getByRole('link', { name: 'Membership', exact: true }).click(),
    ]);
    await page.waitForURL(origin + '/members');
    await page.getByRole('heading', { name: 'Member library', exact: true }).waitFor();

    apiCalls.length = 0;
    await page.goto(origin + '/membership-test');
    await page.waitForURL(origin + demoPath);
    await page.getByRole('heading', { name: 'Your member library' }).waitFor();
    await page.getByRole('button', { name: 'Start first lesson' }).press('Enter');
    await page.getByRole('button', { name: 'Mark complete', exact: true }).click();
    await page.getByRole('button', { name: 'Mark incomplete', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Your library' }).click();
    await page.getByText('1 of 2 lessons complete', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Join membership' }).isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Buy the library' }).isVisible(), false);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('button', { name: 'Sign in to demo' }).click();
    await page.getByText('1 of 2 lessons complete', { exact: true }).waitFor();

    assert.deepEqual(apiCalls, [], 'The demo must avoid every membership API call');
    await page.close();
    console.log(`Membership navigation, signed-in demo, lesson progress, and sign-out passed at ${width}px.`);
  }
} finally {
  await browser?.close();
  server?.close();
}
