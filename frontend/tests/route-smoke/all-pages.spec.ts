import { test, expect } from '@playwright/test';

import { attachPageHealthListeners, readGeneratedRoutes } from './route-utils';

const routes = readGeneratedRoutes();

for (const route of routes) {
  test.describe(`Smoke test: ${route.path}`, () => {
    
    if (route.requiresAuth) {
      test.use({ storageState: 'tests/.auth/user.json' });
    } else {
      test.use({ storageState: { cookies: [], origins: [] } }); // reset state for public routes
    }

    test(`should render without errors`, async ({ page }) => {
      const { errors, failedRequests, badResponses } = attachPageHealthListeners(page);

      const response = await page.goto(route.path);
      
      expect(response, `Response should not be null for ${route.path}`).not.toBeNull();
      
      const status = response?.status() || 500;
      expect(status, `Status code should be < 400 for ${route.path}`).toBeLessThan(400);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length, `Body text length should be > 20 chars for ${route.path}`).toBeGreaterThan(20);

      const forbiddenPatterns = [
        /\b404\s+not\s+found\b/i,
        /\b500\s+internal\s+server\s+error\b/i,
        /\binternal\s+server\s+error\b/i,
        /\bapplication\s+error\b/i,
        /\bsomething\s+went\s+wrong\b/i,
        /\bthis\s+page\s+could\s+not\s+be\s+found\b/i
      ];
      
      for (const pattern of forbiddenPatterns) {
        expect(bodyText, `Page should not contain error text matching ${pattern}`).not.toMatch(pattern);
      }

      // Assert no errors or failed requests
      expect(errors, `Console or page errors detected on ${route.path}: \n${errors.join('\n')}`).toHaveLength(0);
      expect(failedRequests, `Failed local requests on ${route.path}: \n${failedRequests.join('\n')}`).toHaveLength(0);
      expect(badResponses, `Failed critical responses on ${route.path}: \n${badResponses.join('\n')}`).toHaveLength(0);
    });
  });
}
