import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Castle,
  Coffee,
  Disc3,
  Mail,
  Paintbrush,
  Palette,
  UserRound,
} from 'lucide-react';

const SCENE_SOURCES = ['/scene-optimized.jpg'];
const SCRATCH_THRESHOLD = 0.6;
const BRUSH_SIZE = 100;

const hotspots = [
  { id: 'vinyl', label: '先放首歌', target: '留声机', icon: Disc3, bounds: { x1: 3, x2: 24, y1: 30, y2: 82 } },
  { id: 'contact', label: '写信给我', target: '红色信箱', icon: Mail, bounds: { x1: 34, x2: 44, y1: 32, y2: 66 } },
  { id: 'topics', label: '最近在想', target: '咖啡桌', icon: Coffee, bounds: { x1: 45, x2: 80, y1: 72, y2: 98 } },
  { id: 'about', label: '关于 Silas', target: '画架', icon: UserRound, bounds: { x1: 71, x2: 92, y1: 22, y2: 72 } },
  { id: 'castle', label: '一些记忆', target: '城堡', icon: Castle, bounds: { x1: 56, x2: 78, y1: 1, y2: 22 } },
];

function getCoverGeometry(containerWidth, containerHeight, imageWidth, imageHeight) {
  const scale = Math.max(containerWidth / imageWidth, containerHeight / imageHeight);
  const renderWidth = imageWidth * scale;
  const renderHeight = imageHeight * scale;
  const offsetX = (containerWidth - renderWidth) / 2;
  const offsetY = (containerHeight - renderHeight) / 2;

  return {
    scale,
    renderWidth,
    renderHeight,
    offsetX,
    offsetY,
  };
}

