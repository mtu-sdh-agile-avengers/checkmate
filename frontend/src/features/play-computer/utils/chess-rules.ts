import type { Side } from '@/components/chess/board-pieces';
import type { PieceKind } from '@/components/chess/stage-art';

/**
 * Just enough of the rules of chess for the page to explain itself. The server decides what
 * is legal (its list of legal moves); these helpers never overrule it. They let the page:
 * - show the player's move at once, before the server answers (`applyUci`, `toFen`, `sanFor`);
 * - see a king in check in that position (`inCheck`, `kingSquare`);
 * - say why a move the server does not allow is refused (`explainIllegal`);
 * - name the reason for a draw (`insufficientMaterial`).
 */

export type Piece = { kind: PieceKind; side: Side };

/** A position, as a FEN describes it: the pieces by square and the state around them. */
export type Position = {
  board: ReadonlyMap<string, Piece>;
  turn: Side;
  castling: string; // the rights left, e.g. "KQkq"; empty when none
  enPassant: string | null; // the square a pawn passed over on its double step
  halfmove: number; // moves since the last capture or pawn move (50-move rule)
  fullmove: number;
};

const FILES = 'abcdefgh';
const KINDS: Record<string, PieceKind> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const LETTERS: Record<PieceKind, string> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const KNIGHT_STEPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]] as const;
const KING_STEPS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;
const STRAIGHT = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

const fileOf = (square: string) => FILES.indexOf(square.charAt(0));
const rankOf = (square: string) => Number(square.charAt(1)) - 1;
const squareAt = (file: number, rank: number): string | null =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8 ? `${FILES.charAt(file)}${rank + 1}` : null;

export const opposite = (side: Side): Side => (side === 'white' ? 'black' : 'white');

/** Reads a FEN, e.g. "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1". */
export function parseFen(fen: string): Position {
  const [placement = '', turn = 'w', castling = '-', enPassant = '-', halfmove = '0', fullmove = '1'] = fen.split(' ');
  const board = new Map<string, Piece>();
  placement.split('/').forEach((row, index) => {
    let file = 0;
    for (const char of row) {
      const kind = KINDS[char.toLowerCase()];
      const square = squareAt(file, 7 - index);
      if (kind && square) board.set(square, { kind, side: char === char.toUpperCase() ? 'white' : 'black' });
      file += kind ? 1 : Number(char) || 0;
    }
  });
  return {
    board,
    turn: turn === 'b' ? 'black' : 'white',
    castling: castling === '-' ? '' : castling,
    enPassant: enPassant === '-' ? null : enPassant,
    halfmove: Number(halfmove) || 0,
    fullmove: Number(fullmove) || 1,
  };
}

/** Writes a position back as a FEN. */
export function toFen(position: Position): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank -= 1) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file += 1) {
      const piece = position.board.get(squareAt(file, rank) ?? '');
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty > 0) row += String(empty);
      empty = 0;
      const letter = LETTERS[piece.kind];
      row += piece.side === 'white' ? letter.toUpperCase() : letter;
    }
    rows.push(empty > 0 ? `${row}${empty}` : row);
  }
  const turn = position.turn === 'white' ? 'w' : 'b';
  return `${rows.join('/')} ${turn} ${position.castling || '-'} ${position.enPassant ?? '-'} ${position.halfmove} ${position.fullmove}`;
}

/** Whether `square` is attacked by a piece of side `by`. */
export function isAttacked(board: ReadonlyMap<string, Piece>, square: string, by: Side): boolean {
  const file = fileOf(square);
  const rank = rankOf(square);
  const at = (df: number, dr: number) => board.get(squareAt(file + df, rank + dr) ?? '');
  const is = (piece: Piece | undefined, ...kinds: PieceKind[]) => piece?.side === by && kinds.includes(piece.kind);

  // A pawn attacks diagonally forward: a white pawn from the rank below, a black one from above.
  const behind = by === 'white' ? -1 : 1;
  if (is(at(-1, behind), 'pawn') || is(at(1, behind), 'pawn')) return true;
  if (KNIGHT_STEPS.some(([df, dr]) => is(at(df, dr), 'knight'))) return true;
  if (KING_STEPS.some(([df, dr]) => is(at(df, dr), 'king'))) return true;
  const slides = (directions: readonly (readonly [number, number])[], ...kinds: PieceKind[]) =>
    directions.some(([df, dr]) => {
      for (let step = 1; step < 8; step += 1) {
        const target = squareAt(file + df * step, rank + dr * step);
        if (!target) return false;
        const piece = board.get(target);
        if (piece) return is(piece, ...kinds);
      }
      return false;
    });
  return slides(STRAIGHT, 'rook', 'queen') || slides(DIAGONAL, 'bishop', 'queen');
}

