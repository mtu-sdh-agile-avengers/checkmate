export type SearchFormValues = { query: string };

/** The player found by the search: enough to open the player view (`/players/{username}`). */
export type PlayerSearchResult = {
  username: string;
  url: string;
  avatar: string | null;
  title: string | null;
};
