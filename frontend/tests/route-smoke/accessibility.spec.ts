import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readGeneratedRoutes } from './route-utils';

const routes = readGeneratedRoutes();

for (const route of routes) {
  test.describe(`Accessibility: ${route.path}`, () => {
    
    if (route.requiresAuth) {
      test.use({ storageState: 'tests/.auth/user.json' });
    } else {
      test.use({ storageState: { cookies: [], origins: [] } });
    }

    test(`should not have any automatically detectable serious accessibility issues`, async ({ page }) => {
      await page.goto(route.path);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('body')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const violations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      const formattedViolations = violations.map(v => {
        return `\n- Rule: ${v.id} (${v.impact})\n  Description: ${v.description}\n  Nodes:\n    ${v.nodes.map(n => n.target.join(', ')).join('\n    ')}`;
      }).join('\n');

      expect(violations.length, `Accessibility violations on ${route.path}:${formattedViolations}`).toBe(0);
    });
  });
}
