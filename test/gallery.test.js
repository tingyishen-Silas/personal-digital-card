import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { formatGalleryHash, getSwipeDirection, parseGalleryRoute } from '../src/galleryNavigation.js';
import { aboutContent, castleContent, contactContent, musicList } from '../src/data/siteContent.js';

const post = castleContent.posts.find((item) => !item.draft);

test('all published images and audio are present', () => {
  const assets = [aboutContent.artwork];
  musicList.forEach((track) => assets.push(track.cover, track.audio.mp3));
  castleContent.posts.filter((item) => !item.draft).forEach((item) => {
    if (item.image && item.image !== 'castle') assets.push(item.image);
    item.gallery?.forEach((image) => assets.push(image.src));
  });
  for (const asset of assets) {
    const path = fileURLToPath(new URL(`../public${asset}`, import.meta.url));
    assert.ok(existsSync(path), `Missing asset: ${asset}`);
  }
  assert.ok(existsSync(fileURLToPath(new URL('../src/assets/castle-watercolor.png', import.meta.url))));
});

test('gallery routes survive copying, refreshing and closing', () => {
  const route = { moduleId: 'castle', postId: post.id, imageIndex: 6 };
  assert.deepEqual(parseGalleryRoute(formatGalleryHash(route)), route);
  assert.deepEqual(parseGalleryRoute('#/topics'), { moduleId: 'topics' });
  assert.equal(formatGalleryHash({ moduleId: null }), '');
  assert.deepEqual(parseGalleryRoute('#/unknown'), { moduleId: null });
});

test('invalid albums, drafts and photo numbers cannot break the viewer', () => {
  for (const id of ['missing-post', 'castle-draft-01', '%E0%A4%A']) {
    assert.deepEqual(parseGalleryRoute(`#/castle/${id}/1`), { moduleId: 'castle' });
  }
  assert.equal(parseGalleryRoute(`#/castle/${post.id}/-3`).imageIndex, 0);
  assert.equal(parseGalleryRoute(`#/castle/${post.id}/999`).imageIndex, post.gallery.length - 1);
  assert.equal(parseGalleryRoute(`#/castle/${post.id}/invalid`).imageIndex, 0);
});

test('swipe changes photos only for a deliberate horizontal gesture', () => {
  const start = { x: 200, y: 200 };
  assert.equal(getSwipeDirection(start, { x: 100, y: 208 }), 1);
  assert.equal(getSwipeDirection(start, { x: 300, y: 205 }), -1);
  assert.equal(getSwipeDirection(start, { x: 175, y: 200 }), 0);
  assert.equal(getSwipeDirection(start, { x: 210, y: 400 }), 0);
  assert.equal(getSwipeDirection(start, { x: 120, y: 100 }), 0);
});

test('museum photo order and contact identifiers remain unchanged', () => {
  const sequence = post.gallery.map((image) => image.src.split('/').at(-1).slice(0, 2));
  assert.deepEqual(sequence, ['01', '03', '07', '08', '04', '02', '09', '10', '05', '06', '11', '12', '13']);
  assert.equal(contactContent.address, 'tingyi_shen@163.com');
  assert.equal(contactContent.channels.find((channel) => channel.id === 'social').copyValue, '278704142');
});
