import { AlertCircle, RotateCcw } from 'lucide-react';

export function PageLoading({ label = 'Loading statistics…' }: { label?: string }) {
  return (
    <div className="status-screen" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="status-screen status-error" role="alert">
      <AlertCircle aria-hidden="true" />
      <p>{message}</p>
      <button className="button button-dark" onClick={onRetry} type="button">
        <RotateCcw size={17} /> Retry
      </button>
    </div>
  );
}
