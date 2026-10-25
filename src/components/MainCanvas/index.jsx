import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Castle,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Disc3,
  Mail,
  Image as ImageIcon,
  Paintbrush,
  Palette,
  Rotate3d,
  UserRound,
} from 'lucide-react';
import { assetPath } from '../../assetPath';
import { readStorage, writeStorage } from '../../storage';
import {
  PAN_STEP,
  clampScenePosition,
  getDraggedScenePosition,
  getInitialScenePosition,
  isHorizontalDrag,
  isScenePannable,
} from '../../scenePan';
import { DIORAMA_START, clampOrbit, getOrbitFromDrag } from '../../diorama';
import { FOCUS_DEPTH } from '../../livingPainting';
import LivingPainting from '../LivingPainting';
import MiniPlayer from '../MiniPlayer';

// three.js and the layer images only load when someone opens the diorama.
const DioramaView = lazy(() => import('../DioramaView'));

function supportsWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

const SCENE_SOURCES = [assetPath('/scene-optimized.jpg')];
const SCRATCH_THRESHOLD = 0.6;
const BRUSH_SIZE = 100;
const REVEAL_LABELS_DURATION = 3200;

const hotspots = [
  { id: 'vinyl', label: '先放首歌', target: '留声机', icon: Disc3, bounds: { x1: 3, x2: 24, y1: 30, y2: 82 } },
  { id: 'contact', label: '写信给我', target: '红色信箱', icon: Mail, bounds: { x1: 34, x2: 44, y1: 32, y2: 66 } },
  { id: 'topics', label: '最近在想', target: '咖啡桌', icon: Coffee, bounds: { x1: 45, x2: 80, y1: 72, y2: 98 } },
  { id: 'about', label: '关于 Silas', target: '画架', icon: UserRound, bounds: { x1: 71, x2: 92, y1: 22, y2: 72 } },
  { id: 'castle', label: '一些记忆', target: '城堡', icon: Castle, bounds: { x1: 56, x2: 78, y1: 1, y2: 22 } },
];

function getCoverGeometry(containerWidth, containerHeight, imageWidth, imageHeight, position = 0.5) {
  const scale = Math.max(containerWidth / imageWidth, containerHeight / imageHeight);
  const renderWidth = imageWidth * scale;
  const renderHeight = imageHeight * scale;
  const offsetX = (containerWidth - renderWidth) * position;
  const offsetY = (containerHeight - renderHeight) / 2;

  return {
    scale,
    renderWidth,
    renderHeight,
    offsetX,
    offsetY,
  };
}

