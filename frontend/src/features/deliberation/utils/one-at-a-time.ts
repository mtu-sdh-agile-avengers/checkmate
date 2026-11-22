/**
 * Wraps an async call so calls run one after another, each starting at least `gapMs` after
 * the one before has finished. The player search allows one request a second, and
 * Deliberation can ask for both players at once (Confirm with two names typed). Counting from
 * the end rather than the start keeps the requests a full gap apart where the server counts
 * them, even when the first one was slow to get there (a cold connection, say).
 */
export function oneAtATime<A extends unknown[], T>(run: (...args: A) => Promise<T>, gapMs: number) {
  let lastEnd = Number.NEGATIVE_INFINITY;
  let queue: Promise<unknown> = Promise.resolve();
  return (...args: A): Promise<T> => {
    const next = queue.then(async () => {
      const wait = lastEnd + gapMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      try {
        return await run(...args);
      } finally {
        lastEnd = Date.now();
      }
    });
    queue = next.catch(() => undefined);
    return next;
  };
}
