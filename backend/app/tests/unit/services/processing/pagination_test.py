from datetime import UTC, datetime, timedelta

from src.chesscom.parser.models import ArchiveMonth
from src.enums import GameResult, PlayerColor, SortGameBy, SortOrder, TimeClass
from src.schemas.games import (
    GameMemberResponse,
    GameResponse,
    PlayerGameHistoryListQuery,
)
from src.services.processing.pagination import build_game_list, sort_games

START = datetime(2026, 10, 1, tzinfo=UTC)
OCTOBER = ArchiveMonth(2026, 10)

def make_game(
    game_id: str,
    *,
    hours: int = 0,
    rating: int = 2000,
    opponent_rating: int = 2000,
    time_class: TimeClass = TimeClass.BLITZ,
) -> GameResponse:
    """A list item; only the fields the tests vary are parameters."""
    return GameResponse(
        id=game_id,
        url=f"https://www.chess.com/game/live/{game_id}",
        time_class=time_class,
        time_control="180",
        end_time=START + timedelta(hours=hours),
        rated=True,
        color=PlayerColor.WHITE,
        result=GameResult.WIN,
        player=GameMemberResponse(username="tester", rating=rating),
        opponent=GameMemberResponse(username="other", rating=opponent_rating),
    )

def query(**params) -> PlayerGameHistoryListQuery:
    return PlayerGameHistoryListQuery.model_validate(params)

def ids(games) -> list[str]:
    return [game.id for game in games]


def test_sort_by_avg_rating_breaks_ties_by_end_time_and_id():
    games = [
        make_game("lowest", hours=1, rating=400, opponent_rating=450),         # avg 425
        make_game("high-tie-old", hours=2, rating=1900, opponent_rating=2100), # avg 2000
        make_game("highest", hours=3, rating=2500, opponent_rating=2600),      # avg 2550
        make_game("high-tie-new-a", hours=4, rating=2000, opponent_rating=2000), # avg 2000, 1 in lexicographical order
        make_game("high-tie-new-b", hours=4, rating=2000, opponent_rating=2000), # avg 2000, 2 in lexicographical order
    ]

    asc = sort_games(games, SortGameBy.AVG_RATING, SortOrder.ASC)
    desc = sort_games(games, SortGameBy.AVG_RATING, SortOrder.DESC)

    assert ids(asc) == ["lowest", "high-tie-old", "high-tie-new-a", "high-tie-new-b", "highest"]
    assert ids(desc) == ["highest", "high-tie-new-b", "high-tie-new-a", "high-tie-old", "lowest"]


def test_build_game_list_pages():
    games = [make_game(str(n), hours=n) for n in range(1, 8)] # 7 games

    first = build_game_list(games, OCTOBER, query(pagingLimit=5))
    second = build_game_list(games, OCTOBER, query(pagingLimit=5, page=2))
    past_end = build_game_list(games, OCTOBER, query(pagingLimit=5, page=3))

    assert (first.year, first.month) == (2026, 10)
    assert ids(first.items) == ["7", "6", "5", "4", "3"]  # newest first by default (MATCH_DATE_TIME, DESC)
    assert (first.total_games, first.total_pages, first.has_next) == (7, 2, True) # first page HAS NEXT page (second)

    assert ids(second.items) == ["2", "1"]  # the last page is shorter
    assert second.has_next is False # second page does NOT HAS NEXT page

    assert past_end.items == []  # no items if past the end


def test_build_game_list_filters_by_time_class():
    games = [
        make_game("1", time_class=TimeClass.BLITZ),
        make_game("2", time_class=TimeClass.BLITZ),
        make_game("3", time_class=TimeClass.BULLET),
        make_game("4", time_class=TimeClass.RAPID),
    ]

    response = build_game_list(games, OCTOBER, query(timeClass="blitz"))

    assert sorted(ids(response.items)) == ["1", "2"]
    assert (response.total_games, response.total_pages) == (2, 1)  # after the filter


def test_build_game_list_without_games():
    response = build_game_list([], None, query())

    assert (response.year, response.month, response.items) == (None, None, [])
    assert (response.total_games, response.total_pages, response.page) == (0, 0, 1)
    assert response.has_next is False