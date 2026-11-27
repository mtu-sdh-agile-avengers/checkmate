import { describe, expect, it, vi } from 'vitest';
import { loadRecentPlayers, MAX_RECENT_PLAYERS, RECENT_PLAYERS_KEY, rememberPlayer } from '@/features/player-search/utils/recent-players';
import { suggestionOptions } from '@/features/player-search/utils/suggestion-options';

const player = (username: string) => ({ username, title: null, avatar: null });

describe('players looked up before', () => {
  it('keeps the last few, most recent first, each once, by its lowercase name', () => {
    for (const name of ['a1', 'b2', 'c3', 'd4', 'e5', 'f6']) rememberPlayer(player(name));
    rememberPlayer({ username: 'C3', title: 'GM', avatar: null });

    const recent = loadRecentPlayers();
    expect(recent).toHaveLength(MAX_RECENT_PLAYERS);
    expect(recent.map((entry) => entry.username)).toEqual(['c3', 'f6', 'e5', 'd4', 'b2']);
    expect(recent[0]?.title).toBe('GM');
  });

  it('ignores what does not read as a list of players, and does without storage', () => {
    window.localStorage.setItem(RECENT_PLAYERS_KEY, '{oops');
    expect(loadRecentPlayers()).toEqual([]);
    window.localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify({ username: 'x' }));
    expect(loadRecentPlayers()).toEqual([]);
    window.localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify([player('ok'), { username: '' }, { username: 'x', title: 3 }, 'x', null]));
    expect(loadRecentPlayers()).toEqual([player('ok')]);

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(rememberPlayer(player('new'))[0]).toEqual(player('new'));
    setItem.mockRestore();
  });
});

describe('the accounts the dropdown offers', () => {
  const found = [
    { username: 'mag', url: '', avatar: null, title: null, exact: true },
    { username: 'magnuscarlsen', url: '', avatar: null, title: 'GM', exact: false },
  ];

  it('puts the exact account first, then the recent ones, then the others, each once', () => {
    const recent = [player('magnus'), player('magnuscarlsen'), player('hikaru')];

    expect(suggestionOptions('mag', recent, found).map(({ username, kind }) => `${username}:${kind}`)).toEqual([
      'mag:exact',
      'magnus:recent',
      'magnuscarlsen:recent',
    ]);
    expect(suggestionOptions('', recent, []).map(({ username }) => username)).toEqual(['magnus', 'magnuscarlsen', 'hikaru']);
  });

  it('offers nothing for a profile link, and at most eight', () => {
    expect(suggestionOptions('chess.com/member/mag', [player('chess.com/member/mag')], found)).toEqual([]);
    const many = Array.from({ length: 12 }, (_, index) => ({ username: `mag${index}`, url: '', avatar: null, title: 'GM', exact: false }));
    expect(suggestionOptions('mag', [], many)).toHaveLength(8);
  });
});
