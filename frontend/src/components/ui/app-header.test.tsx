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
  it('contains only the Search control in mock mode', () => {
    expect(navLinks('/')).toEqual(['Search /']);
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('DEMO')).not.toBeInTheDocument();
  });

  it('contains only the Search control in live mode', () => {
    vi.stubEnv('VITE_API_MODE', 'live');

    expect(navLinks('/')).toEqual(['Search /']);
  });

  it('still shows only Search once a player is selected', () => {
    vi.stubEnv('VITE_API_MODE', 'live');

    expect(navLinks('/players/magnuscarlsen')).toEqual(['Search /']);
    expect(screen.getByRole('link', { name: 'Search' })).not.toHaveAttribute('aria-current');
  });
});