function MainCanvas({ activeModule, isInactive, isMusicPlaying = false, player, onOpenModule, onSceneReady }) {
  const shellRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const hasVisitedRef = useRef(
    readStorage('sessionStorage', 'silas-gallery-visited') === 'true'
    || readStorage('localStorage', 'silas-gallery-colored') === 'true',
  );
  const hasCompletedRef = useRef(hasVisitedRef.current);
  const progressCheckRef = useRef(0);
  const scratchPointsRef = useRef([]);
  const hasReportedSceneReadyRef = useRef(false);
  const coverRef = useRef(null);
  const scenePositionRef = useRef(null);
  const panTweenRef = useRef(null);
  const panDragRef = useRef(null);
  const panFrameRef = useRef(0);
  const suppressClickRef = useRef(false);
  const hotspotLayerRef = useRef(null);
  const orbitRef = useRef({ ...DIORAMA_START });
  const dioramaWakeRef = useRef(null);

  const [sceneSrcIndex, setSceneSrcIndex] = useState(0);
  const [imageMeta, setImageMeta] = useState(null);
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const [isComplete, setIsComplete] = useState(() => hasVisitedRef.current);
  const [isExploreReady, setIsExploreReady] = useState(() => hasVisitedRef.current);
  const [isRevealingLabels, setIsRevealingLabels] = useState(false);
  const [hasScratched, setHasScratched] = useState(false);
  const [hotspotRects, setHotspotRects] = useState([]);
  const [hoveredModule, setHoveredModule] = useState(null);
  const [hintedModule, setHintedModule] = useState(null);
  const [visitedModules, setVisitedModules] = useState(() => new Set());
  const [scenePosition, setScenePosition] = useState(0.5);
  const [canPanScene, setCanPanScene] = useState(false);
  const [hotspotDepths, setHotspotDepths] = useState({});
  const [isDioramaMounted, setIsDioramaMounted] = useState(false);
  const [isDioramaOpen, setIsDioramaOpen] = useState(false);
  const [isDioramaReady, setIsDioramaReady] = useState(false);
  const [canShowDiorama] = useState(supportsWebGL2);
  const [isDioramaHinted, setIsDioramaHinted] = useState(false);
  const [showOrbitCaption, setShowOrbitCaption] = useState(false);

  const sceneSrc = SCENE_SOURCES[sceneSrcIndex];
  const debugMode = useMemo(() => new URLSearchParams(window.location.search).get('debug') === '1', []);

  const reportSceneReady = useCallback(() => {
    if (hasReportedSceneReadyRef.current) return;
    hasReportedSceneReadyRef.current = true;
    onSceneReady?.();
  }, [onSceneReady]);

  // Positions the painting and its hotspots; cheap enough to run on every pan frame.
  const layoutScene = useCallback(() => {
    const image = imageRef.current;
    const shell = shellRef.current;
    if (!image || !shell || !image.naturalWidth) return null;

    const width = shell.clientWidth;
    const height = shell.clientHeight;
    const centred = getCoverGeometry(width, height, image.naturalWidth, image.naturalHeight, 0.5);
    const isPannable = isScenePannable(width, centred.renderWidth);
    if (!isPannable) scenePositionRef.current = null;
    else if (scenePositionRef.current === null) scenePositionRef.current = getInitialScenePosition(width);

    const position = isPannable ? scenePositionRef.current : 0.5;
    const cover = isPannable
      ? getCoverGeometry(width, height, image.naturalWidth, image.naturalHeight, position)
      : centred;
    coverRef.current = cover;
    setCanPanScene(isPannable);
    setScenePosition(position);
    image.style.objectPosition = `${position * 100}% 50%`;

    setHotspotRects(hotspots.map((hotspot) => {
      const rect = {
        left: cover.offsetX + (hotspot.bounds.x1 / 100) * cover.renderWidth,
        top: cover.offsetY + (hotspot.bounds.y1 / 100) * cover.renderHeight,
        width: ((hotspot.bounds.x2 - hotspot.bounds.x1) / 100) * cover.renderWidth,
        height: ((hotspot.bounds.y2 - hotspot.bounds.y1) / 100) * cover.renderHeight,
      };
      const centre = rect.left + rect.width / 2;
      return { ...hotspot, rect, isCentreOnScreen: centre > 72 && centre < width - 72 };
    }));
    dioramaWakeRef.current?.();

    return { cover, width, height };
  }, []);

  const getLayout = useCallback(() => {
    const shell = shellRef.current;
    if (!shell || !coverRef.current) return null;
    return { width: shell.clientWidth, height: shell.clientHeight, cover: coverRef.current };
  }, []);

  // How far in front of / behind the still plane each object sits, so its hotspot moves with it.
  // The 75th percentile of depth inside each object's box: the object itself, not the wall behind it.
  const handleDepthReady = useCallback((depthAt) => {
    setHotspotDepths(Object.fromEntries(hotspots.map(({ id, bounds }) => {
      const samples = [];
      for (let row = 0; row < 7; row += 1) {
        for (let column = 0; column < 7; column += 1) {
          const u = (bounds.x1 + (bounds.x2 - bounds.x1) * (0.1 + column * (0.8 / 6))) / 100;
          const v = (bounds.y1 + (bounds.y2 - bounds.y1) * (0.1 + row * (0.8 / 6))) / 100;
          samples.push(depthAt(u, v));
        }
      }
      samples.sort((a, b) => a - b);
      return [id, samples[Math.floor(samples.length * 0.75)] - FOCUS_DEPTH];
    })));
  }, []);

  const openDiorama = () => {
    orbitRef.current = { ...DIORAMA_START };
    setIsRevealingLabels(false);
    setIsDioramaMounted(true);
    setIsDioramaOpen(true);
  };
  const closeDiorama = useCallback(() => setIsDioramaOpen(false), []);
  const handleDioramaReady = useCallback(() => setIsDioramaReady(true), []);
  const handleDioramaClosed = useCallback(() => {
    setIsDioramaMounted(false);
    setIsDioramaReady(false);
  }, []);
  const handleDioramaError = useCallback(() => {
    setIsDioramaOpen(false);
    setIsDioramaMounted(false);
    setIsDioramaReady(false);
  }, []);
  const dioramaHotspots = useMemo(() => hotspots.map(({ id, bounds }) => ({
    id,
    bounds,
    depth: (hotspotDepths[id] ?? 0) + FOCUS_DEPTH,
  })), [hotspotDepths]);
  // Written straight to the DOM every rendered frame; React state would re-render the scene at 60 fps.
  const projectHotspots = useCallback((rects) => {
    const layer = hotspotLayerRef.current;
    if (!layer) return;
    Object.entries(rects).forEach(([id, rect]) => {
      const button = layer.querySelector(`[data-hotspot-id="${id}"]`);
      if (!button) return;
      button.style.setProperty('--dio-left', `${rect.left}px`);
      button.style.setProperty('--dio-top', `${rect.top}px`);
      button.style.setProperty('--dio-width', `${rect.width}px`);
      button.style.setProperty('--dio-height', `${rect.height}px`);
    });
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const layout = layoutScene();
    if (!layout) return;

    const { cover, width, height } = layout;
    const image = imageRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!hasCompletedRef.current) {
      context.drawImage(image, cover.offsetX, cover.offsetY, cover.renderWidth, cover.renderHeight);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = pixels.data;

      for (let index = 0; index < data.length; index += 4) {
        const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
        const contrasted = (gray - 128) * 1.2 + 128;
        const brightened = contrasted * 1.1 + 10;
        const noise = (Math.random() - 0.5) * 18;
        const value = Math.max(0, Math.min(255, brightened + noise));
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
        data[index + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
    }

    if (!hasCompletedRef.current && scratchPointsRef.current.length > 0) {
      context.save();
      context.globalCompositeOperation = 'destination-out';
      scratchPointsRef.current.forEach((point) => {
        const gradient = context.createRadialGradient(
          cover.offsetX + point.x * cover.renderWidth,
          cover.offsetY + point.y * cover.renderHeight,
          BRUSH_SIZE * 0.1,
          cover.offsetX + point.x * cover.renderWidth,
          cover.offsetY + point.y * cover.renderHeight,
          BRUSH_SIZE * 0.58,
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0.98)');
        gradient.addColorStop(0.68, 'rgba(0,0,0,0.82)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(cover.offsetX + point.x * cover.renderWidth, cover.offsetY + point.y * cover.renderHeight, BRUSH_SIZE * 0.58, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();
    }

    if (hasCompletedRef.current) {
      context.clearRect(0, 0, width, height);
    }
  }, [layoutScene]);

  const completeColoring = useCallback((animate = true) => {
    if (hasCompletedRef.current) return;

    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;

    hasCompletedRef.current = true;
    writeStorage('sessionStorage', 'silas-gallery-visited', 'true');
    writeStorage('localStorage', 'silas-gallery-colored', 'true');
    isDrawingRef.current = false;
    setIsComplete(true);

    const context = canvas.getContext('2d');
    const radius = Math.hypot(shell.clientWidth, shell.clientHeight);

    if (!animate) {
      context.clearRect(0, 0, shell.clientWidth, shell.clientHeight);
      setIsExploreReady(true);
      return;
    }

    gsap.to({ value: 0 }, {
      value: radius,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate() {
        const currentRadius = this.targets()[0].value;
        context.save();
        context.globalCompositeOperation = 'destination-out';
        const gradient = context.createRadialGradient(
          shell.clientWidth / 2,
          shell.clientHeight / 2,
          Math.max(0, currentRadius - 220),
          shell.clientWidth / 2,
          shell.clientHeight / 2,
          currentRadius,
        );
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, shell.clientWidth, shell.clientHeight);
        context.restore();
      },
      onComplete() {
        context.clearRect(0, 0, shell.clientWidth, shell.clientHeight);
        setIsExploreReady(true);
        // Name each object once, right after the painting comes alive (touch screens have no hover).
        setIsRevealingLabels(true);
      },
    });
  }, []);

  const resetColoring = useCallback(() => {
    hasCompletedRef.current = false;
    scratchPointsRef.current = [];
    writeStorage('sessionStorage', 'silas-gallery-visited', null);
    writeStorage('localStorage', 'silas-gallery-colored', null);
    setHasScratched(false);
    setIsComplete(false);
    setIsExploreReady(false);
    setIsRevealingLabels(false);
    setIsDioramaOpen(false);
    setIsDioramaMounted(false);
    setIsDioramaReady(false);
    panTweenRef.current?.kill();
    window.requestAnimationFrame(resizeCanvas);
  }, [resizeCanvas]);

  const panScene = (direction) => {
    const from = scenePositionRef.current ?? 0.5;
    const to = clampScenePosition(from + direction * PAN_STEP);
    panTweenRef.current?.kill();

    // The grey layer is redrawn per frame before colouring, so only glide once it is gone.
    if (!hasCompletedRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scenePositionRef.current = to;
      window.requestAnimationFrame(hasCompletedRef.current ? layoutScene : resizeCanvas);
      return;
    }

    const proxy = { value: from };
    panTweenRef.current = gsap.to(proxy, {
      value: to,
      duration: 0.5,
      ease: 'power2.inOut',
      onUpdate() {
        scenePositionRef.current = proxy.value;
        layoutScene();
      },
    });
  };

  // After colouring, a horizontal drag on the painting pans it (phones and portrait tablets).
  const isOrbiting = isDioramaMounted && isDioramaOpen;

  const handleScenePointerDown = (event) => {
    if (!hasCompletedRef.current || activeModule || !event.isPrimary) return;
    if (event.target !== canvasRef.current && !event.target.closest('.main-canvas-hotspot')) return;
    if (isOrbiting) {
      panDragRef.current = { mode: 'orbit', pointerId: event.pointerId, x: event.clientX, y: event.clientY, orbit: { ...orbitRef.current }, isDragging: false };
      return;
    }
    if (!canPanScene) return;
    panTweenRef.current?.kill();
    panDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      position: scenePositionRef.current ?? 0.5,
      isDragging: false,
    };
  };

  const handleScenePointerMove = (event) => {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    if (drag.mode === 'orbit') {
      const deltaY = event.clientY - drag.y;
      if (!drag.isDragging) {
        if (Math.hypot(deltaX, deltaY) < 8) return;
        drag.isDragging = true;
        shellRef.current?.setPointerCapture?.(event.pointerId);
      }
      const shell = shellRef.current;
      orbitRef.current = getOrbitFromDrag(drag.orbit, deltaX, deltaY, { width: shell.clientWidth, height: shell.clientHeight });
      dioramaWakeRef.current?.();
      return;
    }
    if (!drag.isDragging) {
      if (!isHorizontalDrag(deltaX, event.clientY - drag.y)) return;
      drag.isDragging = true;
      shellRef.current?.setPointerCapture?.(event.pointerId);
    }

    const overflow = (coverRef.current?.renderWidth || 0) - (shellRef.current?.clientWidth || 0);
    scenePositionRef.current = getDraggedScenePosition(drag.position, deltaX, overflow);
    if (!panFrameRef.current) {
      panFrameRef.current = window.requestAnimationFrame(() => {
        panFrameRef.current = 0;
        layoutScene();
      });
    }
  };

  const handleScenePointerEnd = (event) => {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    panDragRef.current = null;
    if (!drag.isDragging) return;
    if (shellRef.current?.hasPointerCapture?.(event.pointerId)) shellRef.current.releasePointerCapture(event.pointerId);
    // A drag that ends on a hotspot must not also open it.
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };

  const openModule = useCallback((moduleId) => {
    setHintedModule(null);
    setIsRevealingLabels(false);
    setVisitedModules((current) => {
      if (current.has(moduleId)) return current;
      const next = new Set(current);
      next.add(moduleId);
      return next;
    });
    onOpenModule(moduleId);
  }, [onOpenModule]);

  const checkProgress = useCallback(() => {
    const now = performance.now();
    if (now - progressCheckRef.current < 180 || hasCompletedRef.current) return;
    progressCheckRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    const sampleStep = 8;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let total = 0;
    let cleared = 0;

    for (let y = 0; y < canvas.height; y += sampleStep) {
      for (let x = 0; x < canvas.width; x += sampleStep) {
        const alpha = pixels[(y * canvas.width + x) * 4 + 3];
        total += 1;
        if (alpha < 24) cleared += 1;
      }
    }

    if (cleared / total > SCRATCH_THRESHOLD) {
      completeColoring(true);
    }
  }, [completeColoring]);

  const stampBrush = useCallback((x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cover = coverRef.current;
    if (cover && scratchPointsRef.current.length < 4000) {
      scratchPointsRef.current.push({
        x: (x - cover.offsetX) / cover.renderWidth,
        y: (y - cover.offsetY) / cover.renderHeight,
      });
    }

    const context = canvas.getContext('2d');
    const size = BRUSH_SIZE * (0.84 + Math.random() * 0.24);
    const edgeCount = 18;

    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.translate(x, y);
    context.rotate(Math.random() * Math.PI * 2);
    context.scale(1 + Math.random() * 0.14, 0.86 + Math.random() * 0.2);

    const gradient = context.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 0.58);
    gradient.addColorStop(0, 'rgba(0,0,0,0.98)');
    gradient.addColorStop(0.62, 'rgba(0,0,0,0.82)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, size * 0.58, 0, Math.PI * 2);
    context.fill();

    for (let index = 0; index < edgeCount; index += 1) {
      const angle = (Math.PI * 2 * index) / edgeCount + Math.random() * 0.45;
      const distance = size * (0.34 + Math.random() * 0.26);
      const dabSize = size * (0.07 + Math.random() * 0.1);
      context.globalAlpha = 0.42 + Math.random() * 0.36;
      context.beginPath();
      context.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, dabSize, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }, []);

  const scratchBetween = useCallback((from, to) => {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 18));

    for (let index = 0; index <= steps; index += 1) {
      const progress = index / steps;
      stampBrush(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
    }
  }, [stampBrush]);

  const getLocalPoint = useCallback((event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback((event) => {
    if (isComplete || activeModule) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getLocalPoint(event);
    isDrawingRef.current = true;
    lastPointRef.current = point;
    setHasScratched(true);
    stampBrush(point.x, point.y);
    checkProgress();
  }, [activeModule, checkProgress, getLocalPoint, isComplete, stampBrush]);

  const handlePointerMove = useCallback((event) => {
    if (!isDrawingRef.current || isComplete || activeModule) return;
    const point = getLocalPoint(event);
    scratchBetween(lastPointRef.current || point, point);
    lastPointRef.current = point;
    checkProgress();
  }, [activeModule, checkProgress, getLocalPoint, isComplete, scratchBetween]);

  const handlePointerUp = useCallback((event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const handleImageError = useCallback(() => {
    if (sceneSrcIndex < SCENE_SOURCES.length - 1) {
      setSceneSrcIndex((index) => index + 1);
      return;
    }

    setSceneUnavailable(true);
    reportSceneReady();
  }, [reportSceneReady, sceneSrcIndex]);

  useEffect(() => {
    if (!shellRef.current) return;

    gsap.fromTo(
      shellRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.7, ease: 'power3.out' },
    );
  }, []);

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => () => {
    panTweenRef.current?.kill();
    window.cancelAnimationFrame(panFrameRef.current);
  }, []);

  // Point out the new view for a moment once the painting is coloured.
  useEffect(() => {
    if (!isExploreReady || !canShowDiorama) return undefined;
    setIsDioramaHinted(true);
    const hintTimer = window.setTimeout(() => setIsDioramaHinted(false), 6000);
    return () => window.clearTimeout(hintTimer);
  }, [canShowDiorama, isExploreReady]);

  useEffect(() => {
    if (!isDioramaReady || !isDioramaOpen) {
      setShowOrbitCaption(false);
      return undefined;
    }
    setShowOrbitCaption(true);
    const captionTimer = window.setTimeout(() => setShowOrbitCaption(false), 4500);
    return () => window.clearTimeout(captionTimer);
  }, [isDioramaOpen, isDioramaReady]);

  // Arrow keys turn the diorama; Esc returns to the painting.
  useEffect(() => {
    if (!isDioramaOpen || activeModule) return undefined;
    const steps = { ArrowLeft: [6, 0], ArrowRight: [-6, 0], ArrowUp: [0, 3], ArrowDown: [0, -3] };
    const handleKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, select')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDiorama();
        return;
      }
      const step = steps[event.key];
      if (!step) return;
      event.preventDefault();
      orbitRef.current = clampOrbit({ yaw: orbitRef.current.yaw + step[0], pitch: orbitRef.current.pitch + step[1] });
      dioramaWakeRef.current?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeModule, closeDiorama, isDioramaOpen]);

  useEffect(() => {
    if (!isRevealingLabels) return undefined;
    const revealTimer = window.setTimeout(() => setIsRevealingLabels(false), REVEAL_LABELS_DURATION);
    return () => window.clearTimeout(revealTimer);
  }, [isRevealingLabels]);

  const hasHotspots = hotspotRects.length > 0;

  // Hotspots mount only once the painting is coloured, which for first-time visitors
  // happens after load; fading them in here keeps their hover labels from staying invisible.
  useEffect(() => {
    if (!imageMeta || !hasHotspots || !(isExploreReady || debugMode)) return undefined;

    const context = gsap.context(() => {
      const targets = gsap.utils.selector(shellRef)('.main-canvas-hotspot');
      // Opacity only: a GSAP transform tween would pin `translate: none` and stop the parallax.
      if (targets.length) {
        gsap.fromTo(targets, { opacity: 0 }, {
          opacity: 1,
          duration: 0.42,
          stagger: 0.16,
          ease: 'power2.out',
        });
      }
    }, shellRef);

    return () => context.revert();
  }, [debugMode, hasHotspots, imageMeta, isExploreReady]);

  useEffect(() => {
    if (!imageMeta || !hasHotspots) return undefined;

    const context = gsap.context(() => {
      const select = gsap.utils.selector(shellRef);
      const animate = (selector, from, to) => {
        const targets = select(selector);
        if (targets.length) gsap.fromTo(targets, from, to);
      };

      animate('.gallery-identity', { opacity: 0, x: -12 }, {
        opacity: 1,
        x: 0,
        duration: 0.7,
        delay: 0.12,
        ease: 'power2.out',
      });
      animate('.gallery-index', { opacity: 0, y: 16 }, {
        opacity: 1,
        y: 0,
        duration: 0.58,
        delay: 0.24,
        ease: 'power3.out',
      });
      animate('.gallery-index-item', { opacity: 0, y: 7 }, {
        opacity: 1,
        y: 0,
        duration: 0.34,
        delay: 0.44,
        stagger: 0.07,
        ease: 'power2.out',
      });
    }, shellRef);

    return () => context.revert();
  }, [hasHotspots, imageMeta]);

  useEffect(() => {
    if (!isExploreReady || visitedModules.size > 0) return undefined;

    const hintTimer = window.setTimeout(() => setHintedModule('vinyl'), 7000);
    const clearTimer = window.setTimeout(() => setHintedModule(null), 10500);
    return () => {
      window.clearTimeout(hintTimer);
      window.clearTimeout(clearTimer);
    };
  }, [isExploreReady, visitedModules.size]);

  const cursor = useMemo(() => {
    if (isComplete) return 'default';
    return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Ctext y='34' font-size='32'%3E%F0%9F%96%8C%3C/text%3E%3C/svg%3E\") 5 34, crosshair";
  }, [isComplete]);
  const vinylHotspot = hotspotRects.find((hotspot) => hotspot.id === 'vinyl');

  return (
    <section
      ref={shellRef}
      inert={isInactive}
      className={`gallery-scene relative h-screen w-screen overflow-hidden bg-cream ${canPanScene && isComplete ? 'is-pannable' : ''} ${isOrbiting ? 'is-orbiting' : ''}`}
      style={{ cursor }}
      onPointerDown={handleScenePointerDown}
      onPointerMove={handleScenePointerMove}
      onPointerUp={handleScenePointerEnd}
      onPointerCancel={handleScenePointerEnd}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <img
        ref={imageRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={sceneSrc}
        alt=""
        draggable="false"
        onLoad={() => {
          setImageMeta({
            width: imageRef.current.naturalWidth,
            height: imageRef.current.naturalHeight,
          });
          resizeCanvas();
          reportSceneReady();
        }}
        onError={handleImageError}
      />

      <LivingPainting
        active={isExploreReady && Boolean(imageMeta) && !sceneUnavailable}
        paused={isInactive || isDioramaMounted}
        imageRef={imageRef}
        getLayout={getLayout}
        focusRect={hotspotRects.find(({ id }) => id === (hoveredModule || hintedModule))?.rect || null}
        hotspotLayerRef={hotspotLayerRef}
        onDepthReady={handleDepthReady}
      />

      {isDioramaMounted && (
        <Suspense fallback={null}>
          <DioramaView
            open={isDioramaOpen}
            paused={isInactive}
            imageRef={imageRef}
            getLayout={getLayout}
            orbitRef={orbitRef}
            wakeRef={dioramaWakeRef}
            hotspots={dioramaHotspots}
            onProjectHotspots={projectHotspots}
            onReady={handleDioramaReady}
            onClosed={handleDioramaClosed}
            onError={handleDioramaError}
          />
          <div className={`diorama-frame pointer-events-none absolute inset-0 z-[15] ${isDioramaOpen && isDioramaReady ? 'is-open' : ''}`} aria-hidden="true" />
        </Suspense>
      )}

      {sceneUnavailable && <p className="scene-error" role="status">画面暂时没能展开</p>}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 h-full w-full touch-none"
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <button
        className={`paint-action-button group absolute bottom-8 right-8 z-20 ${isComplete ? '' : 'is-labelled'}`}
        type="button"
        aria-label={isComplete ? '重新上色' : '一键上色'}
        onClick={() => (isComplete ? resetColoring() : completeColoring(true))}
      >
        <Palette aria-hidden="true" size={23} strokeWidth={1.7} />
        <span className="paint-action-tooltip">{isComplete ? '重新上色' : '一键上色'}</span>
      </button>

      {isComplete && canShowDiorama && (
        <button
          className={`diorama-toggle absolute z-20 ${isDioramaOpen ? 'is-active' : ''} ${isDioramaHinted && !isDioramaOpen ? 'is-labelled' : ''}`}
          type="button"
          aria-pressed={isDioramaOpen}
          aria-label={isDioramaOpen ? '回到画面' : '转动看看'}
          onClick={() => (isDioramaOpen ? closeDiorama() : openDiorama())}
          onMouseEnter={() => setIsDioramaHinted(false)}
        >
          {isDioramaOpen
            ? <ImageIcon aria-hidden="true" size={21} strokeWidth={1.7} />
            : <Rotate3d aria-hidden="true" size={21} strokeWidth={1.7} />}
          <span className="paint-action-tooltip">{isDioramaOpen ? '回到画面' : '转动看看'}</span>
        </button>
      )}

      {showOrbitCaption && (
        <p className="painting-hint diorama-caption pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 px-5 py-3 text-sm" role="status">
          拖动画面，转一转<span className="diorama-caption-keys">，方向键也可以，Esc 回到画面</span>
        </p>
      )}

      {!isComplete && (
        <div
          className={[
            'painting-hint pointer-events-none absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 px-5 py-3 text-sm transition duration-700',
            hasScratched ? 'translate-y-4 opacity-0' : 'opacity-100',
          ].join(' ')}
        >
          <Paintbrush aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>为这幅画，添一点颜色</span>
        </div>
      )}

      {(isExploreReady || debugMode) && imageMeta && (
        <div ref={hotspotLayerRef} className={`pointer-events-none absolute inset-0 z-20 ${isDioramaMounted && isDioramaReady ? 'is-diorama' : ''}`}>
          {hotspotRects.map(({ id, label, target, rect, isCentreOnScreen }, index) => (
            <button
              className={[
                'main-canvas-hotspot group absolute rounded-[28px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warmGold/80',
                debugMode ? 'border-2 border-red-500/85 bg-red-500/20 opacity-100' : 'opacity-0',
                isExploreReady ? 'hover:cursor-pointer' : 'pointer-events-none',
                hoveredModule === id || hintedModule === id ? 'is-linked' : '',
                isRevealingLabels && isCentreOnScreen ? 'is-named' : '',
              ].join(' ')}
              type="button"
              key={id}
              data-hotspot-id={id}
              aria-label={label}
              aria-hidden="true"
              tabIndex={-1}
              style={{
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                '--hotspot-delay': `${index * 0.18}s`,
                '--depth-offset': hotspotDepths[id] ?? 0,
                pointerEvents: isExploreReady ? 'auto' : 'none',
              }}
              onClick={() => openModule(id)}
              onMouseEnter={() => {
                setHintedModule(null);
                setHoveredModule(id);
              }}
              onMouseLeave={() => setHoveredModule(null)}
              onFocus={() => setHoveredModule(id)}
              onBlur={() => setHoveredModule(null)}
            >
              {debugMode && (
                <span className="absolute left-0 top-0 rounded-br bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                  {target}
                </span>
              )}
              {!debugMode && <span className="hotspot-label">{label}</span>}
            </button>
          ))}
        </div>
      )}

      {(
        <div className="gallery-identity pointer-events-none absolute left-8 top-7 z-[25]">
          <span className="gallery-identity-title block font-title italic">Silas’s Gallery</span>
          <span className="gallery-identity-subtitle block">Personal digital card</span>
        </div>
      )}

      {(
        <div className="gallery-index-anchor pointer-events-none absolute inset-x-0 bottom-6 z-[25] flex justify-center">
          <nav className="gallery-index pointer-events-auto flex" aria-label="画廊入口">
            {hotspots.map(({ id, label, icon: Icon }) => (
              <button
                className={[
                  'gallery-index-item',
                  hoveredModule === id ? 'is-active' : '',
                  hintedModule === id ? 'is-hinted' : '',
                ].join(' ')}
                type="button"
                key={id}
                aria-label={label}
                onClick={() => openModule(id)}
                onMouseEnter={() => {
                  setHintedModule(null);
                  setHoveredModule(id);
                }}
                onMouseLeave={() => setHoveredModule(null)}
                onFocus={() => setHoveredModule(id)}
                onBlur={() => setHoveredModule(null)}
              >
                <Icon aria-hidden="true" size={17} strokeWidth={1.55} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {canPanScene && !activeModule && (
        <div className="scene-pan-controls">
          <button type="button" aria-label="向左看看" title="向左看看" disabled={scenePosition <= 0.001} onClick={() => panScene(-1)}>
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
          <button type="button" aria-label="向右看看" title="向右看看" disabled={scenePosition >= 0.999} onClick={() => panScene(1)}>
            <ChevronRight aria-hidden="true" size={22} />
          </button>
        </div>
      )}

      {!activeModule && <MiniPlayer player={player} onOpen={() => openModule('vinyl')} />}

      {isExploreReady && isMusicPlaying && vinylHotspot && !isDioramaMounted && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: `${vinylHotspot.rect.left + vinylHotspot.rect.width * 0.5}px`,
            top: `${vinylHotspot.rect.top + vinylHotspot.rect.height * 0.14}px`,
          }}
          aria-hidden="true"
        >
          {['♪', '♬', '♪', '♩', '♬', '♪'].map((note, index) => (
            <span
              className="music-note-particle absolute font-title text-2xl italic"
              key={`${note}-${index}`}
              style={{
                '--note-x': `${(index - 2.5) * 18}px`,
                '--note-delay': `${index * 0.46}s`,
                color: index % 2 === 0 ? 'rgba(212,165,116,0.58)' : 'rgba(232,213,183,0.54)',
              }}
            >
              {note}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export default MainCanvas;
