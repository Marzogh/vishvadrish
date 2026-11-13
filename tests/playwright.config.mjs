import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = process.env.VISHVADRISH_TEST_OUTPUT;
const port = Number(process.env.VISHVADRISH_TEST_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;
if (!output) throw new Error('Set VISHVADRISH_TEST_OUTPUT to an external directory for browser evidence.');
export default defineConfig({
  testDir: './browser', outputDir: resolve(output), workers: 1,
  reporter: [['list']], timeout: 30000,
  use: { baseURL, browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', cwd: fileURLToPath(new URL('../', import.meta.url)), url: baseURL, env: { PORT: String(port) }, reuseExistingServer: process.env.VISHVADRISH_REUSE_PREVIEW === '1' },
});
