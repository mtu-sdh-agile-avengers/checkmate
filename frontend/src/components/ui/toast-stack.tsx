import type { Toast } from '@/hooks/use-toasts';
import './toast-stack.css';

/**
 * The notifications of a view (use-toasts.ts), stacked at the top of the screen, newest at
 * the bottom. Non-blocking: they take no clicks and never focus; the list is a polite live
 * region, so each new one is read out once. `leaving` fades them with the view.
 */
export function ToastStack({ toasts, label = 'Notifications', leaving = false }: {
  toasts: readonly Toast[];
  label?: string;
  leaving?: boolean;
}) {
  return (
    <div className="toast-stack" aria-label={label} aria-live="polite" aria-atomic="false" role="log" data-leaving={leaving || undefined}>
      {toasts.map((toast) => (
        <p key={toast.id} className="toast" data-tone={toast.tone} data-closing={toast.closing || undefined}>
          {toast.message}
        </p>
      ))}
    </div>
  );
}
