import { defineConfig, devices } from '@playwright/test';

const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const videoMode = process.env.PLAYWRIGHT_DISABLE_VIDEO ? 'off' : 'retain-on-failure';
const port = process.env.PORT || '3000';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: videoMode,
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      use: { channel: browserChannel },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: browserChannel },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], channel: browserChannel },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: `PORT=${port} npm run start`,
    url: baseURL,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_FORCE_WEBSERVER,
    timeout: 120 * 1000,
  },
});
