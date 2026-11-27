import { act, screen } from '@testing-library/react';
import type { Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Keep the roots main.tsx creates, to unmount the app after each test.
const roots = vi.hoisted(() => [] as Root[]);
vi.mock('react-dom/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom/client')>();
  return {
    ...actual,
    createRoot: (element: Element) => {
      const root = actual.createRoot(element);
      roots.push(root);
      return root;
    },
  };
});

afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
  document.body.innerHTML = '';
  vi.resetModules();
});

describe('app start (main.tsx)', () => {
  it('mounts the app into #root with the search first', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import('@/main');

    expect(
      await screen.findByRole('combobox', undefined, { timeout: 15_000 }),
    ).toBeInTheDocument();
  }, 30_000);

  it('fails loudly when the page has no #root', async () => {
    await expect(import('@/main')).rejects.toThrow('Root element not found');
  });
});