function MainCanvas({ activeModule, isMusicPlaying = false, onOpenModule }) {
  const shellRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const progressCheckRef = useRef(0);

  const [sceneSrcIndex, setSceneSrcIndex] = useState(0);
  const [imageMeta, setImageMeta] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isExploreReady, setIsExploreReady] = useState(false);
  const [hasScratched, setHasScratched] = useState(false);
  const [hotspotRects, setHotspotRects] = useState([]);
  const [hoveredModule, setHoveredModule] = useState(null);
  const [hintedModule, setHintedModule] = useState(null);
  const [visitedModules, setVisitedModules] = useState(() => new Set());

  const sceneSrc = SCENE_SOURCES[sceneSrcIndex];
  const debugMode = useMemo(() => new URLSearchParams(window.location.search).get('debug') === '1', []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const shell = shellRef.current;
    if (!canvas || !image || !shell || !image.naturalWidth) return;

    const width = shell.clientWidth;
    const height = shell.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cover = getCoverGeometry(width, height, image.naturalWidth, image.naturalHeight);
    context.clearRect(0, 0, width, height);
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

    const nextRects = hotspots.map((hotspot) => {
      const rect = {
        left: cover.offsetX + (hotspot.bounds.x1 / 100) * cover.renderWidth,
        top: cover.offsetY + (hotspot.bounds.y1 / 100) * cover.renderHeight,
        width: ((hotspot.bounds.x2 - hotspot.bounds.x1) / 100) * cover.renderWidth,
        height: ((hotspot.bounds.y2 - hotspot.bounds.y1) / 100) * cover.renderHeight,
      };

      return { ...hotspot, rect };
    });

    setHotspotRects(nextRects);

    if (hasCompletedRef.current) {
      context.clearRect(0, 0, width, height);
    }
  }, []);

  const completeColoring = useCallback((animate = true) => {
    if (hasCompletedRef.current) return;

    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;

    hasCompletedRef.current = true;
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
      },
    });
  }, []);

  const openModule = useCallback((moduleId) => {
    setHintedModule(null);
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
    setSceneSrcIndex((index) => Math.min(index + 1, SCENE_SOURCES.length - 1));
  }, []);

  useEffect(() => {
    if (!shellRef.current) return;

    gsap.fromTo(
      shellRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.7, ease: 'power3.out' },
    );
  }, []);

  useEffect(() => {
    const image = new Image();
    image.src = sceneSrc;
    image.onload = () => {
      setImageMeta({ width: image.naturalWidth, height: image.naturalHeight });
      window.requestAnimationFrame(resizeCanvas);
    };
  }, [resizeCanvas, sceneSrc]);

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    if (!isExploreReady || hotspotRects.length === 0) return undefined;

    const context = gsap.context(() => {
      gsap.fromTo(
        '.main-canvas-hotspot',
        { opacity: 0, scale: 0.96 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.42,
          stagger: 0.16,
          ease: 'power2.out',
        },
      );
      gsap.fromTo(
        '.gallery-identity',
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.7, delay: 0.12, ease: 'power2.out' },
      );
      gsap.fromTo(
        '.gallery-index',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.58, delay: 0.24, ease: 'power3.out' },
      );
      gsap.fromTo(
        '.gallery-index-item',
        { opacity: 0, y: 7 },
        { opacity: 1, y: 0, duration: 0.34, delay: 0.44, stagger: 0.07, ease: 'power2.out' },
      );
    }, shellRef);

    return () => context.revert();
  }, [hotspotRects.length, isExploreReady]);

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
    <section ref={shellRef} className="relative h-screen w-screen overflow-hidden bg-cream" style={{ cursor }}>
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
        }}
        onError={handleImageError}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 h-full w-full touch-none"
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {!isComplete && (
        <button
          className="paint-action-button group absolute bottom-8 right-8 z-20"
          type="button"
          aria-label="一键上色"
          onClick={() => completeColoring(true)}
        >
          <Palette aria-hidden="true" size={23} strokeWidth={1.7} />
          <span className="paint-action-tooltip">一键上色</span>
        </button>
      )}

      {!isComplete && (
        <div
          className={[
            'painting-hint pointer-events-none absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 px-5 py-3 text-sm transition duration-700',
            hasScratched ? 'translate-y-4 opacity-0' : 'opacity-100',
          ].join(' ')}
        >
          <Paintbrush aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>按住鼠标,为这幅画上色吧</span>
        </div>
      )}

      {(isExploreReady || debugMode) && imageMeta && (
        <div className="absolute inset-0 z-20">
          {hotspotRects.map(({ id, label, target, rect }, index) => (
            <button
              className={[
                'main-canvas-hotspot group absolute rounded-[28px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warmGold/80',
                debugMode ? 'border-2 border-red-500/85 bg-red-500/20 opacity-100' : 'opacity-0',
                isExploreReady ? 'hover:cursor-pointer' : 'pointer-events-none',
                hoveredModule === id || hintedModule === id ? 'is-linked' : '',
              ].join(' ')}
              type="button"
              key={id}
              aria-label={label}
              style={{
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                '--hotspot-delay': `${index * 0.18}s`,
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

      {isExploreReady && (
        <div className="gallery-identity pointer-events-none absolute left-8 top-7 z-[25]">
          <span className="gallery-identity-title block font-title italic">Silas’s Gallery</span>
          <span className="gallery-identity-subtitle block">Personal digital card</span>
        </div>
      )}

      {isExploreReady && (
        <div className="gallery-index-anchor pointer-events-none absolute inset-x-0 bottom-6 z-[25] flex justify-center">
          <nav className="gallery-index pointer-events-auto flex" aria-label="画廊入口">
            {hotspots.map(({ id, label, icon: Icon }) => (
              <button
                className={[
                  'gallery-index-item',
                  hoveredModule === id ? 'is-active' : '',
                  hintedModule === id ? 'is-hinted' : '',
                  visitedModules.has(id) ? 'is-visited' : '',
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
                <i aria-hidden="true" />
              </button>
            ))}
          </nav>
        </div>
      )}

      {isExploreReady && isMusicPlaying && vinylHotspot && (
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
