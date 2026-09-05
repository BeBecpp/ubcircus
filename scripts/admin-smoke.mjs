// Backstage smoke test: node scripts/admin-smoke.mjs <baseUrl> <outDir> [--login=dev|none]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [base = 'http://127.0.0.1:3000', out = 'screenshots-admin'] = args.filter((a) => !a.startsWith('--'));
mkdirSync(out, { recursive: true });
const pages = ['/admin', '/admin/events', '/admin/events/new', '/admin/calendar', '/admin/categories', '/admin/stories', '/admin/pages', '/admin/media', '/admin/galleries', '/admin/videos', '/admin/homepage', '/admin/navigation', '/admin/visit', '/admin/seo', '/admin/users', '/admin/roles', '/admin/messages', '/admin/settings'];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.url()} :: ${m.text().slice(0, 240)}`); });
page.on('pageerror', (e) => errors.push(`${page.url()} :: pageerror ${e.message.slice(0, 240)}`));

// unauthenticated → login redirect
await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
console.log('unauthenticated /admin →', page.url().includes('/admin/login') ? 'redirected to login ✓' : `NOT redirected (${page.url()})`);
await page.screenshot({ path: join(out, 'login.png') });

if ((flags.login ?? 'dev') === 'dev') {
  const res = await page.request.post(`${base}/api/admin-auth`, { data: { action: 'dev-login' } });
  console.log('dev-login', res.status());
  for (const path of pages) {
    const started = Date.now();
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 90000 });
    const title = await page.locator('h1').first().textContent().catch(() => '');
    const failed = await page.locator('.empty').count();
    await page.screenshot({ path: join(out, `${path.replace(/[^a-z0-9]+/gi, '_').replace(/^_/, '')}.png`) });
    console.log(`${path.padEnd(22)} ${String(Date.now() - started).padStart(5)}ms  h1="${(title ?? '').trim().slice(0, 40)}"  ${failed ? `empty-states:${failed}` : ''}`);
  }
  // functional: edit + save an event through the proxy
  await page.goto(`${base}/admin/events`, { waitUntil: 'networkidle' });
  const firstEdit = page.locator('table a.btn').first();
  await firstEdit.click();
  await page.waitForURL(/\/admin\/events\//);
  await page.getByRole('tab', { name: /schedule/i }).click();
  const sessionsBefore = await page.locator('.repeater-row').count();
  await page.getByRole('button', { name: /add session/i }).click();
  await page.locator('.repeater-row').last().locator('input[type=datetime-local]').first().fill('2026-12-24T19:00');
  const [put] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/admin/events/') && r.request().method() === 'PUT', { timeout: 30000 }), page.locator('.bs-actions button', { hasText: /^Save$/ }).click()]);
  await page.waitForTimeout(800);
  const toast = await page.locator('.toast').first().textContent().catch(() => '');
  console.log(`event save: PUT ${put.status()} · ${sessionsBefore} → ${sessionsBefore + 1} sessions · toast="${(toast ?? '').trim()}"`);
  await page.screenshot({ path: join(out, 'event-editor-schedule.png') });
  // remove the session again to leave data clean
  await page.locator('.repeater-row').last().locator('button[aria-label="Remove session"]').click();
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/admin/events/') && r.request().method() === 'PUT'), page.locator('.bs-actions button', { hasText: /^Save$/ }).click()]);
  // sign out
  await page.request.post(`${base}/api/admin-auth`, { data: { action: 'logout' } });
  await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
  console.log('after logout /admin →', page.url().includes('/admin/login') ? 'login ✓' : page.url());
}
await browser.close();
if (errors.length) {
  console.log('\nConsole errors:');
  for (const e of [...new Set(errors)]) console.log(' ', e);
}