/** The square of `side`'s king (null if it is not on the board). */
export function kingSquare(board: ReadonlyMap<string, Piece>, side: Side): string | null {
  for (const [square, piece] of board) if (piece.kind === 'king' && piece.side === side) return square;
  return null;
}

/** Whether `side`'s king is in check. */
export function inCheck(position: Position, side: Side): boolean {
  const king = kingSquare(position.board, side);
  return king !== null && isAttacked(position.board, king, opposite(side));
}

/**
 * The position after a move in coordinate notation (e.g. "e2e4", "e1g1", "e7e8q"): castling
 * brings the rook across, en passant takes the pawn passed, a fifth letter promotes. The
 * move is trusted to be legal (it is one of the server's legal moves).
 */
export function applyUci(position: Position, uci: string): Position {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const piece = position.board.get(from);
  if (!piece) return position;
  const board = new Map(position.board);
  const captured = board.get(to);
  board.delete(from);

  const enPassant = piece.kind === 'pawn' && from.charAt(0) !== to.charAt(0) && !captured;
  if (enPassant) board.delete(`${to.charAt(0)}${from.charAt(1)}`);
  if (piece.kind === 'king' && Math.abs(fileOf(to) - fileOf(from)) === 2) {
    const rank = from.charAt(1);
    const [rookFrom, rookTo] = to.charAt(0) === 'g' ? [`h${rank}`, `f${rank}`] : [`a${rank}`, `d${rank}`];
    const rook = board.get(rookFrom);
    if (rook) {
      board.delete(rookFrom);
      board.set(rookTo, rook);
    }
  }
  const promotion = piece.kind === 'pawn' ? KINDS[uci.charAt(4)] : undefined;
  board.set(to, promotion ? { kind: promotion, side: piece.side } : piece);

  // A king or rook leaving home, or a rook taken at home, ends that castling right.
  let castling = position.castling;
  const lose = (rights: string) => {
    for (const right of rights) castling = castling.replace(right, '');
  };
  if (piece.kind === 'king') lose(piece.side === 'white' ? 'KQ' : 'kq');
  const corners: Record<string, string> = { h1: 'K', a1: 'Q', h8: 'k', a8: 'q' };
  for (const square of [from, to]) lose(corners[square] ?? '');

  const doubleStep = piece.kind === 'pawn' && Math.abs(rankOf(to) - rankOf(from)) === 2;
  return {
    board,
    turn: opposite(position.turn),
    castling,
    enPassant: doubleStep ? squareAt(fileOf(from), (rankOf(from) + rankOf(to)) / 2) : null,
    halfmove: piece.kind === 'pawn' || captured || enPassant ? 0 : position.halfmove + 1,
    fullmove: position.turn === 'black' ? position.fullmove + 1 : position.fullmove,
  };
}

/**
 * The move in standard algebraic notation, as a score sheet writes it: "e4", "Nbd7", "exd5",
 * "O-O", "e8=Q", with "+" when it gives check. `legalMoves` (the server's, for this position)
 * tells which other pieces could go to the same square, for the file or rank that tells them
 * apart. Checkmate ("#") is the server's to say: it sends its own notation with the reply.
 */
export function sanFor(position: Position, uci: string, legalMoves: readonly string[]): string {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const piece = position.board.get(from);
  if (!piece) return uci;
  let san: string;
  if (piece.kind === 'king' && Math.abs(fileOf(to) - fileOf(from)) === 2) {
    san = to.charAt(0) === 'g' ? 'O-O' : 'O-O-O';
  } else if (piece.kind === 'pawn') {
    const capture = from.charAt(0) !== to.charAt(0);
    const promotion = KINDS[uci.charAt(4)];
    san = `${capture ? `${from.charAt(0)}x` : ''}${to}${promotion ? `=${LETTERS[promotion].toUpperCase()}` : ''}`;
  } else {
    const rivals = [...new Set(legalMoves.filter((move) => move.slice(2, 4) === to).map((move) => move.slice(0, 2)))]
      .filter((square) => square !== from && position.board.get(square)?.kind === piece.kind);
    let apart = '';
    if (rivals.length > 0) {
      if (!rivals.some((square) => square.charAt(0) === from.charAt(0))) apart = from.charAt(0);
      else if (!rivals.some((square) => square.charAt(1) === from.charAt(1))) apart = from.charAt(1);
      else apart = from;
    }
    san = `${LETTERS[piece.kind].toUpperCase()}${apart}${position.board.has(to) ? 'x' : ''}${to}`;
  }
  const after = applyUci(position, uci);
  return inCheck(after, after.turn) ? `${san}+` : san;
}

const HOW_IT_MOVES: Record<PieceKind, string> = {
  pawn: 'A pawn moves straight ahead and takes diagonally.',
  knight: 'A knight moves in an L: two squares one way, then one to the side.',
  bishop: 'A bishop moves diagonally.',
  rook: 'A rook moves along ranks and files.',
  queen: 'A queen moves along ranks, files and diagonals.',
  king: 'A king moves one square at a time.',
};

