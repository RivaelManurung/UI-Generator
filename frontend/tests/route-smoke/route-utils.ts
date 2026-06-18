import fs from 'fs';
import path from 'path';
import type { Page, Request, Response } from '@playwright/test';

export type GeneratedRoute = {
  path: string;
  source: string;
  requiresAuth: boolean;
  isDynamic: boolean;
};

const routesPath = path.join(__dirname, 'routes.generated.json');

export function readGeneratedRoutes(): GeneratedRoute[] {
  return JSON.parse(fs.readFileSync(routesPath, 'utf-8')) as GeneratedRoute[];
}

export function shouldIgnoreResource(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return (
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.jpeg') ||
      pathname.endsWith('.webp') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.ico')
    );
  } catch {
    return false;
  }
}

export function isLocalUrl(url: string): boolean {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL;
  return url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost') || (!!baseURL && url.startsWith(baseURL));
}

export function attachPageHealthListeners(page: Page) {
  const errors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on('console', msg => {
    if (msg.type() !== 'error') return;

    const text = msg.text();
    if (text.includes('Failed to load resource')) return;
    if (text.includes('/_next/webpack-hmr')) return;

    errors.push(text);
  });

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  page.on('requestfailed', (request: Request) => {
    const url = request.url();
    if (!isLocalUrl(url) || shouldIgnoreResource(url)) return;

    failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText ?? 'request failed'}`);
  });

  page.on('response', (response: Response) => {
    const url = response.url();
    if (!isLocalUrl(url) || shouldIgnoreResource(url)) return;
    if (response.status() < 400) return;

    badResponses.push(`${response.status()} ${response.request().method()} ${url}`);
  });

  return { errors, failedRequests, badResponses };
}
