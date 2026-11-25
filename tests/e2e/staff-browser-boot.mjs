#!/usr/bin/env node
/*
 * Read-only production browser smoke test for Staff OS V5.
 * Chromium and WebKit (Safari engine) run at a mobile viewport.
 * No credentials are entered and no authenticated actions are performed.
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const site = (process.env.GC_SITE_URL || 'https://globall-cloud.pages.dev').replace(/\/$/, '');
const packageRoot = process.env.PLAYWRIGHT_PACKAGE;
if (!packageRoot) throw new Error('PLAYWRIGHT_PACKAGE is required');
const { chromium, webkit } = await import(pathToFileURL(resolve(packageRoot, 'index.mjs')).href);

const engines = [
  { name: 'Chromium', type: chromium },
  { name: 'WebKit (Safari engine)', type: webkit },
];
const targets = [
  { label: 'canonical Staff OS V5', path: '/staff-os-v5.html' },
  { label: 'short Staff entry alias', path: '/staff' },
];
const failures = [];

for (const engine of engines) {
  const browser = await engine.type.launch({
    headless: true,
    args: engine.name === 'Chromium' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
  });
  try {
    for (const target of targets) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      const failedResponses = [];

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500));
      });
      page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error).slice(0, 1000)));
      page.on('requestfailed', (request) => {
        const url = request.url();
        if (/staff-os|supabase-js|supabase\.co/i.test(url)) {
          failedRequests.push({ url, error: request.failure()?.errorText || 'request failed' });
        }
      });
      page.on('response', (response) => {
        const url = response.url();
        if (/staff-os-entry-loader|staff-os-v5-20261017|supabase-js/i.test(url) && response.status() >= 400) {
          failedResponses.push({ url, status: response.status() });
        }
      });

      let navigationError = '';
      try {
        await page.goto(site + target.path + '?browser-smoke=20261125', {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
        await page.waitForFunction(() => {
          const root = document.querySelector('#app');
          if (!root) return false;
          return Boolean(
            root.querySelector('.login input#loginEmail') ||
            root.querySelector('.gc-shell') ||
            root.querySelector('.gc-entry-actions') ||
            root.querySelector('.gc-entry-detail')
          );
        }, undefined, { timeout: 55000 });
        await page.waitForTimeout(800);
      } catch (error) {
        navigationError = String(error?.message || error).slice(0, 800);
      }

      const state = await page.evaluate(() => {
        const root = document.querySelector('#app');
        const login = root?.querySelector('.login');
        const dashboard = root?.querySelector('.gc-shell');
        const recovery = root?.querySelector('.gc-entry-actions');
        const errorDetail = root?.querySelector('.gc-entry-detail');
        const email = root?.querySelector('#loginEmail');
        const password = root?.querySelector('#loginPassword');
        const resources = performance.getEntriesByType('resource').map((item) => item.name);
        return {
          title: document.title,
          url: location.href,
          loginVisible: Boolean(login && email && password && email.getBoundingClientRect().height > 0),
          dashboardVisible: Boolean(dashboard && dashboard.getBoundingClientRect().height > 0),
          recoveryVisible: Boolean(recovery),
          recoveryDetail: errorDetail?.textContent || '',
          supabaseAvailable: Boolean(window.supabase && typeof window.supabase.createClient === 'function'),
          qrCodeAvailable: Boolean(window.QRCode && typeof window.QRCode.toCanvas === 'function'),
          barcodeAvailable: typeof window.JsBarcode === 'function',
          entryLoaderRequested: resources.some((url) => url.includes('staff-os-entry-loader-20261124.js')),
          controllerRequested: resources.some((url) => url.includes('staff-os-v5-20261017.js')),
          qrCodeRequested: resources.some((url) => url.includes('qrcode@1.5.1/build/qrcode.min.js')),
          appText: (root?.innerText || '').slice(0, 700),
        };
      });

      const success = (state.loginVisible || state.dashboardVisible) && state.supabaseAvailable && state.qrCodeAvailable && state.barcodeAvailable;
      console.log(JSON.stringify({
        engine: engine.name,
        target: target.label,
        success,
        state,
        navigationError,
        consoleErrors,
        pageErrors,
        failedRequests,
        failedResponses,
      }, null, 2));

      if (!success) {
        failures.push({
          engine: engine.name,
          target: target.label,
          state,
          navigationError,
          consoleErrors,
          pageErrors,
          failedRequests,
          failedResponses,
        });
        try {
          await page.screenshot({
            path: `staff-browser-failure-${engine.name.replace(/[^a-z0-9]+/gi, '-')}-${target.label.replace(/[^a-z0-9]+/gi, '-')}.png`,
            fullPage: true,
          });
        } catch {}
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

if (failures.length) {
  console.error(`Staff OS browser boot failed on ${failures.length} engine/route combination(s).`);
  process.exit(1);
}
console.log('PASS Staff OS V5 browser boot, Supabase SDK, QRCode and Barcode libraries in Chromium and WebKit.');
