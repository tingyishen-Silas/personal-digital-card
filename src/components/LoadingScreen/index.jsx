import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Brush } from 'lucide-react';

const MIN_LOADING_TIME = 900;
const EXIT_DURATION = 500;
const MAX_LOADING_TIME = 3500;
const title = 'Silas’s Gallery';
const paintColors = ['#C8956C', '#A0522D', '#D4A574', '#8B7355', '#E8D5B7'];
const preloadResources = [
  { type: 'image', src: '/loading-optimized.jpg' },
];

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ src, ok: true });
    image.onerror = () => resolve({ src, ok: false });
    image.src = src;
  });
}

function LoadingScreen({ onDone }) {
  const startTimeRef = useRef(performance.now());
  const [loadedCount, setLoadedCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const targetProgress = useMemo(() => {
    return Math.round((loadedCount / preloadResources.length) * 100);
  }, [loadedCount]);

  useEffect(() => {
    let isMounted = true;
    const loadedResources = new Set();

    preloadResources.forEach((resource) => {
      if (resource.type === 'image') {
        loadImage(resource.src).then((result) => {
          if (!result.ok) {
            console.warn(`Loading resource failed: ${result.src}`);
          }

          if (isMounted && !loadedResources.has(resource.src)) {
            loadedResources.add(resource.src);
            setLoadedCount((count) => count + 1);
          }
        });
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (!isMounted) return;
      console.warn('Loading timed out; continuing to the gallery.');
      setHasTimedOut(true);
      setLoadedCount(preloadResources.length);
    }, MAX_LOADING_TIME);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    let frameId;

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const timeProgress = Math.min(100, (elapsed / MIN_LOADING_TIME) * 100);
      const nextProgress = hasTimedOut ? 100 : Math.min(targetProgress, timeProgress);

      setProgress((current) => {
        const eased = current + (nextProgress - current) * 0.12;
        if (Math.abs(eased - nextProgress) < 0.2) return nextProgress;
        return eased;
      });

      if (!isExiting) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [hasTimedOut, isExiting, targetProgress]);

  useEffect(() => {
    if (isExiting || loadedCount < preloadResources.length || progress < 99.5) return;

    const elapsed = performance.now() - startTimeRef.current;
    const delay = Math.max(0, MIN_LOADING_TIME - elapsed);
    const exitTimer = window.setTimeout(() => {
      setProgress(100);
      setIsExiting(true);
      window.setTimeout(onDone, EXIT_DURATION);
    }, delay);

    return () => window.clearTimeout(exitTimer);
  }, [isExiting, loadedCount, onDone, progress]);

  const displayedProgress = Math.min(100, Math.round(progress));
  const activePaints = Math.ceil((displayedProgress / 100) * paintColors.length);

  return (
    <motion.section
      className={[
        'fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#dce8ef] text-[#6B7B8C]',
        isExiting ? 'loading-screen-exit pointer-events-none' : '',
      ].join(' ')}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      aria-label="加载中"
    >
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src="/loading-optimized.jpg"
        alt=""
        draggable="false"
      />
      <div className="absolute inset-0 bg-white/10" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-10">
        <h1 className="font-title text-[clamp(64px,8vw,132px)] italic leading-none tracking-normal">
          {title.split('').map((char, index) => (
            <motion.span
              className="inline-block"
              key={`${char}-${index}`}
              initial={{ opacity: 0, filter: 'blur(8px)', y: 10 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.75, ease: 'easeOut' }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="mt-7 text-base tracking-normal text-[#6B7B8C]/90"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: title.length * 0.1 + 0.5, duration: 0.8, ease: 'easeOut' }}
        >
          一幅正在晕染的画,请稍候…
        </motion.p>

        <div
          className="loading-progress-shell mt-14 w-[min(520px,70vw)] px-7 py-5"
          role="progressbar"
          aria-label="画廊加载进度"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={displayedProgress}
        >
          <div className="loading-progress-meta flex items-end justify-between">
            <span className="loading-progress-label">Preparing the canvas</span>
            <span className="loading-progress-number font-title italic tabular-nums">
              {displayedProgress}<small>%</small>
            </span>
          </div>

          <div className="loading-brush-track relative mt-4">
            <div
              className="loading-brush-fill absolute inset-y-0 left-0"
              style={{ width: `${displayedProgress}%` }}
            />
            <span
              className="loading-brush-cursor absolute"
              style={{ left: `${displayedProgress}%` }}
            >
              <Brush aria-hidden="true" size={22} strokeWidth={1.35} />
            </span>
          </div>

          <div className="loading-pigments mt-5 flex items-center justify-between">
            {paintColors.map((color, index) => (
              <span
                className={`loading-pigment ${index < activePaints ? 'is-active' : ''}`}
                key={color}
                style={{
                  backgroundColor: color,
                  '--pigment-color': color,
                  '--pigment-delay': `${index * 45}ms`,
                }}
              >
                <span />
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default LoadingScreen;
