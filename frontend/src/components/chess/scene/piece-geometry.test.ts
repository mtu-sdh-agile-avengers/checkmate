import { describe, expect, it } from 'vitest';
import type { PieceKind } from '@/components/chess/stage-art';
import { PIECE_KINDS, buildPieceModel, type PieceModel } from './piece-geometry';

describe('3D chess piece models', () => {
  const models = Object.fromEntries(PIECE_KINDS.map((kind) => [kind, buildPieceModel(kind)])) as Record<PieceKind, PieceModel>;

  it('builds every piece standing on its square, inside it', () => {
    for (const kind of PIECE_KINDS) {
      const { body } = models[kind];
      const box = body.boundingBox;
      expect(box, kind).not.toBeNull();
      expect(box?.min.y, kind).toBeCloseTo(0, 2);
      // A piece never reaches past its own square (one unit across).
      expect(Math.max(-(box?.min.x ?? 0), box?.max.x ?? 0, -(box?.min.z ?? 0), box?.max.z ?? 0), kind).toBeLessThan(0.5);
    }
  });

  it('keeps the tournament set heights: king tallest, then queen, bishop, knight, rook, pawn', () => {
    const height = (kind: PieceKind) => models[kind].height;
    expect(height('king')).toBeGreaterThan(height('queen'));
    expect(height('queen')).toBeGreaterThan(height('bishop'));
    expect(height('bishop')).toBeGreaterThan(height('knight'));
    expect(height('knight')).toBeGreaterThan(height('rook'));
    expect(height('rook')).toBeGreaterThan(height('pawn'));
    expect(height('king')).toBeCloseTo(1.73, 1);
  });

  it('gives each piece a welded outline shell with smooth normals for its cut-out edge', () => {
    for (const kind of PIECE_KINDS) {
      const { body, outline } = models[kind];
      expect(outline.getAttribute('normal'), kind).toBeDefined();
      expect(outline.index, kind).not.toBeNull();
      // Welding shares the corners between faces: far fewer vertices than the surface.
      expect(outline.getAttribute('position').count, kind).toBeLessThan(body.getAttribute('position').count);
    }
  });
});
