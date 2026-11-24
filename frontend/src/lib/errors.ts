/**
 * Invalid input the visitor can fix, e.g. a malformed username, found before any request.
 * Its message is shown as it is, and React Query never retries it (see query-client.ts).
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
