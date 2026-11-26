"""Tests for playing against the computer: rules, game end and the computer players."""

import re
import shutil

import chess
import pytest
from pydantic import ValidationError

from src.analysis.stockfish import load_stockfish_config
from src.config import get_config
from src.enums import ComputerLevel, GameStatus, PlayerColor
from src.schemas.computer import ComputerMoveRequest
from src.services.computer import BasicPlayer, StockfishPlayer, play_move
from src.services.exceptions import ChessEngineUnavailableError

START = chess.STARTING_FEN
# White to move, mate in one with Qh5xf7#
SCHOLARS_MATE = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"


class FakePlayer:
    """Plays the given moves in order and records the positions it was asked about."""

    def __init__(self, *moves: str) -> None:
        self._moves = list(moves)
        self.positions: list[str] = []

    async def choose_move(self, board: chess.Board, level: ComputerLevel) -> chess.Move:
        self.positions.append(board.fen())
        return chess.Move.from_uci(self._moves.pop(0))


def request(**data) -> ComputerMoveRequest:
    return ComputerMoveRequest.model_validate(data)


@pytest.mark.anyio
async def test_start_a_game_as_white():
    computer = FakePlayer()

    state = await play_move(request(), computer)

    assert state.fen == START
    assert (state.player_move, state.computer_move) == (None, None)
    assert state.turn == PlayerColor.WHITE
    assert len(state.legal_moves) == 20 and "e2e4" in state.legal_moves
    assert (state.status, state.winner, state.check) == (
        GameStatus.PLAYING,
        None,
        False,
    )
    assert computer.positions == []  # the computer was not asked


@pytest.mark.anyio
async def test_the_computer_moves_first_when_the_player_is_black():
    state = await play_move(request(playerColor="black"), FakePlayer("e2e4"))

    assert state.computer_move.san == "e4"
    assert state.turn == PlayerColor.BLACK
    assert "e7e5" in state.legal_moves


@pytest.mark.anyio
async def test_player_move_and_computer_reply():
    computer = FakePlayer("e7e5")

    state = await play_move(request(move="e2e4"), computer)

    assert (state.player_move.uci, state.player_move.san) == ("e2e4", "e4")
    assert (state.player_move.from_square, state.player_move.to_square) == ("e2", "e4")
    assert state.computer_move.san == "e5"
    # the computer got the position after the player's move
    assert computer.positions == [
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    ]
    assert state.fen.startswith("rnbqkbnr/pppp1ppp/8/4p3/4P3/")
    assert state.turn == PlayerColor.WHITE


@pytest.mark.anyio
async def test_player_checkmates_the_computer():
    computer = FakePlayer()

    state = await play_move(request(fen=SCHOLARS_MATE, move="h5f7"), computer)

    assert state.player_move.san == "Qxf7#"
    assert state.computer_move is None  # no reply after mate
    assert (state.status, state.winner, state.check) == (
        GameStatus.CHECKMATE,
        PlayerColor.WHITE,
        True,
    )
    assert state.legal_moves == []


@pytest.mark.anyio
async def test_computer_checkmates_the_player():
    # Fool's mate: after 1. f3 e5 2. g4 the computer (black) mates with Qh4#
    fen = "rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2"

    state = await play_move(request(fen=fen, move="g2g4"), FakePlayer("d8h4"))

    assert state.computer_move.san == "Qh4#"
    assert (state.status, state.winner) == (GameStatus.CHECKMATE, PlayerColor.BLACK)


@pytest.mark.anyio
async def test_stalemate_and_draw_by_material():
    stalemate = (
        "k7/8/1Q6/8/8/8/8/K7 b - - 0 1"  # black to move, no legal move, no check
    )
    bare_kings = "8/8/4k3/8/8/4K3/8/8 w - - 0 1"

    assert (
        await play_move(request(fen=stalemate, playerColor="black"), FakePlayer())
    ).status == GameStatus.STALEMATE
    assert (
        await play_move(request(fen=bare_kings), FakePlayer())
    ).status == GameStatus.DRAW


