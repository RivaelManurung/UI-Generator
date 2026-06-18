# QA Testing System

## 1. What this QA system checks
This system uses Playwright to automatically test every page in the Next.js application to ensure there are no:
- 404 Not Found pages
- 500 / Internal Server Errors
- Blank pages
- Browser console errors or unhandled exceptions
- Failed local critical requests
- Broken internal links
- Serious/Critical Accessibility violations

It supports dynamic routes via configured samples and automatically handles protected (authenticated) routes.

## 2. How to install Playwright browsers
Run:
```bash
npx playwright install --with-deps
```

## 3. How to generate route manifest
```bash
npm run test:routes:generate
```
This detects all Next.js pages and outputs `tests/route-smoke/routes.generated.json`.

## 4. How to run all tests
```bash
npm run test:prod
```
This command builds the Next.js application, generates the routes, and runs all Playwright tests.

## 5. How to run only smoke tests
```bash
npm run test:routes
```

## 6. How to run only link checks
```bash
npm run test:links
```

## 7. How to run only accessibility checks
```bash
npm run test:a11y
```

## 8. How to run Playwright UI mode
```bash
npm run test:e2e:ui
```

## 9. How to add dynamic route samples
Open `tests/route-smoke/generate-routes.ts` and modify `dynamicRouteSamples`:
```typescript
const dynamicRouteSamples: Record<string, string[]> = {
  "/projects/[projectId]": ["/projects/demo"],
  "/studio/[pageId]": ["/studio/demo"]
};
```

## 10. How to configure protected route prefixes
Open `tests/route-smoke/generate-routes.ts` and modify `protectedPrefixes`:
```typescript
const protectedPrefixes = ["/dashboard", "/admin", "/profile"];
```

## 11. How to configure E2E credentials
Set the following environment variables locally or in your CI:
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

If omitted, protected routes will be skipped.

## 12. How to inspect HTML report
```bash
npx playwright show-report
```

## 13. How to inspect Playwright trace
Run UI mode or run:
```bash
npx playwright show-trace trace.zip
```

## 14. How to debug failing screenshots/videos
Failed tests automatically retain screenshots and videos. These can be found in the `test-results/` folder or viewed interactively in the HTML report.

## 15. Common failure meanings
- **404:** The page could not be found; likely a broken dynamic sample or removed route.
- **500:** A server-side exception occurred during page rendering.
- **blank body:** The page rendered without content, likely an unhandled runtime exception in React.
- **console error:** A JavaScript error was logged in the browser console.
- **failed request:** A local asset or API request made by the page failed.
- **missing dynamic route sample:** The generator found a `[param]` route but no sample was provided in the configuration.
- **auth setup failure:** The global setup failed to login, usually because the provided credentials don't work or the UI changed.

## 16. CI behavior
GitHub Actions runs the tests automatically on Pull Requests and pushes to `main`/`develop`. It will install dependencies, build the app, generate routes, run the tests, and save the reports as artifacts.

## 17. Rules for adding new pages
- Every new page must load without errors.
- If it's a dynamic route (e.g., `[id]`), add a sample to `generate-routes.ts`.
- If it requires authentication, ensure its path falls under `protectedPrefixes` or add it.