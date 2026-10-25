import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import LoadingScreen from './components/LoadingScreen';
import MainCanvas from './components/MainCanvas';
import { musicList } from './data/siteContent';
import { getMediaSession, getTrackMetadata, setMediaPositionState } from './mediaSession';
import useGalleryRoute from './useGalleryRoute';
import { readStorage, writeStorage } from './storage';

const modules = {
  vinyl: lazy(() => import('./components/VinylPlayer')),
  castle: lazy(() => import('./components/DisneyCastle')),
  topics: lazy(() => import('./components/TopicsTable')),
  contact: lazy(() => import('./components/ContactMailbox')),
  about: lazy(() => import('./components/AboutEasel')),
};

const moduleLabels = {
  vinyl: '黑胶唱片机',
  castle: '城堡',
  topics: '咖啡桌',
  contact: '联系信箱',
  about: '关于我',
};

function formatPlaybackTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

const PLAYBACK_ERROR = '这张唱片暂时无法播放。';

// iOS ignores audio.volume, so a volume slider there would do nothing.
function canControlVolume() {
  try {
    const probe = new Audio();
    probe.volume = 0.5;
    return probe.volume === 0.5;
  } catch {
    return true;
  }
}

function useVinylAudio() {
  const audioRef = useRef(null);
  const currentIndexRef = useRef(null);
  const volumeRef = useRef(0.7);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [canSetVolume] = useState(canControlVolume);
  const [error, setError] = useState(null);

  const handlePlayFailure = useCallback((playError) => {
    // Switching records interrupts the previous play() request; that is not a failure.
    if (playError?.name === 'AbortError') return;
    setError(PLAYBACK_ERROR);
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  const playTrack = useCallback((index) => {
    const audio = audioRef.current;
    const track = musicList[index];
    if (!audio || !track) return;

    currentIndexRef.current = index;
    setCurrentIndex(index);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);

    audio.src = track.audio.mp3;
    audio.volume = volumeRef.current;
    audio.load();
    audio.play().catch(handlePlayFailure);
  }, [handlePlayFailure]);

  const playPrevious = useCallback(() => {
    const index = currentIndexRef.current;
    playTrack(index === null ? musicList.length - 1 : (index - 1 + musicList.length) % musicList.length);
  }, [playTrack]);

  const playNext = useCallback(() => {
    const index = currentIndexRef.current;
    playTrack(index === null ? 0 : (index + 1) % musicList.length);
  }, [playTrack]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const index = currentIndexRef.current;
    if (index === null) {
      playTrack(0);
      return;
    }

    if (error) {
      playTrack(index);
      return;
    }

    if (audio.paused) {
      audio.play().catch(handlePlayFailure);
      return;
    }

    audio.pause();
  }, [error, handlePlayFailure, playTrack]);

  const seek = useCallback((value) => {
    const audio = audioRef.current;
    const nextTime = Number(value);
    if (!audio || !Number.isFinite(nextTime) || !Number.isFinite(audio.duration)) return;

    audio.currentTime = Math.max(0, Math.min(audio.duration, nextTime));
    setCurrentTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((value) => {
    const nextVolume = Number(value);
    volumeRef.current = nextVolume;
    setVolumeState(nextVolume);
    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }
  }, []);

  const controlsRef = useRef(null);
  useEffect(() => {
    controlsRef.current = { togglePlayback, playPrevious, playNext, seek };
  });

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleDurationChange = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setMediaPositionState(audio);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setMediaPositionState(audio);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      setMediaPositionState(audio);
    };
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleEnded = () => controlsRef.current.playNext();
    const handleError = () => {
      if (!audio.getAttribute('src')) return;
      setError(PLAYBACK_ERROR);
      setIsPlaying(false);
      setIsBuffering(false);
    };
    const listeners = {
      timeupdate: handleTimeUpdate,
      durationchange: handleDurationChange,
      loadedmetadata: handleDurationChange,
      seeked: handleDurationChange,
      play: handlePlay,
      pause: handlePause,
      waiting: handleWaiting,
      playing: handlePlaying,
      ended: handleEnded,
      error: handleError,
    };
    Object.entries(listeners).forEach(([type, listener]) => audio.addEventListener(type, listener));

    // Lock-screen, notification and hardware media keys.
    const session = getMediaSession();
    const actions = {
      play: () => audio.paused && controlsRef.current.togglePlayback(),
      pause: () => audio.pause(),
      previoustrack: () => controlsRef.current.playPrevious(),
      nexttrack: () => controlsRef.current.playNext(),
      seekto: (details) => controlsRef.current.seek(details.seekTime),
    };
    Object.entries(actions).forEach(([action, handler]) => {
      try {
        session?.setActionHandler(action, handler);
      } catch {
        // Unsupported actions are simply left to the browser.
      }
    });

    return () => {
      Object.entries(listeners).forEach(([type, listener]) => audio.removeEventListener(type, listener));
      Object.keys(actions).forEach((action) => {
        try {
          session?.setActionHandler(action, null);
        } catch {
          // See above.
        }
      });
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const currentTrack = currentIndex === null ? null : musicList[currentIndex];

  useEffect(() => {
    const session = getMediaSession();
    if (!session || !currentTrack || typeof window.MediaMetadata !== 'function') return;
    session.metadata = new window.MediaMetadata(getTrackMetadata(currentTrack, window.location.href));
  }, [currentTrack]);

  useEffect(() => {
    const session = getMediaSession();
    if (!session) return;
    session.playbackState = !currentTrack ? 'none' : isPlaying ? 'playing' : 'paused';
  }, [currentTrack, isPlaying]);

  return useMemo(() => ({
    currentIndex,
    currentTrack,
    isPlaying,
    isBuffering,
    duration,
    currentTime,
    volume,
    canSetVolume,
    error,
    playTrack,
    togglePlayback,
    playPrevious,
    playNext,
    seek,
    setVolume,
    formatTime: formatPlaybackTime,
  }), [
    canSetVolume,
    currentIndex,
    currentTrack,
    currentTime,
    duration,
    error,
    isBuffering,
    isPlaying,
    playNext,
    playPrevious,
    playTrack,
    seek,
    setVolume,
    togglePlayback,
    volume,
  ]);
}

function App() {
  const { route, navigate, returnTo } = useGalleryRoute();
  const activeModule = route.moduleId;
  const [isReturning] = useState(() => readStorage('localStorage', 'silas-gallery-entered') === 'true');
  const [isLoading, setIsLoading] = useState(true);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [hasNestedOverlay, setHasNestedOverlay] = useState(false);
  const modalRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const isKeyboardInteractionRef = useRef(false);
  const vinylPlayer = useVinylAudio();
  const ActiveModule = activeModule ? modules[activeModule] : null;
  const isVinylOpen = activeModule === 'vinyl';
  const isContactOpen = activeModule === 'contact';
  const isCastleOpen = activeModule === 'castle';
  const isAboutOpen = activeModule === 'about';

  const openModule = useCallback((moduleId) => {
    lastFocusedElementRef.current = document.activeElement;
    navigate({ moduleId });
  }, [navigate]);

  const closeModule = useCallback(() => {
    returnTo({ moduleId: null });
    setHasNestedOverlay(false);
  }, [returnTo]);

  useEffect(() => {
    if (activeModule || !lastFocusedElementRef.current) return undefined;
    const focusTimer = window.setTimeout(() => {
      if (isKeyboardInteractionRef.current) lastFocusedElementRef.current?.focus?.({ preventScroll: true });
      lastFocusedElementRef.current = null;
    }, 450);
    return () => window.clearTimeout(focusTimer);
  }, [activeModule]);

  const finishLoading = useCallback(() => {
    writeStorage('localStorage', 'silas-gallery-entered', 'true');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handlePointerDown = () => {
      isKeyboardInteractionRef.current = false;
    };
    const handleKeyDown = () => {
      isKeyboardInteractionRef.current = true;
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    if (!ActiveModule || isLoading) return undefined;

    const focusModal = () => {
      const focusScope = modalRef.current?.querySelector('[data-modal-focus-scope]') || modalRef.current;
      const firstFocusable = focusScope?.querySelector(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (hasNestedOverlay) return;
        event.preventDefault();
        closeModule();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusScope = modalRef.current?.querySelector('[data-modal-focus-scope]') || modalRef.current;
      const focusable = [...(focusScope?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ) || [])];

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const focusTimer = window.requestAnimationFrame(focusModal);
    const contentObserver = new MutationObserver(() => {
      if (!modalRef.current?.contains(document.activeElement)) focusModal();
    });
    if (modalRef.current) contentObserver.observe(modalRef.current, { childList: true, subtree: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusTimer);
      contentObserver.disconnect();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ActiveModule, closeModule, hasNestedOverlay, isLoading]);

  return (
    <main className="gallery-app relative h-screen w-screen overflow-hidden bg-cream font-body text-sienna">
      <MainCanvas
        activeModule={activeModule}
        isInactive={isLoading || Boolean(activeModule)}
        isMusicPlaying={vinylPlayer.isPlaying}
        player={vinylPlayer}
        onOpenModule={openModule}
        onSceneReady={() => setIsSceneReady(true)}
      />
      {isLoading && <LoadingScreen compact={isReturning} isSceneReady={isSceneReady} onDone={finishLoading} />}

      <AnimatePresence>
        {ActiveModule && (
          <motion.section
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={moduleLabels[activeModule]}
            className="gallery-dialog-backdrop fixed inset-0 z-30 grid place-items-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModule();
            }}
          >
            <motion.div
              className={[
                'gallery-dialog-panel relative overflow-hidden bg-cream',
                isVinylOpen
                  ? 'h-[680px] w-[1000px] max-h-[88vh] max-w-[92vw] rounded-[10px]'
                  : isContactOpen
                    ? 'contact-dialog-panel rounded-[8px]'
                    : isCastleOpen
                      ? 'castle-dialog-panel rounded-[8px]'
                    : isAboutOpen
                      ? 'about-dialog-panel rounded-[8px]'
                    : 'h-[72vh] w-[72vw] max-w-5xl rounded-[8px]',
              ].join(' ')}
              initial={{ y: 24, scale: 0.96, opacity: 0, filter: 'blur(14px)' }}
              animate={{ y: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: 16, scale: 0.98, opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
            >
              <Suspense fallback={<div className="gallery-module-loading">正在打开...</div>}>
                <ActiveModule
                  onArchiveChange={setHasNestedOverlay}
                  onClose={closeModule}
                  player={vinylPlayer}
                  archivePostId={route.postId}
                  archiveImageIndex={route.imageIndex || 0}
                  onOpenArchive={(postId) => navigate({ moduleId: 'castle', postId, imageIndex: 0 })}
                  onCloseArchive={() => returnTo({ moduleId: 'castle' })}
                  onArchiveImageChange={(imageIndex) => navigate({ ...route, imageIndex }, true)}
                />
              </Suspense>
              {/* One close button for every window, outside the scrolling content so it never scrolls away. */}
              <button
                className={`studio-close-button absolute right-5 top-5 z-50 ${isVinylOpen ? 'is-on-frame' : ''}`}
                type="button"
                aria-label="关闭"
                title="关闭（Esc）"
                onClick={closeModule}
              >
                <X aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}

export default App;
