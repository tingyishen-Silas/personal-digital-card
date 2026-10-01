import { useCallback, useEffect, useState } from 'react';
import { formatGalleryHash, parseGalleryRoute } from './galleryNavigation';

export default function useGalleryRoute() {
  const [route, setRoute] = useState(() => parseGalleryRoute(window.location.hash));

  useEffect(() => {
    const syncRoute = () => setRoute(parseGalleryRoute(window.location.hash));
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const navigate = useCallback((nextRoute, replace = false) => {
    const hash = formatGalleryHash(nextRoute);
    if (hash === window.location.hash) return;
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    const parentHash = replace ? window.history.state?.galleryParent : window.location.hash;
    const galleryRoot = replace
      ? window.history.state?.galleryRoot
      : window.location.hash === '' || Boolean(window.history.state?.galleryRoot);
    const galleryDepth = replace
      ? window.history.state?.galleryDepth
      : (window.history.state?.galleryDepth || 0) + 1;
    window.history[replace ? 'replaceState' : 'pushState']({ galleryParent: parentHash, galleryRoot, galleryDepth }, '', url);
    setRoute(parseGalleryRoute(hash));
  }, []);

  const returnTo = useCallback((nextRoute) => {
    // A direct album link has no gallery history to return through.
    if (!nextRoute.moduleId && window.history.state?.galleryRoot && window.history.state?.galleryDepth) {
      window.history.go(-window.history.state.galleryDepth);
    } else if (window.history.state?.galleryParent === formatGalleryHash(nextRoute)) {
      window.history.back();
    } else {
      navigate(nextRoute, true);
    }
  }, [navigate]);

  return { route, navigate, returnTo };
}
