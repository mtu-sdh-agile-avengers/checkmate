import { expect, test, type Page } from '@playwright/test';

/** Non-functional requirements checked in a real browser (see playwright.config.ts). */
const LOAD_BUDGET_MS = 3_000; // the search page is usable within 3 s
const WEIGHT_BUDGET_KB = 700; // code and styles of the first page, uncompressed
const ANSWER_BUDGET_MS = 3_000; // a player's statistics or the computer's move
const HEAP_GROWTH_BUDGET_MB = 8; // JavaScript heap growth over 10 round trips

/** Puts a measured value in the test report (HTML and JUnit), next to its budget. */
function measured(name: string, value: number, unit: string, budget: number) {
  test.info().annotations.push({
    type: name,
    description: `${value.toFixed(1)} ${unit} (budget ${budget} ${unit})`,
  });
}

/** Errors of our own app: script errors, console errors and failed requests to our servers.
 *  Pictures from Chess.com (player avatars) are not ours: a blocked one is not a failure. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  const ours = (url: string) => new URL(url).hostname === '127.0.0.1';
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // the browser reports any failed download this way; ours are caught by the handlers below
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource'))
      errors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    if (ours(request.url())) errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on('response', (response) => {
    if (ours(response.url()) && response.status() >= 500)
      errors.push(`${response.url()}: ${response.status()}`);
  });
  return errors;
}

async function searchPlayer(page: Page, name: string) {
  const search = page.getByRole('searchbox');
  await search.fill(name);
  await search.press('Enter');
}

test('the search page loads within the budget', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('searchbox')).toBeVisible();

  const timing = await page.evaluate(() => {
    const [navigation] = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    return {
      domReady: navigation?.domContentLoadedEventEnd ?? 0,
      load: navigation?.loadEventEnd ?? 0,
    };
  });

  measured('page load', timing.load, 'ms', LOAD_BUDGET_MS);
  expect(timing.domReady).toBeLessThan(LOAD_BUDGET_MS);
  expect(timing.load).toBeLessThan(LOAD_BUDGET_MS);
  expect(errors).toEqual([]);
});

test('the first page downloads little code and styles', async ({ page }) => {
  let bytes = 0;
  page.on('response', async (response) => {
    if (/\.(js|css)$/.test(new URL(response.url()).pathname))
      bytes += (await response.body()).length;
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  measured('code and styles', bytes / 1024, 'KB', WEIGHT_BUDGET_KB);
  expect(bytes / 1024).toBeLessThan(WEIGHT_BUDGET_KB);
});

test("a player's statistics appear quickly after the search", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');

  const started = Date.now();
  await searchPlayer(page, 'hikaru');
  await expect(page.getByRole('heading', { level: 1, name: 'Player hikaru' })).toBeVisible({
    timeout: ANSWER_BUDGET_MS,
  });
  await expect(page.getByRole('heading', { name: 'Summary statistics' })).toBeVisible({
    timeout: ANSWER_BUDGET_MS,
  });

  measured('statistics shown', Date.now() - started, 'ms', ANSWER_BUDGET_MS);
  expect(Date.now() - started).toBeLessThan(ANSWER_BUDGET_MS);
  expect(errors).toEqual([]);
});

test('the computer answers a move quickly', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/play');
  await page.getByRole('radio', { name: /Intermediate/ }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByText('Your move.')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /^e2, white pawn/ }).click();
  const started = Date.now();
  await page.getByRole('button', { name: /^e4, move here/ }).click();
  await expect(page.getByText(/The computer played/)).toBeVisible({ timeout: ANSWER_BUDGET_MS });

  measured('computer move', Date.now() - started, 'ms', ANSWER_BUDGET_MS);
  expect(Date.now() - started).toBeLessThan(ANSWER_BUDGET_MS);
  expect(errors).toEqual([]);
});

test('moving between the views does not leak memory', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const heapMb = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = await cdp.send('Runtime.getHeapUsage');
    return usedSize / 1024 / 1024;
  };
  const roundTrip = async () => {
    await searchPlayer(page, 'hikaru');
    await expect(page.getByRole('heading', { level: 1, name: 'Player hikaru' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('searchbox')).toBeVisible();
    await page.waitForTimeout(1_100); // the search API allows one request a second
  };

  await page.goto('/');
  for (let i = 0; i < 3; i += 1) await roundTrip(); // warm up caches and lazy code
  const before = await heapMb();
  for (let i = 0; i < 10; i += 1) await roundTrip();
  const after = await heapMb();

  measured('heap growth', after - before, 'MB', HEAP_GROWTH_BUDGET_MB);
  expect(after - before).toBeLessThan(HEAP_GROWTH_BUDGET_MB);
});
