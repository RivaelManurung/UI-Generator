import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!email || !password) {
    console.log('E2E_USER_EMAIL or E2E_USER_PASSWORD not set. Skipping auth setup and writing empty state.');
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  await page.goto('/login');

  const emailField = page.locator('input[name="email"], input[type="email"], input[id*="email"]').first();
  await expect(emailField).toBeVisible();
  await emailField.fill(email);

  const passwordField = page.locator('input[name="password"], input[type="password"], input[id*="password"]').first();
  await expect(passwordField).toBeVisible();
  await passwordField.fill(password);

  const submitButton = page.locator('button:has-text("Login"), button:has-text("Sign in"), button:has-text("Masuk"), button:has-text("Continue"), button[type="submit"]').first();
  await expect(submitButton).toBeVisible();
  await submitButton.click();

  await page.waitForURL(/.*(dashboard|admin|app|profile|projects)/);
  
  await page.context().storageState({ path: authFile });
});