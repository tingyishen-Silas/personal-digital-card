// Geometry for the paper-theatre diorama. Kept free of three.js so it can be unit tested.
//
// The painting becomes one sheet pushed back by its depth map into a few flat terraces, like
// cards in a paper theatre. The camera starts at the origin looking down -z, and every point
// moves along its own line of sight, so from that pose the sheet is exactly the flat painting;
// depth only shows once the camera turns.

export const REFERENCE_DISTANCE = 10;
export const FIELD_OF_VIEW = 35;
export const MAX_YAW = 12;
export const MAX_PITCH = 6;
export const SEPARATION = 0.5;
export const STILL_DEPTH = 0.4;
export const DIORAMA_START = { yaw: 7, pitch: -2 };

// Valleys in the painting's depth histogram split it into far garden | hedges and walls |
// easel and mailbox | tables; each card sits at the average depth of its band.
export const TERRACES = [
  { start: 0, depth: 0.066 },
  { start: 0.18, depth: 0.274 },
  { start: 0.38, depth: 0.45 },
  { start: 0.5, depth: 0.707 },
];
export const TERRACE_SOFTNESS = 0.012;
export const TERRACE_RELIEF = 0.15;

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const smoothstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// Same formula as the vertex shader: flat cards with a hint of the original relief.
export function getTerraceDepth(depth) {
  let level = TERRACES[0].depth;
  for (let index = 1; index < TERRACES.length; index += 1) {
    const { start, depth: next } = TERRACES[index];
    level += (next - TERRACES[index - 1].depth) * smoothstep(start - TERRACE_SOFTNESS, start + TERRACE_SOFTNESS, depth);
  }
  return level + TERRACE_RELIEF * (depth - level);
}

export function clampOrbit({ yaw, pitch }) {
  return {
    yaw: Math.max(-MAX_YAW, Math.min(MAX_YAW, yaw)),
    pitch: Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch)),
  };
}

// Near cards (depth -> 1) come toward the camera, far ones (depth -> 0) recede.
export function getLayerDistance(depth, spread) {
  return REFERENCE_DISTANCE * (1 + SEPARATION * spread * (STILL_DEPTH - depth));
}

// Where the painting sits at the reference distance so the camera sees the same "cover"
// crop as the flat page (including the phone pan position).
export function getFlatFraming(viewport, cover) {
  const visibleHeight = 2 * REFERENCE_DISTANCE * Math.tan(toRadians(FIELD_OF_VIEW / 2));
  const visibleWidth = visibleHeight * (viewport.width / viewport.height);
  return {
    width: visibleWidth * (cover.renderWidth / viewport.width),
    height: visibleHeight * (cover.renderHeight / viewport.height),
    x: ((cover.offsetX + cover.renderWidth / 2) / viewport.width - 0.5) * visibleWidth,
    y: (0.5 - (cover.offsetY + cover.renderHeight / 2) / viewport.height) * visibleHeight,
  };
}

// A point of the painting (u, v from its top-left) pushed back to `distance` along its line of sight.
export function getPaintingPoint(framing, u, v, distance) {
  const scale = distance / REFERENCE_DISTANCE;
  return {
    x: (framing.x + (u - 0.5) * framing.width) * scale,
    y: (framing.y + (0.5 - v) * framing.height) * scale,
    z: -distance,
  };
}

// Orbit around the painting's centre at the reference distance. Returns the camera
// position and the yaw/pitch to apply (in that order) to its default orientation.
export function getCameraPose(framing, { yaw, pitch }) {
  const pivot = { x: framing.x, y: framing.y, z: -REFERENCE_DISTANCE };
  const offset = { x: -pivot.x, y: -pivot.y, z: REFERENCE_DISTANCE };
  const yawRad = toRadians(yaw);
  const pitchRad = toRadians(pitch);
  // Pitch about x, then yaw about y.
  const y1 = offset.y * Math.cos(pitchRad) - offset.z * Math.sin(pitchRad);
  const z1 = offset.y * Math.sin(pitchRad) + offset.z * Math.cos(pitchRad);
  const x2 = offset.x * Math.cos(yawRad) + z1 * Math.sin(yawRad);
  const z2 = -offset.x * Math.sin(yawRad) + z1 * Math.cos(yawRad);
  return {
    position: { x: pivot.x + x2, y: pivot.y + y1, z: pivot.z + z2 },
    rotation: { yaw: yawRad, pitch: pitchRad },
  };
}

// Drag distance in pixels to orbit degrees; a full-width drag turns about 36 degrees.
// Like turning a model in your hands: drag right and the scene turns right.
export function getOrbitFromDrag(start, deltaX, deltaY, viewport) {
  return clampOrbit({
    yaw: start.yaw - (deltaX / viewport.width) * 36,
    pitch: start.pitch - (deltaY / viewport.height) * 18,
  });
}
