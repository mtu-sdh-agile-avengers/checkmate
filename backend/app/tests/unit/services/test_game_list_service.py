import pytest

from src.chesscom.client.exceptions import ChessAPINotFoundError
from src.schemas.games import PlayerGameHistoryListQuery
from src.services.games import ChessComGamesService
from tests.fakes import FakeChessComClient

OCTOBER = (2026, 10)


@pytest.fixture
def fake_client(chesscom_fixture) -> FakeChessComClient:
    return FakeChessComClient(
        archive_months=[
            (2026, 9),
            OCTOBER,
        ],  # chess.com with 2 archive months: empty September, mock October
        monthly_games={
            OCTOBER: chesscom_fixture("hikaru/hikaru_games_2026_10.json")["games"]
        },
    )


def query(**params) -> PlayerGameHistoryListQuery:
    return PlayerGameHistoryListQuery.model_validate(params)


def ids(response) -> list[str]:
    return [game.id for game in response.items]


@pytest.mark.anyio
async def test_list_of_a_requested_month(fake_client):
    service = ChessComGamesService(fake_client)

    response = await service.get_game_history_list("hikaru", query(year=2026, month=10))

    assert (response.year, response.month) == OCTOBER
    assert response.total_games == 13
    assert ids(response)[0] == "186299800014"  # newest first: 31 Oct 19:39
    assert fake_client.calls == ["/player/hikaru/games/2026/10"]  # 1 request


@pytest.mark.anyio
async def test_list_uses_the_latest_month_without_year_and_month(fake_client):
    service = ChessComGamesService(fake_client)

    response = await service.get_game_history_list("hikaru", query())

    assert (response.year, response.month) == OCTOBER  # sent back for game links
    assert fake_client.calls == [
        "/player/hikaru/games/archives",
        "/player/hikaru/games/2026/10",
    ]


@pytest.mark.anyio
async def test_list_of_a_player_without_games():
    client = FakeChessComClient(archive_months=[])
    service = ChessComGamesService(client)

    response = await service.get_game_history_list("withoutgames", query())

    assert (response.year, response.month, response.items) == (None, None, [])
    assert client.calls == ["/player/withoutgames/games/archives"]  # no month request


@pytest.mark.anyio
async def test_list_of_an_unknown_player_with_a_month():
    client = FakeChessComClient(not_found=True)
    service = ChessComGamesService(client)

    with pytest.raises(ChessAPINotFoundError):
        await service.get_game_history_list("notexist", query(year=2026, month=10))

    assert client.calls == ["/player/notexist/games/2026/10"]


@pytest.mark.anyio
async def test_list_of_a_month_chesscom_does_not_know():
    client = FakeChessComClient(archive_months=[OCTOBER])
    service = ChessComGamesService(client)

    response = await service.get_game_history_list("hikaru", query(year=2015, month=1))

    assert (response.year, response.month, response.items) == (2015, 1, [])
