/**
 * The games played at the Deliberation table while two players are compared: short, real
 * games (famous miniatures, every move legal), in coordinate notation, played one after
 * another. To add one, list its moves from the starting position as from-square + to-square.
 * They are played with the shared piece tracking (components/chess/board-pieces.ts).
 */
export const RAPID_GAMES: readonly (readonly string[])[] = [
  // Scholar's mate: 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
  ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'],
  // Légal's mate: 1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#
  ['e2e4', 'e7e5', 'g1f3', 'd7d6', 'f1c4', 'c8g4', 'b1c3', 'g7g6', 'f3e5', 'g4d1', 'c4f7', 'e8e7', 'c3d5'],
  // Fool's mate: 1. f3 e5 2. g4 Qh4#
  ['f2f3', 'e7e5', 'g2g4', 'd8h4'],
  // Blackburne Shilling trap: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#
  ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'c6d4', 'f3e5', 'd8g5', 'e5f7', 'g5g2', 'h1f1', 'g2e4', 'c4e2', 'd4f3'],
];
