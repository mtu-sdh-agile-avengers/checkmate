import { act } from '@testing-library/react';

/** jsdom has no PointerEvent: a mouse event that also carries a pointer id stands in for it. */
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType = 'mouse';

  constructor(type: string, init: MouseEventInit & { pointerId?: number }) {
    super(type, { bubbles: true, cancelable: true, composed: true, ...init });
    this.pointerId = init.pointerId ?? 1;
  }
}

type PointerType = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel';

/**
 * Fires a pointer event on `target`. `buttons` is what a browser reports: the main button held
 * while the pointer is down and moving, none once it is up; a move with `buttons: 0` is a hover.
 */
export function pointer(
  target: Element,
  type: PointerType,
  x: number,
  y: number,
  {
    button = 0,
    pointerId = 1,
    buttons = type === 'pointerdown' || type === 'pointermove' ? 1 : 0,
  }: { button?: number; pointerId?: number; buttons?: number } = {},
) {
  act(() => {
    target.dispatchEvent(new TestPointerEvent(type, { clientX: x, clientY: y, button, buttons, pointerId }));
  });
}

/** What `document.elementFromPoint` finds under the pointer (jsdom lays nothing out): `element`. */
export function stubHitTest(element: Element | null) {
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => element });
}

/** Drags with a pointer from one element to another: press, move past the drag threshold, let go over `to`. */
export function dragPiece(from: Element, to: Element) {
  stubHitTest(to);
  pointer(from, 'pointerdown', 100, 100);
  pointer(from, 'pointermove', 130, 40);
  pointer(from, 'pointerup', 130, 40);
}
