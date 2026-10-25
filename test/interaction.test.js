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
  // The depth map and linen normal map ship with the site.
  for (const asset of ['scene-depth.jpg', 'canvas-linen-normal.jpg']) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public/${asset}`, import.meta.url))), `Missing ${asset}`);
  }
});
