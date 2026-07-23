const base = (process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const routes = ['/', '/mods', '/discover', '/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/api/health'];
let failed = false;
for (const route of routes) {
  try {
    const response = await fetch(`${base}${route}`, { redirect: 'manual' });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? '✓' : '✗'} ${response.status} ${route}`);
    failed ||= !ok;
  } catch (error) {
    failed = true;
    console.error(`✗ ${route}: ${error instanceof Error ? error.message : error}`);
  }
}
process.exit(failed ? 1 : 0);
