import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppHeader } from '@/components/ui/app-header';

/** Renders the header on a route and returns its navigation links as "label href". */
function navLinks(route: string): string[] {
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={<AppHeader />} />
        <Route path="/players/:username/*" element={<AppHeader />} />
      </Routes>
    </MemoryRouter>,
  );
  const nav = screen.getByRole('navigation', { name: 'Main navigation' });
  return within(nav)
    .getAllByRole('link')
    .map((link) => `${link.textContent} ${link.getAttribute('href')}`);
}

describe('app-header', () => {
  it('links to the demo player in mock mode', () => {
    expect(navLinks('/')).toEqual([
      'Search /',
      'Statistics /players/hikaru/summary',
      'Overall /players/hikaru/overall',
      'Profile /players/hikaru',
    ]);
    expect(screen.getByText('DEMO')).toBeInTheDocument();
  });

  it('shows only Search before a player is chosen in live mode', () => {
    vi.stubEnv('VITE_API_MODE', 'live');

    expect(navLinks('/')).toEqual(['Search /']);
    expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
  });

  it('links to the searched player, without Overall, in live mode', () => {
    vi.stubEnv('VITE_API_MODE', 'live');

    expect(navLinks('/players/magnuscarlsen/summary')).toEqual([
      'Search /',
      'Statistics /players/magnuscarlsen/summary',
      'Profile /players/magnuscarlsen',
    ]);
  });
});
