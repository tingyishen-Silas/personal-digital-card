// Proportions and motion for the 3D gramophone. Units are roughly decimetres; y is up and
// the record sits centred on the y axis. Kept free of three.js so it can be unit tested.

export const RECORD_RADIUS = 1.2;
export const LABEL_RADIUS = 0.42;
export const CABINET = { width: 3, height: 1.3, depth: 3, plinth: 0.25 };
export const DECK_HEIGHT = CABINET.plinth + CABINET.height;
export const ARM = { pivot: { x: 1.2, z: -1.15 }, length: 1.62 };
// 33 1/3 rpm, slowed a little so the label stays readable as it turns.
export const PLAYING_SPEED = (33.333 / 60) * Math.PI * 2 * 0.6;

// Angle (radians, in the x-z plane from +x toward +z) at which the tone arm's needle lands
// `radius` from the record centre. Of the two solutions, take the one toward the front (+z).
export function getArmAngleForRadius(radius, pivot = ARM.pivot, length = ARM.length) {
  const distance = Math.hypot(pivot.x, pivot.z);
  // Law of cosines for the angle at the pivot between "toward the centre" and the arm.
  const cosine = (distance ** 2 + length ** 2 - radius ** 2) / (2 * distance * length);
  const spread = Math.acos(Math.max(-1, Math.min(1, cosine)));
  const towardCentre = Math.atan2(-pivot.z, -pivot.x);
  const candidates = [towardCentre + spread, towardCentre - spread];
  const frontness = (angle) => pivot.z + length * Math.sin(angle);
  return frontness(candidates[0]) >= frontness(candidates[1]) ? candidates[0] : candidates[1];
}

export function getNeedlePoint(angle, pivot = ARM.pivot, length = ARM.length) {
  return { x: pivot.x + length * Math.cos(angle), z: pivot.z + length * Math.sin(angle) };
}

export const ARM_REST_ANGLE = getArmAngleForRadius(RECORD_RADIUS + 0.32);
export const ARM_PLAY_ANGLE = getArmAngleForRadius(RECORD_RADIUS - 0.18);

// Exponential flare from a narrow throat to a wide bell, with fluted petals near the bell.
export const HORN = { length: 2.45, throat: 0.11, bell: 1.12, flare: 3.3, petals: 10, flute: 0.028 };

export function getHornRadius(t, theta = 0, horn = HORN) {
  const flare = (Math.exp(horn.flare * t) - 1) / (Math.exp(horn.flare) - 1);
  const radius = horn.throat + (horn.bell - horn.throat) * flare;
  // Sharp seams between petals, like soldered brass panels.
  const petal = 1 - Math.abs(Math.sin((horn.petals * theta) / 2));
  return radius * (1 + horn.flute * t ** 2 * (petal - 0.5));
}

// How far the needle has travelled across the record for a given playback fraction.
export function getGrooveRadius(progress) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return RECORD_RADIUS - 0.18 - clamped * (RECORD_RADIUS - 0.18 - (LABEL_RADIUS + 0.12));
}
