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
  const search = page.getByRole('combobox');
  await search.fill(name);
  await search.press('Enter');
}

test('the search page loads within the budget', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('combobox')).toBeVisible();

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

test('accounts are suggested while typing, and one opens with the keyboard', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  const search = page.getByRole('combobox');

  await search.fill('mag');
  const started = Date.now();
  const suggestion = page.getByRole('option', { name: /magnuscarlsen/ });
  await expect(suggestion).toBeVisible({ timeout: ANSWER_BUDGET_MS });
  measured('suggestions shown', Date.now() - started, 'ms', ANSWER_BUDGET_MS);

  await search.press('ArrowDown');
  await search.press('ArrowDown');
  await expect(suggestion).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Player magnuscarlsen' })).toBeVisible({
    timeout: ANSWER_BUDGET_MS,
  });
  expect(errors).toEqual([]);
});

test('a finished game is reviewed by the engine, move by move', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  // The last finished game, as the page keeps it: 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6?? 4. Qxf7#
  await page.evaluate(() =>
    localStorage.setItem(
      'checkmate:last-game',
      JSON.stringify({
        id: 'e2e',
        level: 'intermediate',
        moves: ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'],
        history: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
        result: { outcome: 'win', title: 'You Win', reason: 'by checkmate' },
      }),
    ),
  );

  await page.goto('/play/review');
  const panel = page.getByRole('complementary', { name: 'Game review' });
  await expect(panel.getByRole('button', { name: /Nf6 allowed a forced mate/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(panel.getByRole('button', { name: 'Nf6, Blunder' })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(
    page.getByRole('img', { name: 'Board: the starting position of the game reviewed' }),
  ).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('img', { name: 'Board: the position after move 1 e4' }),
  ).toBeVisible();
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
    await expect(page.getByRole('combobox')).toBeVisible();
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
