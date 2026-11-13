import { getApiBaseUrl } from '@/config/api';

/** API error with a message that can be shown to the user as it is. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // HTTP status; 0 = the server could not be reached
  }
}

/**
 * GET a JSON resource from the Checkmate backend API.
 *
 * @param path path after the base URL, e.g. `/players/hikaru/profile`
 * @param params query parameters, e.g. `{ period: '7', timeClass: 'blitz' }`
 * @throws ApiError with a user-facing message when the request fails
 */
export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}${query}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ApiError('Cannot reach the Checkmate server. Make sure the backend is running.', 0);
  }

  if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);
  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  // Our API answers {"detail": "<message>"} for 404 / 502 / 503 (backend: exception_handlers.py)
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
      return body.detail;
    }
  } catch {
    // body is not JSON: fall through to a generic message
  }
  if (response.status === 429) return 'Too many requests. Wait a second and try again.';
  if (response.status === 422) return 'The request was not valid. Check the username and filters.';
  return `The server returned an error (${response.status}). Please try again.`;
}
