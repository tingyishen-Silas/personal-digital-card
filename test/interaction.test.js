import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { getTrackMetadata } from '../src/mediaSession.js';
import { musicList } from '../src/data/siteContent.js';
import {
  PAN_STEP,
  clampScenePosition,
  getDraggedScenePosition,
  getInitialScenePosition,
  isHorizontalDrag,
  isScenePannable,
} from '../src/scenePan.js';

// The painting is 1920 x 1080; cover width = 1920 * max(w / 1920, h / 1080).
const coverWidth = (width, height) => 1920 * Math.max(width / 1920, height / 1080);

test('phones and portrait tablets can pan the painting, wide screens cannot', () => {
  assert.equal(isScenePannable(390, coverWidth(390, 664)), true);
  assert.equal(isScenePannable(768, coverWidth(768, 1024)), true);
  assert.equal(isScenePannable(1440, coverWidth(1440, 900)), false);
  assert.equal(isScenePannable(1366, coverWidth(1366, 768)), false);
  assert.equal(isScenePannable(844, coverWidth(844, 390)), false);
});

test('phones start on the gramophone and wider screens start centred', () => {
  assert.equal(getInitialScenePosition(390), 0);
  assert.equal(getInitialScenePosition(768), 0.5);
  assert.equal(clampScenePosition(0 - PAN_STEP), 0);
  assert.equal(clampScenePosition(1 + PAN_STEP), 1);
});

test('dragging follows the finger and stops at the painting edges', () => {
  // Finger moves left by 100px over 400px of hidden painting: reveal more of the right side.
  assert.equal(getDraggedScenePosition(0.5, -100, 400), 0.75);
  assert.equal(getDraggedScenePosition(0.5, 100, 400), 0.25);
  assert.equal(getDraggedScenePosition(0.1, 400, 400), 0);
  assert.equal(getDraggedScenePosition(0.9, -400, 400), 1);
  assert.equal(getDraggedScenePosition(0.4, -100, 0), 0.4);
});

test('only a deliberate horizontal drag pans; taps still open objects', () => {
  assert.equal(isHorizontalDrag(4, 1), false);
  assert.equal(isHorizontalDrag(-24, 6), true);
  assert.equal(isHorizontalDrag(14, 30), false);
});

test('lock-screen metadata uses the real title, artist and an absolute cover URL', () => {
  const base = 'https://tingyishen-silas.github.io/personal-digital-card/#/vinyl';
  for (const track of musicList) {
    const metadata = getTrackMetadata(track, base);
    assert.equal(metadata.title, track.title);
    assert.equal(metadata.artist, track.artist);
    assert.match(metadata.artwork[0].src, /^https:\/\/tingyishen-silas\.github\.io\/.*cover-0\d\.jpg$/);
  }
});

