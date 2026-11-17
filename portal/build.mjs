import { copyFile, cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { build } from 'esbuild';

const destination = 'site-deploy';
await rm(destination, { recursive: true, force: true });
await mkdir(destination);
for (const file of await readdir('.')) {
  if (/\.(html|ico|png)$/.test(file) || ['robots.txt', 'sitemap.xml'].includes(file)) {
    await copyFile(file, `${destination}/${file}`);
  }
}
await cp('assets', `${destination}/assets`, { recursive: true });
if (await stat('media').then(item => item.isDirectory(), () => false)) {
  await cp('media', `${destination}/media`, { recursive: true });
}
await build({
  entryPoints: ['portal/members.js'],
  outfile: `${destination}/assets/members.js`,
  bundle: true,
  platform: 'browser',
  target: 'es2022',
});
