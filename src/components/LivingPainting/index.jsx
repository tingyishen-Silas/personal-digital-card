import { useEffect, useRef, useState } from 'react';
import { assetPath } from '../../assetPath';
import {
  approach,
  createDepthSampler,
  createPaintingRenderer,
  getParallaxShift,
} from '../../livingPainting';

const DEPTH_SRC = assetPath('/scene-depth.jpg');
const LINEN_SRC = assetPath('/canvas-linen-normal.jpg');
const PARALLAX_STRENGTH = 0.018;
const IDLE_AFTER = 2500;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// Renders the coloured painting with depth and light once it is coloured. Everything
// else on the page keeps working with the plain <img> underneath if WebGL is missing.
function LivingPainting({ active, paused, imageRef, getLayout, focusRect, hotspotLayerRef, onDepthReady }) {
  const canvasRef = useRef(null);
  const pausedRef = useRef(paused);
  const focusRef = useRef(focusRect);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    focusRef.current = focusRect;
  }, [focusRect, paused]);

  useEffect(() => {
    if (!active) return undefined;

    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let renderer = null;
    let frameId = 0;
    let disposed = false;
    let lastFrame = performance.now();
    let lastActivity = lastFrame;
    let frameCount = 0;
    let lastSpot = { left: 0, top: 0, width: 0, height: 0 };

    const pointer = { x: 0.5, y: 0.42, hasPointer: false };
    const tilt = { x: 0.5, y: 0.42 };
    const orientation = { x: null, y: null, baseGamma: null, baseBeta: null };
    const light = { x: 0, y: 0, strength: 0, ready: false };
    let spotAmount = 0;

    const handlePointerMove = (event) => {
      if (event.pointerType !== 'mouse' && !event.isPrimary) return;
      pointer.x = event.clientX / window.innerWidth;
      pointer.y = event.clientY / window.innerHeight;
      pointer.hasPointer = true;
      lastActivity = performance.now();
    };
    const handlePointerLeave = () => {
      pointer.hasPointer = false;
    };
    // Android reports tilt without a permission prompt; iOS needs one, so it keeps the idle drift.
    const handleOrientation = (event) => {
      if (event.gamma == null || event.beta == null) return;
      if (orientation.baseGamma === null) {
        orientation.baseGamma = event.gamma;
        orientation.baseBeta = event.beta;
      }
      orientation.x = Math.max(0, Math.min(1, 0.5 + (event.gamma - orientation.baseGamma) / 40));
      orientation.y = Math.max(0, Math.min(1, 0.42 + (event.beta - orientation.baseBeta) / 60));
      lastActivity = performance.now();
    };

    const tick = (now) => {
      frameId = window.requestAnimationFrame(tick);
      if (pausedRef.current || !renderer) return;
      if (renderer.isLost()) {
        setIsVisible(false);
        return;
      }

      // Idle: about 20 fps is plenty for slow dust and drift.
      frameCount += 1;
      const isIdle = now - lastActivity > IDLE_AFTER && !focusRef.current && spotAmount < 0.01;
      if (isIdle && frameCount % 3 !== 0) return;

      const delta = Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      const time = now / 1000;
      const layout = getLayout();
      if (!layout) return;
      const { width, height, cover } = layout;

      let targetX = 0.5;
      let targetY = 0.42;
      if (orientation.x !== null) {
        targetX = orientation.x;
        targetY = orientation.y;
      } else if (finePointer && pointer.hasPointer) {
        targetX = pointer.x;
        targetY = pointer.y;
      } else if (!finePointer && !reducedMotion) {
        targetX = 0.5 + Math.sin(time * 0.31) * 0.32;
        targetY = 0.42 + Math.sin(time * 0.19) * 0.18;
      }
      tilt.x = approach(tilt.x, targetX, 3.2, delta);
      tilt.y = approach(tilt.y, targetY, 3.2, delta);
      const shift = reducedMotion ? { x: 0, y: 0 } : getParallaxShift(tilt.x, tilt.y, PARALLAX_STRENGTH);

      // The lamp follows the cursor; on touch screens it wanders like late-afternoon sun.
      const lampX = (finePointer && pointer.hasPointer ? pointer.x : tilt.x) * width;
      const lampY = (finePointer && pointer.hasPointer ? pointer.y : tilt.y * 0.8) * height;
      if (!light.ready) {
        light.x = lampX;
        light.y = lampY;
        light.ready = true;
      }
      light.x = approach(light.x, lampX, 6, delta);
      light.y = approach(light.y, lampY, 6, delta);
      light.strength = approach(light.strength, 1, 1.4, delta);

      const focus = focusRef.current;
      if (focus) lastSpot = focus;
      spotAmount = approach(spotAmount, focus ? 1 : 0, focus ? 5 : 3.5, delta);

      renderer.render({
        width,
        height,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        cover,
        shift,
        light,
        spot: lastSpot,
        spotAmount,
        time,
        dust: reducedMotion ? 0 : 1,
      });

      // Hotspot buttons ride along: each multiplies these by its own depth offset.
      const layer = hotspotLayerRef.current;
      if (layer) {
        layer.style.setProperty('--parallax-x', `${shift.x * cover.renderWidth}px`);
        layer.style.setProperty('--parallax-y', `${shift.y * cover.renderHeight}px`);
      }
    };

    Promise.all([loadImage(DEPTH_SRC), loadImage(LINEN_SRC)]).then(([depth, linen]) => {
      if (disposed || !imageRef.current?.naturalWidth) return;
      renderer = createPaintingRenderer(canvas, { painting: imageRef.current, depth, linen });
      if (!renderer) return;
      onDepthReady?.(createDepthSampler(depth));
      frameId = window.requestAnimationFrame((now) => {
        tick(now);
        setIsVisible(true);
      });
    }).catch(() => {
      // Missing textures: the painting simply stays as it is.
    });

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);
    if (!finePointer && typeof window.DeviceOrientationEvent?.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('deviceorientation', handleOrientation);
      hotspotLayerRef.current?.style.removeProperty('--parallax-x');
      hotspotLayerRef.current?.style.removeProperty('--parallax-y');
      renderer?.dispose();
      setIsVisible(false);
    };
  }, [active, getLayout, hotspotLayerRef, imageRef, onDepthReady]);

  return (
    <canvas
      ref={canvasRef}
      className={`living-painting absolute inset-0 h-full w-full ${active && isVisible ? 'is-visible' : ''}`}
      aria-hidden="true"
    />
  );
}

export default LivingPainting;
