export const PAN_STEP = 0.5;
const PANNABLE_VISIBLE_RATIO = 0.8;
const DRAG_THRESHOLD = 10;

export function clampScenePosition(value) {
  return Math.max(0, Math.min(1, value));
}

// Pan whenever the cover crop hides more than a fifth of the painting,
// so tablets in portrait can still reach the gramophone and the easel.
export function isScenePannable(viewportWidth, renderWidth) {
  return renderWidth > 0 && viewportWidth / renderWidth < PANNABLE_VISIBLE_RATIO;
}

// Phones start on the gramophone ("先放首歌"); wider screens start centred.
export function getInitialScenePosition(viewportWidth) {
  return viewportWidth <= 600 ? 0 : 0.5;
}

export function getDraggedScenePosition(startPosition, deltaX, overflowWidth) {
  if (overflowWidth <= 0) return startPosition;
  return clampScenePosition(startPosition - deltaX / overflowWidth);
}

export function isHorizontalDrag(deltaX, deltaY) {
  return Math.abs(deltaX) >= DRAG_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY);
}
