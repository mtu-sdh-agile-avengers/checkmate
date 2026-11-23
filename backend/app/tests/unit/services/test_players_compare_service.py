"""Tests for ChessComPlayersService.compare: the player comparison endpoint (CMG4-89).

Uses the real Chess.com stats of Hikaru and the hand-written sample player's stats.
"""

import pytest
from fastapi import status

from src.chesscom.client.exceptions import (
    ChessAPINotFoundError,
    ChessAPIUnavailableError,
    ChessComPlayersNotFoundError,
)
from src.dependencies import get_players_service
from src.schemas.players import PlayerComparisonQuery
from src.services.players import ChessComPlayersService
from tests.fakes import FakeChessComClient

URL = "/api/v1/players/compare"


class TwoPlayersClient(FakeChessComClient):
    """Fake Chess.com client with different stats per player."""

    def __init__(
        self,
        stats_by_player: dict[str, dict],
        missing: tuple[str, ...] = (),
        down: bool = False,
    ) -> None:
        super().__init__()
        self.stats_by_player = stats_by_player
        self.missing = set(missing)
        self.down = down  # simulate Chess.com being unavailable

    async def get_player_stats(self, username: str) -> dict:
        path = f"/player/{username}/stats"
        self.calls.append(path)
        if self.down:
            raise ChessAPIUnavailableError(path)
        if username in self.missing:
            raise ChessAPINotFoundError(path)
        return self.stats_by_player[username]


@pytest.fixture
def client_for(chesscom_fixture):
    def make(**kwargs) -> TwoPlayersClient:
        stats = {
            "hikaru": chesscom_fixture("hikaru/hikaru_stats.json"),
            "checkmate_tester": chesscom_fixture("player_stats.json"),
        }
        return TwoPlayersClient(stats, **kwargs)

    return make


def compare_query(p1: str, p2: str, time_class: str) -> PlayerComparisonQuery:
    return PlayerComparisonQuery.model_validate(
        {"p1": p1, "p2": p2, "timeClass": time_class}
    )


@pytest.mark.anyio
async def test_compare_two_players(client_for):
    client = client_for()

    result = await ChessComPlayersService(client).compare(
        compare_query("Hikaru", "checkmate_tester", "blitz")
    )

    assert result.time_class == "blitz"
    hikaru, tester = result.player1, result.player2
    assert (hikaru.username, hikaru.day_period) == ("hikaru", "all")
    assert (hikaru.wins, hikaru.losses, hikaru.draws) == (36098, 5551, 4384)
    assert (hikaru.rating.current, tester.rating.current) == (3467, 2318)
    assert (tester.wins, tester.losses, tester.draws) == (4210, 3895, 402)
    # 1149 points apart: Hikaru is expected to score 99.87 %
    assert result.win_likelihood.player1 == 0.9987
    assert result.win_likelihood.player2 == 0.0013
    assert result.winner == "hikaru"
    # one /stats request per player, nothing else
    assert sorted(client.calls) == [
        "/player/checkmate_tester/stats",
        "/player/hikaru/stats",
    ]


@pytest.mark.anyio
async def test_no_likelihood_when_a_player_never_played_the_time_class(client_for):
    # the sample player has no bullet games
    result = await ChessComPlayersService(client_for()).compare(
        compare_query("hikaru", "checkmate_tester", "bullet")
    )

    assert result.player2.rating.current is None
    assert result.player2.total_games_played == 0
    assert result.win_likelihood is None
    assert result.winner is None


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("missing", "message"),
    [
        (("checkmate_tester",), "Player checkmate_tester data is unavailable"),
        (
            ("hikaru", "checkmate_tester"),
            "Players hikaru, checkmate_tester data is unavailable",
        ),
    ],
)
async def test_unavailable_players_are_named(client_for, missing, message):
    service = ChessComPlayersService(client_for(missing=missing))

    with pytest.raises(ChessComPlayersNotFoundError, match=f"^{message}$"):
        await service.compare(compare_query("hikaru", "checkmate_tester", "blitz"))


@pytest.mark.anyio
async def test_chess_com_errors_are_not_hidden(client_for):
    service = ChessComPlayersService(client_for(down=True))

    with pytest.raises(ChessAPIUnavailableError):
        await service.compare(compare_query("hikaru", "checkmate_tester", "blitz"))


# Endpoint with the real service (Chess.com replaced by the fake client) -------------


def use_service(api_client, service):
    # NOTE: a lambda, not the class itself (see test_players_summary_mock.py)
    api_client.app.dependency_overrides[get_players_service] = lambda: service
    return api_client


def test_compare_endpoint(api_client, client_for):
    client = use_service(api_client, ChessComPlayersService(client_for()))

    response = client.get(
        URL,
        params={
            "p1": "https://www.chess.com/member/Hikaru",
            "p2": "checkmate_tester",
            "timeClass": "rapid",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["player1"]["totalGamesPlayed"] == 205 + 69 + 220
    assert body["player2"]["rating"]["current"] == 2210
    assert body["winLikelihood"] == {"player1": 0.9738, "player2": 0.0262}
    assert body["winner"] == "hikaru"


def test_compare_endpoint_unavailable_player(api_client, client_for):
    service = ChessComPlayersService(client_for(missing=("checkmate_tester",)))
    client = use_service(api_client, service)

    response = client.get(
        URL, params={"p1": "hikaru", "p2": "checkmate_tester", "timeClass": "blitz"}
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json() == {"detail": "Player checkmate_tester data is unavailable"}