test('living painting eases smoothly and tilts the right way', async () => {
  const { approach, getParallaxShift } = await import('../src/livingPainting.js');
  // Frame-rate independent: two half steps land where one full step does.
  const oneStep = approach(0, 1, 3, 0.1);
  const twoSteps = approach(approach(0, 1, 3, 0.05), 1, 3, 0.05);
  assert.ok(Math.abs(oneStep - twoSteps) < 1e-9);
  assert.equal(approach(0.4, 0.4, 3, 1), 0.4);
  // Centre is still; looking from the right moves the near tables left.
  assert.deepEqual(getParallaxShift(0.5, 0.5, 0.02), { x: -0, y: -0 });
  assert.ok(getParallaxShift(1, 0.5, 0.02).x < 0);
  assert.ok(Math.abs(getParallaxShift(1, 1, 0.02).y) < Math.abs(getParallaxShift(1, 1, 0.02).x));
  // The depth map, linen and gramophone textures ship with the site.
  for (const asset of ['scene-depth.jpg', 'canvas-linen-normal.jpg', 'gramophone/studio.hdr', 'gramophone/wood-color.jpg', 'gramophone/wood-roughness.jpg']) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public/${asset}`, import.meta.url))), `Missing ${asset}`);
  }
});

test('diorama starts as the flat painting and turns the way you drag', async () => {
  const {
    REFERENCE_DISTANCE, TERRACES, clampOrbit, getCameraPose, getFlatFraming, getLayerDistance,
    getOrbitFromDrag, getPaintingPoint, getTerraceDepth,
  } = await import('../src/diorama.js');
  const viewport = { width: 1440, height: 900 };
  const cover = { offsetX: 0, offsetY: -0.5, renderWidth: 1440, renderHeight: 810 * (900 / 810) };
  const framing = getFlatFraming(viewport, cover);
  // Every card moves along its own line of sight, so from the start pose nothing shifts on screen.
  for (const depth of [0, 0.3, 0.7, 1]) {
    const near = getPaintingPoint(framing, 0.2, 0.7, getLayerDistance(depth, 1));
    const flat = getPaintingPoint(framing, 0.2, 0.7, REFERENCE_DISTANCE);
    assert.ok(Math.abs(near.x / near.z - flat.x / flat.z) < 1e-9);
    assert.ok(Math.abs(near.y / near.z - flat.y / flat.z) < 1e-9);
  }
  // Near objects come forward, far ones recede, and a closed diorama is flat.
  assert.ok(getLayerDistance(0.9, 1) < REFERENCE_DISTANCE && getLayerDistance(0.05, 1) > REFERENCE_DISTANCE);
  assert.equal(getLayerDistance(0.9, 0), REFERENCE_DISTANCE);
  const pose = getCameraPose(framing, { yaw: 0, pitch: 0 });
  assert.ok(Math.hypot(pose.position.x, pose.position.y, pose.position.z) < 1e-9);
  // Terraces are flat steps that never run backwards.
  let previous = -Infinity;
  for (let depth = 0; depth <= 1; depth += 0.01) {
    const level = getTerraceDepth(depth);
    assert.ok(level >= previous - 1e-9);
    previous = level;
  }
  assert.ok(Math.abs(getTerraceDepth(0.75) - TERRACES[3].depth) < 0.03);
  // Drag right: the scene turns right (camera swings left); limits hold.
  assert.ok(getOrbitFromDrag({ yaw: 0, pitch: 0 }, 200, 0, viewport).yaw < 0);
  assert.deepEqual(clampOrbit({ yaw: 99, pitch: -99 }), clampOrbit({ yaw: 12, pitch: -6 }));
});

test('gramophone tone arm lands on the record and tracks inward as the song plays', async () => {
  const {
    ARM_PLAY_ANGLE, ARM_REST_ANGLE, HORN, LABEL_RADIUS, RECORD_RADIUS,
    getArmAngleForRadius, getGrooveRadius, getHornRadius, getNeedlePoint,
  } = await import('../src/gramophone.js');
  const needleRadius = (angle) => Math.hypot(getNeedlePoint(angle).x, getNeedlePoint(angle).z);
  assert.ok(needleRadius(ARM_REST_ANGLE) > RECORD_RADIUS, 'resting arm is off the record');
  assert.ok(needleRadius(ARM_PLAY_ANGLE) < RECORD_RADIUS, 'playing arm is on the record');
  for (const progress of [0, 0.25, 0.5, 1]) {
    const radius = getGrooveRadius(progress);
    assert.ok(Math.abs(needleRadius(getArmAngleForRadius(radius)) - radius) < 1e-6);
    assert.ok(radius > LABEL_RADIUS && radius < RECORD_RADIUS);
  }
  assert.ok(getGrooveRadius(0.8) < getGrooveRadius(0.2));
  assert.equal(getGrooveRadius(Number.NaN), getGrooveRadius(0));
  // The horn only ever widens, from throat to bell.
  let previous = 0;
  for (let t = 0; t <= 1; t += 0.05) {
    const radius = getHornRadius(t, 0.3);
    assert.ok(radius > previous);
    previous = radius;
  }
  assert.ok(Math.abs(getHornRadius(1, Math.PI / HORN.petals) - HORN.bell) < HORN.bell * HORN.flute);
});