/** Whether the squares strictly between `from` and `to` (on one line) are all empty. */
function pathClear(board: ReadonlyMap<string, Piece>, from: string, to: string): boolean {
  const df = Math.sign(fileOf(to) - fileOf(from));
  const dr = Math.sign(rankOf(to) - rankOf(from));
  let file = fileOf(from) + df;
  let rank = rankOf(from) + dr;
  while (file !== fileOf(to) || rank !== rankOf(to)) {
    if (board.has(squareAt(file, rank) ?? '')) return false;
    file += df;
    rank += dr;
  }
  return true;
}

/**
 * Why the move from `from` to `to` is refused, in a sentence the player can act on, e.g.
 * "Your king would be in check." It is called for moves the server's list does not have:
 * first the way the piece moves, then castling, then the safety of the king.
 */
export function explainIllegal(position: Position, from: string, to: string): string {
  const piece = position.board.get(from);
  if (!piece) return 'There is no piece of yours there.';
  const target = position.board.get(to);
  if (target?.side === piece.side) return 'You can’t take your own piece.';

  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  const straight = (df === 0) !== (dr === 0);
  const diagonal = df !== 0 && Math.abs(df) === Math.abs(dr);
  const blocked = `The way is blocked: a ${piece.kind} can’t jump over pieces.`;
  let castling = false;
  switch (piece.kind) {
    case 'knight':
      if (!((Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1))) return HOW_IT_MOVES.knight;
      break;
    case 'bishop':
    case 'rook':
    case 'queen': {
      const fits = piece.kind === 'bishop' ? diagonal : piece.kind === 'rook' ? straight : diagonal || straight;
      if (!fits) return HOW_IT_MOVES[piece.kind];
      if (!pathClear(position.board, from, to)) return blocked;
      break;
    }
    case 'pawn': {
      const forward = piece.side === 'white' ? 1 : -1;
      const home = piece.side === 'white' ? 1 : 6;
      if (df === 0 && dr === forward) {
        if (target) return 'A pawn can’t take straight ahead: it takes diagonally.';
      } else if (df === 0 && dr === 2 * forward && rankOf(from) === home) {
        if (target || !pathClear(position.board, from, to)) return 'Something is in the pawn’s way.';
      } else if (Math.abs(df) === 1 && dr === forward) {
        if (!target && to !== position.enPassant) return 'A pawn only moves diagonally to take a piece.';
      } else {
        return HOW_IT_MOVES.pawn;
      }
      break;
    }
    case 'king': {
      castling = dr === 0 && Math.abs(df) === 2 && from === (piece.side === 'white' ? 'e1' : 'e8');
      if (!castling && (Math.abs(df) > 1 || Math.abs(dr) > 1)) return HOW_IT_MOVES.king;
      if (castling) {
        const kingside = df > 0;
        const right = kingside ? 'K' : 'Q';
        if (!position.castling.includes(piece.side === 'white' ? right : right.toLowerCase())) {
          return 'You can’t castle that way any more: your king or that rook has moved.';
        }
        const rank = from.charAt(1);
        if ((kingside ? ['f', 'g'] : ['b', 'c', 'd']).some((file) => position.board.has(`${file}${rank}`))) {
          return 'To castle, the squares between your king and the rook must be empty.';
        }
      }
      break;
    }
  }

  // The move is one the piece can make: what stops it is the king's safety.
  const enemy = opposite(piece.side);
  if (castling) {
    if (inCheck(position, piece.side)) return 'You can’t castle out of check.';
    return 'Your king can’t castle through or into check.';
  }
  const after = applyUci(position, `${from}${to}${piece.kind === 'pawn' && (to.charAt(1) === '8' || to.charAt(1) === '1') ? 'q' : ''}`);
  const king = kingSquare(after.board, piece.side);
  if (king !== null && isAttacked(after.board, king, enemy)) {
    if (inCheck(position, piece.side)) return 'Your king is in check, and that move doesn’t get it out.';
    if (piece.kind === 'king') return 'Your king would be in check.';
    return `Your king would be in check: that ${piece.kind} is pinned.`;
  }
  return 'That move isn’t allowed here.';
}

/**
 * Whether neither side has enough pieces left to checkmate: no pawns, rooks or queens, and
 * at most one knight or bishop between them, or only bishops all on squares of one colour.
 */
export function insufficientMaterial(board: ReadonlyMap<string, Piece>): boolean {
  const minors: string[] = [];
  for (const [square, piece] of board) {
    if (piece.kind === 'king') continue;
    if (piece.kind !== 'knight' && piece.kind !== 'bishop') return false;
    minors.push(piece.kind === 'bishop' ? `b${(fileOf(square) + rankOf(square)) % 2}` : 'n');
  }
  if (minors.length <= 1) return true;
  return !minors.includes('n') && new Set(minors).size === 1;
}
