import { globSync } from 'fast-glob';
import fs from 'fs';
import path from 'path';

const dynamicRouteSamples: Record<string, string[]> = {
  "/products/[id]": ["/products/demo-product"],
  "/users/[id]": ["/users/demo-user"],
  "/orders/[id]": ["/orders/demo-order"],
  "/app/projects/[projectId]": ["/app/projects/demo-project"],
  "/app/projects/[projectId]/pages/new": ["/app/projects/demo-project/pages/new"],
  "/app/studio/[pageId]": ["/app/studio/demo-page"]
};

const protectedPrefixes = [
  "/dashboard",
  "/admin",
  "/profile",
  "/settings",
  "/billing",
  "/account",
  "/app",
  "/studio",
  "/projects"
];

type GeneratedRoute = {
  path: string;
  source: string;
  requiresAuth: boolean;
  isDynamic: boolean;
};

function isProtected(routePath: string): boolean {
  return protectedPrefixes.some(prefix => routePath === prefix || routePath.startsWith(`${prefix}/`));
}

function generateRoutes() {
  const pages = globSync('src/app/**/page.{tsx,ts}', {
    ignore: [
      '**/api/**',
      '**/@*/**',
    ]
  });

  const routes: GeneratedRoute[] = [];

  for (const page of pages) {
    const segments = page.split(path.sep);
    if (segments.some(segment => segment.startsWith('@'))) {
      continue;
    }

    let routePath = page
      .replace('src/app', '')
      .replace(/\/page\.(tsx|ts)$/, '')
      .replace(/\/\([^)]+\)/g, ''); // remove route groups like /(admin)

    if (routePath === '') {
      routePath = '/';
    }
    
    // Normalize path just in case
    routePath = routePath.replace(/\/{2,}/g, '/');

    const isDynamic = /\[.*?\]/.test(routePath);
    let pathsToAdd = [routePath];

    if (isDynamic) {
      const samples = dynamicRouteSamples[routePath];
      if (!samples || samples.length === 0) {
        throw new Error(`Missing dynamic route sample for: ${routePath}\nAdd it to dynamicRouteSamples in tests/route-smoke/generate-routes.ts`);
      }
      pathsToAdd = samples;
    }

    for (const p of pathsToAdd) {
      routes.push({
        path: p,
        source: page,
        requiresAuth: isProtected(p),
        isDynamic
      });
    }
  }

  routes.sort((a, b) => a.path.localeCompare(b.path));

  const outDir = path.join(process.cwd(), 'tests', 'route-smoke');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outDir, 'routes.generated.json'),
    JSON.stringify(routes, null, 2)
  );
  
  console.log(`Generated ${routes.length} routes.`);
}

generateRoutes();
