/**
 * Motion for the sliding glass lenses (SegmentedControl, the key-figures
 * table). Each edge of a lens is transitioned on its own. An edge travelling
 * through open space springs: it overshoots a little and settles back. An edge
 * arriving at the outer wall of its track settles without overshoot, so the
 * lens squashes against the wall instead of sailing past it.
 */
const LENS_SPRING = 'cubic-bezier(0.3, 1.35, 0.5, 1)';
// LENS_SPRING sampled and clamped at 1 (it first reaches 1 at 41.5%), so both
// edges travel together until the wall edge stops dead.
const LENS_SETTLE =
  'linear(0, 0.213 5%, 0.401 10%, 0.562 15%, 0.696 20%, 0.804 25%, 0.887 30%, 0.948 35%, 0.991 40%, 1 41.5%, 1)';
const LENS_DURATION = '420ms';

type Edge = 'left' | 'right' | 'top' | 'bottom';

export function lensEdgeTransition(edge: Edge, atWall: boolean): string {
  return `${edge} ${LENS_DURATION} ${atWall ? LENS_SETTLE : LENS_SPRING}`;
}

/** The lens fading and scaling in or out where it stands. */
export const LENS_APPEAR_TRANSITION = `opacity 200ms ease, transform ${LENS_DURATION} ${LENS_SPRING}`;
