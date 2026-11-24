import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { ValidationError } from '@/lib/errors';
import { shouldRetry } from '@/lib/query-client';

describe('query-client retry policy', () => {
  it('never retries invalid input found before the request', () => {
    expect(shouldRetry(0, new ValidationError('Player 2: Check the username.'))).toBe(false);
  });

  it('does not retry client errors, except the rate limit', () => {
    expect(shouldRetry(0, new ApiError('Not found', 404))).toBe(false);
    expect(shouldRetry(0, new ApiError('Invalid', 422))).toBe(false);
    expect(shouldRetry(0, new ApiError('Too many requests', 429))).toBe(true);
  });

  it('retries server and network errors once', () => {
    expect(shouldRetry(0, new ApiError('Chess.com is not available', 503))).toBe(true);
    expect(shouldRetry(0, new ApiError('Cannot reach the server', 0))).toBe(true);
    expect(shouldRetry(1, new ApiError('Chess.com is not available', 503))).toBe(false);
  });
});
