// Playwright configuration for the keepbreath.ing static site.
//
// The site is plain HTML with no build step, so the "server" is just Python's
// static file server pointed at site/. Tests mock the two API endpoints, so no
// backend is needed and no real mail is ever sent.

import { defineConfig, devices } from '@playwright/test';

const PORT = 8123;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: `python3 -m http.server ${PORT} --directory site --bind 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/contact.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
