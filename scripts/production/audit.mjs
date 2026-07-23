import fs from 'node:fs';
import path from 'node:path';

const checks = [
  ['robots', 'src/app/robots.ts'],
  ['sitemap', 'src/app/sitemap.ts'],
  ['manifest', 'src/app/manifest.ts'],
  ['Open Graph', 'src/app/opengraph-image.tsx'],
  ['health route', 'src/app/api/health/route.ts'],
  ['Caddy config', 'deploy/windows/Caddyfile'],
];
let failed = false;
for (const [label, relative] of checks) {
  const exists = fs.existsSync(path.join(process.cwd(), relative));
  console.log(`${exists ? '✓' : '✗'} ${label}: ${relative}`);
  failed ||= !exists;
}
process.exit(failed ? 1 : 0);