@pytest.mark.anyio
async def test_an_illegal_engine_move_is_an_engine_error():
    with pytest.raises(ChessEngineUnavailableError):
        await play_move(request(move="e2e4"), FakePlayer("e2e4"))


@pytest.mark.parametrize(
    ("data", "message"),
    [
        ({"fen": "not a fen"}, "The position (FEN) is not valid."),
        ({"fen": "8/8/8/8/8/8/8/8 w - - 0 1"}, "not a legal chess position"),
        ({"move": "e2-e4"}, "Moves are written like e2e4"),
        ({"move": "e2e5"}, "This move is not allowed in this position."),
        ({"move": "e7e5"}, "This move is not allowed in this position."),
        ({"move": "e7e5", "playerColor": "black"}, "It is not your turn."),
    ],
)
def test_invalid_requests(data, message):
    with pytest.raises(ValidationError, match=re.escape(message)):
        request(**data)


def test_no_move_after_the_game_is_over():
    mated = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4"

    with pytest.raises(ValidationError, match="The game is already over."):
        request(fen=mated, move="e8f7", playerColor="black")


# The computer players -----------------------------------------------------------------


@pytest.mark.anyio
async def test_basic_player_mates_in_one_and_takes_material():
    player = BasicPlayer()
    # black to move: Qd8-h4 is mate (Fool's mate)
    fools = chess.Board("rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2")
    # white to move: the queen on d5 can be taken by the pawn on e4
    hanging_queen = chess.Board(
        "rnb1kbnr/pppp1ppp/8/3qp3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3"
    )

    assert (await player.choose_move(fools, ComputerLevel.BEGINNER)).uci() == "d8h4"
    assert (
        await player.choose_move(hanging_queen, ComputerLevel.EXPERT)
    ).uci() == "e4d5"


@pytest.mark.anyio
async def test_basic_player_is_repeatable_and_legal():
    player = BasicPlayer()
    board = chess.Board()

    first = await player.choose_move(board, ComputerLevel.INTERMEDIATE)

    assert first in board.legal_moves
    assert first == await player.choose_move(board, ComputerLevel.INTERMEDIATE)


@pytest.mark.anyio
async def test_basic_player_values_en_passant_and_promotion():
    player = BasicPlayer()
    # white pawn e5 can take d6 en passant (gain 1) or nothing else is worth more
    en_passant = chess.Board("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2")
    # white pawn b7 promotes: to a queen is worth the most
    promotion = chess.Board("4k3/1P6/8/8/8/8/8/4K3 w - - 0 1")

    assert (
        await player.choose_move(en_passant, ComputerLevel.BEGINNER)
    ).uci() == "e5d6"
    assert (
        await player.choose_move(promotion, ComputerLevel.BEGINNER)
    ).uci() == "b7b8q"


@pytest.mark.anyio
async def test_basic_player_needs_a_legal_move():
    mated = chess.Board(
        "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4"
    )

    with pytest.raises(ChessEngineUnavailableError, match="No legal move"):
        await BasicPlayer().choose_move(mated, ComputerLevel.BEGINNER)


@pytest.mark.anyio
async def test_stockfish_player_without_path_is_unavailable():
    with pytest.raises(ChessEngineUnavailableError, match="STOCKFISH_PATH"):
        await StockfishPlayer(None, load_stockfish_config()).choose_move(
            chess.Board(), ComputerLevel.BEGINNER
        )


STOCKFISH_PATH = get_config().stockfish_path or shutil.which("stockfish")


@pytest.mark.anyio
@pytest.mark.integration  # starts a real Stockfish process
@pytest.mark.skipif(not STOCKFISH_PATH, reason="Stockfish is not installed")
@pytest.mark.parametrize("level", list(ComputerLevel))
async def test_real_stockfish_plays_every_level(level):
    player = StockfishPlayer(STOCKFISH_PATH, load_stockfish_config())
    board = chess.Board(SCHOLARS_MATE)

    move = await player.choose_move(board, level)

    assert move in board.legal_moves
    if level == ComputerLevel.EXPERT:
        assert move.uci() == "h5f7"  # full strength finds the mate in one
