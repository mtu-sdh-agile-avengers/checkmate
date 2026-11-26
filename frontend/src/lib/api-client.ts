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
  return request<T>(`${path}${query}`, { headers: { Accept: 'application/json' } });
}

/**
 * POST a JSON body to the Checkmate backend API and read the JSON response.
 *
 * @param path path after the base URL, e.g. `/computer/move`
 * @throws ApiError with a user-facing message when the request fails
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, init);
  } catch {
    throw new ApiError('Cannot reach the Checkmate server. Make sure the backend is running.', 0);
  }

  if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);
  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  // Our API answers {"detail": "<message>"} for 404 / 502 / 503 (backend: exception_handlers.py)
  // and {"detail": [{"msg": "<message>", ...}]} for invalid parameters (422).
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'detail' in body) {
      if (typeof body.detail === 'string') return body.detail;
      const firstMessage = validationMessage(body.detail);
      if (firstMessage) return firstMessage;
    }
  } catch {
    // body is not JSON: fall through to a generic message
  }
  if (response.status === 429) return 'Too many requests. Wait a second and try again.';
  if (response.status === 422) return 'The request was not valid. Check the username and filters.';
  return `The server returned an error (${response.status}). Please try again.`;
}

/** First message of a FastAPI validation error list, e.g. "Please use a Chess.com link. ..." */
function validationMessage(detail: unknown): string | null {
  if (!Array.isArray(detail)) return null;
  const first: unknown = detail[0];
  if (first && typeof first === 'object' && 'msg' in first && typeof first.msg === 'string') {
    return first.msg;
  }
  return null;
}
