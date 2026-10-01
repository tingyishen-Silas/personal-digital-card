import { castleContent } from './data/siteContent.js';

const moduleIds = new Set(['vinyl', 'contact', 'topics', 'about', 'castle']);

export function parseGalleryRoute(hash) {
  const [moduleId, encodedPostId, photo] = hash.replace(/^#\/?/, '').split('/');
  if (!moduleIds.has(moduleId)) return { moduleId: null };
  if (moduleId !== 'castle' || !encodedPostId) return { moduleId };

  let postId;
  try {
    postId = decodeURIComponent(encodedPostId);
  } catch {
    return { moduleId };
  }
  const post = castleContent.posts.find((item) => item.id === postId && !item.draft && item.gallery?.length);
  if (!post) return { moduleId };

  const photoNumber = Number(photo);
  const imageIndex = Number.isInteger(photoNumber)
    ? Math.max(0, Math.min(post.gallery.length - 1, photoNumber - 1))
    : 0;
  return { moduleId, postId, imageIndex };
}

export function formatGalleryHash(route) {
  if (!moduleIds.has(route.moduleId)) return '';
  if (route.moduleId === 'castle' && route.postId) {
    return `#/castle/${encodeURIComponent(route.postId)}/${(route.imageIndex || 0) + 1}`;
  }
  return `#/${route.moduleId}`;
}

export function getSwipeDirection(start, end) {
  const x = end.x - start.x;
  const y = end.y - start.y;
  if (Math.abs(x) < 48 || Math.abs(x) < Math.abs(y) * 1.5) return 0;
  return x < 0 ? 1 : -1;
}
