import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastStack } from '@/components/ui/toast-stack';

describe('toast stack', () => {
  it('reads out each notification politely, without taking focus', () => {
    const { rerender } = render(
      <ToastStack
        label="Game notifications"
        toasts={[
          { id: 1, message: 'Your king would be in check.', tone: 'info', closing: true },
          { id: 2, message: 'Check! Your king is in check.', tone: 'alert', closing: false },
        ]}
      />,
    );

    const stack = screen.getByRole('log', { name: 'Game notifications' });
    expect(stack).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Your king would be in check.')).toHaveAttribute('data-closing', 'true');
    expect(screen.getByText('Check! Your king is in check.')).toHaveAttribute('data-tone', 'alert');
    expect(stack).not.toHaveAttribute('data-leaving');

    rerender(<ToastStack toasts={[]} leaving />);
    expect(screen.getByRole('log', { name: 'Notifications' })).toHaveAttribute('data-leaving', 'true');
  });
});
