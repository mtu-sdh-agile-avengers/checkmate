import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimatedNumber } from '@/components/ui/animated-number';

afterEach(() => { vi.useRealTimers(); });
const stubMotion = (reduced: boolean) => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced })));

describe('animated-number', () => {
  it('shows the value straight away where nothing can animate', () => {
    render(<AnimatedNumber value={1240} />);
    expect(screen.getByText('1,240')).toBeInTheDocument();
  });

  it('shows the value straight away for reduced motion', () => {
    stubMotion(true);
    render(<AnimatedNumber value={55} format={(value) => `${value}%`} />);
    expect(screen.getByText('55%')).toBeInTheDocument();
  });

  it('counts up from zero, then from the old value to a new one', () => {
    vi.useFakeTimers();
    stubMotion(false);
    const { rerender } = render(<AnimatedNumber value={1240} duration={1000} />);
    expect(screen.getByText('0')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(400); });
    const midway = Number(document.querySelector('.animated-number')?.textContent?.replace(',', ''));
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1240);

    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByText('1,240')).toBeInTheDocument();

    rerender(<AnimatedNumber value={1300} duration={1000} />);
    act(() => { vi.advanceTimersByTime(300); });
    const between = Number(document.querySelector('.animated-number')?.textContent?.replace(',', ''));
    expect(between).toBeGreaterThan(1240);
    act(() => { vi.advanceTimersByTime(800); });
    expect(screen.getByText('1,300')).toBeInTheDocument();
  });
});
