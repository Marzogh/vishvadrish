import base from './playwright.config.mjs';
export default { ...base, testMatch: '**/compat.spec.mjs', timeout: 60000, projects: ['chromium','firefox','webkit'].map(browserName => ({ name: browserName, use: { browserName } })), webServer: { ...base.webServer, reuseExistingServer: true } };
