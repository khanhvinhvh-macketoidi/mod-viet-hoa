import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredEnv = ['APP_URL', 'AUTH_SECRET'];
const missing = requiredEnv.filter((name) => !process.env[name]?.trim());
const failures = [];

if (missing.length) failures.push(`Thiếu biến môi trường: ${missing.join(', ')}`);
if ((process.env.AUTH_SECRET?.length ?? 0) < 32) failures.push('AUTH_SECRET phải dài ít nhất 32 ký tự.');
if (process.env.APP_URL && process.env.APP_URL !== 'https://modviethoa.vn') failures.push('APP_URL phải là https://modviethoa.vn');

for (const relative of ['data', 'public/uploads', 'storage/uploads']) {
  const target = path.join(root, relative);
  fs.mkdirSync(target, { recursive: true });
  try {
    const probe = path.join(target, `.write-test-${process.pid}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
  } catch {
    failures.push(`Không có quyền ghi: ${relative}`);
  }
}

for (const relative of ['package.json', 'next.config.ts', 'src/app/robots.ts', 'src/app/sitemap.ts']) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Thiếu file: ${relative}`);
}

if (failures.length) {
  console.error(`\nProduction preflight thất bại:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Production preflight: OK');
