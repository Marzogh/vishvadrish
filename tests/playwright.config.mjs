import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = process.env.VISHVADRISH_TEST_OUTPUT;
if (!output) throw new Error('Set VISHVADRISH_TEST_OUTPUT to an external directory for browser evidence.');
export default defineConfig({
  testDir: './browser', outputDir: resolve(output), workers: 1,
  reporter: [['list']], timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/serve.mjs', cwd: fileURLToPath(new URL('../', import.meta.url)), url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
