"""Chess.com's titled players (GM, IM, FM...), for the search box's account suggestions.

Chess.com publishes one list of usernames per title (`/titled/{title}`, some 20,000
usernames in all). The lists change slowly, so they are loaded on the first suggestion
request and kept for a day (`CACHE_SECONDS`). A list that does not load is tried again a
few minutes later (`RETRY_SECONDS`); until then its players from the last load are kept.
"""

import asyncio
import bisect
import time
from collections.abc import Callable, Iterable
from typing import NamedTuple

from loguru import logger

from src.chesscom.client.protocols import ExternalChessComAPIClient
from src.chesscom.parser.parser import parse_titled_players

# Highest first: matches are ranked by title, and a player in two lists keeps the first.
TITLES = ("GM", "IM", "WGM", "FM", "WIM", "CM", "WFM", "WCM", "NM", "WNM")
CACHE_SECONDS = 24 * 60 * 60
RETRY_SECONDS = 5 * 60


class TitledPlayer(NamedTuple):
    username: str  # as the list writes it, e.g. "Hikaru"
    title: str


def ranked(players: Iterable[TitledPlayer], limit: int) -> list[TitledPlayer]:
    """The `limit` most notable: highest title first, then the shortest username (the
    closest to what was typed), then A to Z."""
    return sorted(
        players,
        key=lambda p: (TITLES.index(p.title), len(p.username), p.username.lower()),
    )[:limit]


class TitledPlayers:
    """Every titled player, loaded from Chess.com once a day. One per app (`app.state`),
    shared by every request."""

    def __init__(
        self,
        client: ExternalChessComAPIClient,
        *,
        clock: Callable[[], float] = time.monotonic,  # replaceable for tests
    ) -> None:
        self._client = client
        self._clock = clock
        self._lock = asyncio.Lock()  # one load at a time, however many requests wait
        self._keys: list[str] = []  # lowercase usernames, sorted: a prefix is a range
        self._players: list[TitledPlayer] = []  # in the same order
        self._fresh_until: float | None = None  # None: never loaded

    async def starting_with(self, prefix: str, limit: int) -> list[TitledPlayer]:
        """The best `limit` titled players whose username starts with `prefix` (any case)."""
        await self._load_if_stale()
        prefix = prefix.lower()
        start = bisect.bisect_left(self._keys, prefix)
        end = bisect.bisect_left(self._keys, prefix + "￿")  # past every match
        return ranked(self._players[start:end], limit)

    def _is_fresh(self) -> bool:
        return self._fresh_until is not None and self._clock() < self._fresh_until

    async def _load_if_stale(self) -> None:
        if self._is_fresh():
            return
        async with self._lock:
            if not self._is_fresh():  # unless another request loaded them meanwhile
                await self._load()

    async def _load(self) -> None:
        results = await asyncio.gather(
            *(self._load_list(title) for title in TITLES), return_exceptions=True
        )
        players: dict[str, TitledPlayer] = {}
        failed: set[str] = set()
        for title, result in zip(TITLES, results, strict=True):
            if isinstance(result, BaseException):
                if not isinstance(result, Exception):
                    raise result  # e.g. cancelled: not a failed list
                logger.warning(
                    f"Titled players: the {title} list did not load "
                    f"({type(result).__name__}: {result})"
                )
                failed.add(title)
                continue
            for username in result:
                players.setdefault(username.lower(), TitledPlayer(username, title))

        # A list that did not load keeps its players from the last time it did.
        for player in self._players:
            if player.title in failed:
                players.setdefault(player.username.lower(), player)

        self._keys = sorted(players)
        self._players = [players[key] for key in self._keys]
        self._fresh_until = self._clock() + (RETRY_SECONDS if failed else CACHE_SECONDS)

    async def _load_list(self, title: str) -> list[str]:
        raw = await self._client.get_titled_players(title)
        return parse_titled_players(raw).usernames
