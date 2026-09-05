// Visual smoke tool: node scripts/screenshot.mjs <baseUrl> <outDir> [paths...] [--widths=1440,390] [--full]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const positional = args.filter((a) => !a.startsWith('--'));
const base = positional[0] ?? 'http://127.0.0.1:3000';
const out = positional[1] ?? 'screenshots';
const paths = positional.slice(2).length ? positional.slice(2) : ['/mn'];
const widths = (flags.widths ?? '1440,1280,1024,768,430,390,375').split(',').map(Number);
const full = 'full' in flags;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
for (const width of widths) {
  const bypass = flags['bypass-file'] ? (await import('node:fs')).readFileSync(flags['bypass-file'], 'utf8').trim() : process.env.VERCEL_BYPASS;
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768, extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass } : {} });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${width}] ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => errors.push(`[${width}] pageerror ${e.message.slice(0, 300)}`));
  for (const path of paths) {
    const url = `${base}${path}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1200);
      const name = `${path.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}-${width}.png`;
      if ('tiles' in flags) {
        const height = width < 768 ? 844 : 900;
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        const max = Number(flags.tiles) || 12;
        for (let i = 0, y = 0; y < total && i < max; i++, y += height) {
          await page.evaluate((top) => window.scrollTo(0, top), y);
          await page.waitForTimeout(500);
          await page.screenshot({ path: join(out, name.replace('.png', `-${String(i).padStart(2, '0')}.png`)) });
        }
        await page.evaluate(() => window.scrollTo(0, 0));
      } else {
        await page.screenshot({ path: join(out, name), fullPage: full });
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      console.log(`${name} ${overflow > 0 ? `HORIZONTAL OVERFLOW ${overflow}px` : 'ok'}`);
    } catch (e) {
      console.log(`FAILED ${url} @${width}: ${e.message.slice(0, 200)}`);
    }
  }
  await context.close();
}
await browser.close();
if (errors.length) {
  console.log('\nConsole errors:');
  for (const e of [...new Set(errors)]) console.log(' ', e);
}
