import { test, expect } from '@playwright/test';
import { readGeneratedRoutes } from './route-utils';

const routes = readGeneratedRoutes();

const MAX_LINKS_PER_PAGE = 50;

for (const route of routes) {
  test.describe(`Link check: ${route.path}`, () => {
    
    if (route.requiresAuth) {
      test.use({ storageState: 'tests/.auth/user.json' });
    } else {
      test.use({ storageState: { cookies: [], origins: [] } });
    }

    test(`should not have broken internal links`, async ({ page, request }) => {
      await page.goto(route.path);
      
      const hrefs = await page.locator('a[href]').evaluateAll((anchors) =>
        anchors
          .map(anchor => anchor.getAttribute('href'))
          .filter((href): href is string => Boolean(href))
      );

      // Filter for internal links
      const internalLinks = [...new Set(hrefs.filter(href => {
        if (!href.startsWith('/')) return false;
        if (href.startsWith('//')) return false;
        
        const lower = href.toLowerCase();
        if (lower.includes('logout') || lower.includes('sign-out')) return false;
        
        return true;
      }))].slice(0, MAX_LINKS_PER_PAGE);

      for (const link of internalLinks) {
        const response = await request.get(link);
        expect(response.status(), `Broken link found: ${link} on page ${route.path}`).toBeLessThan(400);
      }
    });
  });
}
