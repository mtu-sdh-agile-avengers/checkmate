import { describe, expect, it } from 'vitest';
import { easeOutBack, fitDistance, lensShift, orbitPosition, progress, squareCenter } from './camera-framing';

describe('3D set camera framing', () => {
  it('puts the squares on the board with White nearest the camera side (+z)', () => {
    expect(squareCenter('a1')).toEqual({ x: -3.5, z: 3.5 });
    expect(squareCenter('h8')).toEqual({ x: 3.5, z: -3.5 });
    expect(squareCenter('e4')).toEqual({ x: 0.5, z: 0.5 });
    expect(() => squareCenter('i9')).toThrow('Not a square');
  });

  it('orbits the target: from White straight above, then round towards the h-file', () => {
    const [x, y, z] = orbitPosition([0, 0, 0], Math.PI / 2, 0, 10);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(10);
    expect(z).toBeCloseTo(0);
    const side = orbitPosition([1, 2, 3], 0, Math.PI / 2, 10);
    expect(side[0]).toBeCloseTo(11);
    expect(side[1]).toBeCloseTo(2);
    expect(side[2]).toBeCloseTo(3);
  });

  it('stands further back when the free band is narrower than the picture is tall', () => {
    const square = fitDistance(5, 30, 800, 800);
    const narrow = fitDistance(5, 30, 400, 800);
    expect(square).toBeCloseTo(5 / Math.sin(Math.PI / 12));
    expect(narrow).toBeGreaterThan(square);
  });

  it('shifts the lens so the middle of the picture lands on the free band', () => {
    expect(lensShift(1000, 500)).toEqual({ fullWidth: 1000, offsetX: 0 });
    // The middle at 300: a picture 1400 wide, of which the canvas shows from 400 on.
    expect(lensShift(1000, 300)).toEqual({ fullWidth: 1400, offsetX: 400 });
    expect(lensShift(1000, 700)).toEqual({ fullWidth: 1400, offsetX: 0 });
  });

  it('times the steps of the entrance', () => {
    expect(progress(0.2, 0.5, 1)).toBe(0);
    expect(progress(1, 0.5, 1)).toBeCloseTo(0.5);
    expect(progress(3, 0.5, 1)).toBe(1);
    expect(easeOutBack(0)).toBeCloseTo(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
  });
});
