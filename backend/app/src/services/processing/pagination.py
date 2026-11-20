"""Filtering, sorting and paging for the game history list endpoint.
"""
from _collections_abc import Callable, Iterable
from math import ceil

from src.chesscom.parser.models import ArchiveMonth
from src.enums import SortGameBy, SortOrder, TimeClass
from src.schemas.games import (
    GameResponse,
    PaginatedGameListResponse,
    PlayerGameHistoryListQuery,
)

type SortKey = Callable[[GameResponse], tuple]

_SORT_KEYS: dict[SortGameBy, SortKey] = {
    SortGameBy.MATCH_DATE_TIME: lambda game: (game.end_time, game.id),
    SortGameBy.AVG_RATING: lambda game: (game.avg_rating, game.end_time, game.id)
}


def filter_by_time_class(
        games: Iterable[GameResponse],
        time_class: TimeClass | None
) -> list[GameResponse]:
    """Filters games by selected time class; all games if `time_class` is None.

    Args:
        games: list (any iterable type) of games.
        time_class: TimeClass.

    Returns:
        list[GameResponse]: New list with the matching games, in the original order.
    """
    if time_class is None:
        return list(games)
    return [game for game in games if game.time_class == time_class]


def sort_games(
    games: Iterable[GameResponse],
    sort_by: SortGameBy,
    sort_order: SortOrder
) -> list[GameResponse]:
    """Sorts games by date or average rating (DESC / ASC).

    Args:
        games: Games to sort (any iterable).
        sort_by: `matchDateTime` or `avgRating`.
        sort_order: `asc` or `desc`.

    Returns:
        New sorted list (not changed).
    """
    return sorted(games, key=_SORT_KEYS[sort_by], reverse=sort_order == SortOrder.DESC)


def total_pages(
        total_items: int,
        page_size: int
) -> int:
    """Counts amount of pages required to show all items.

    Args:
        total_items: Number of items.
        page_size: Max items in the page.

    Returns:
        Number of pages, rounded up; 0 if there are no items.
    """
    return ceil(total_items / page_size)

def page_slice[T](
        items: list[T],
        page: int,
        page_size: int
) -> list[T]:
    """Returns the items of one page.

    Args:
        items: All items.
        page: Page number, starting at 1.
        page_size: Max number of items on the page.

    Returns:
        Items related to the page.
    """
    start_index = (page - 1) * page_size
    return items[start_index : start_index + page_size]

def build_game_list(
        games: Iterable[GameResponse],
        archive_month: ArchiveMonth | None,
        query: PlayerGameHistoryListQuery
) -> PaginatedGameListResponse:
    """Builds one page of game history list from the games of an archive month.

    Steps: filter by time class -> sort -> count pages -> slice page.

    Args:
        games: All games of the archive month, mapped to `GameResponse`.
        archive_month: Archive month the games come from; None if the player has no games during this period.
        query: Filter, sorting and paging options from the request.

    Returns:
        Response with the games of the requested page (filtered and sorted) and paging information.
    """
    selected = sort_games(filter_by_time_class(games, query.time_class), query.sort_by, query.sort_order)
    page_size = query.paging_limit
    pages = total_pages(len(selected), page_size)

    return PaginatedGameListResponse(
        year=archive_month.year if archive_month else None,
        month=archive_month.month if archive_month else None,
        items=page_slice(selected, query.page, page_size),
        paging_limit=query.paging_limit,
        total_games=len(selected),
        total_pages=pages,
        page=query.page,
        has_next=query.page < pages
    )
