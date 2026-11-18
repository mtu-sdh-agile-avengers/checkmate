import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DifficultyPanel } from '@/features/play-computer/components/difficulty-panel';
import { DEFAULT_DIFFICULTY, type DifficultyId } from '@/features/play-computer/config/difficulty-levels';

function Panel({ disabled = [], onStart = vi.fn(), onBack = vi.fn() }: {
  disabled?: DifficultyId[];
  onStart?: () => void;
  onBack?: () => void;
}) {
  const [value, setValue] = useState<DifficultyId>(DEFAULT_DIFFICULTY);
  return <DifficultyPanel value={value} onChange={setValue} onStart={onStart} onBack={onBack} disabled={disabled} />;
}

describe('difficulty panel', () => {
  it('lists four levels with Intermediate selected and marked as the default', () => {
    render(<Panel />);
    const group = screen.getByRole('radiogroup', { name: 'Difficulty' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    const intermediate = screen.getByRole('radio', { name: /intermediate/i });
    expect(intermediate).toHaveAttribute('aria-checked', 'true');
    expect(intermediate).toHaveAccessibleName('Intermediate Default');
    expect(intermediate).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Beginner' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText(/^Selected:/)).toHaveTextContent('Selected: Intermediate');
  });

  it('moves the selection with the arrow keys, Home and End, and by clicking', async () => {
    const user = userEvent.setup();
    render(<Panel />);
    await user.click(screen.getByRole('radio', { name: 'Beginner' }));
    expect(screen.getByRole('radio', { name: 'Beginner' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/^Selected:/)).toHaveTextContent('Beginner');

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: /intermediate/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /intermediate/i })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Expert' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Beginner' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: 'Expert' })).toHaveAttribute('aria-checked', 'true');
  });

  it('skips and refuses a disabled level', async () => {
    const user = userEvent.setup();
    render(<Panel disabled={['advanced']} />);
    const advanced = screen.getByRole('radio', { name: 'Advanced' });
    expect(advanced).toHaveAttribute('aria-disabled', 'true');
    await user.click(advanced);
    expect(advanced).toHaveAttribute('aria-checked', 'false');
    screen.getByRole('radio', { name: /intermediate/i }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Expert' })).toHaveAttribute('aria-checked', 'true');
  });

  it('starts the game or goes back', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onBack = vi.fn();
    render(<Panel onStart={onStart} onBack={onBack} />);
    await user.click(screen.getByRole('button', { name: 'Start game' }));
    expect(onStart).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
