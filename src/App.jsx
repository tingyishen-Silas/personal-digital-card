import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import LoadingScreen from './components/LoadingScreen';
import MainCanvas from './components/MainCanvas';
import VinylPlayer from './components/VinylPlayer';
import DisneyCastle from './components/DisneyCastle';
import TopicsTable from './components/TopicsTable';
import ContactMailbox from './components/ContactMailbox';
import AboutEasel from './components/AboutEasel';
import { musicList } from './data/siteContent';

const modules = {
  vinyl: VinylPlayer,
  castle: DisneyCastle,
  topics: TopicsTable,
  contact: ContactMailbox,
  about: AboutEasel,
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

function useVinylAudio() {
  const audioRef = useRef(null);
  const pendingFallbackRef = useRef(false);
  const currentIndexRef = useRef(null);
  const qualityRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [quality, setQuality] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = 0.7;
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleDurationChange = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setCurrentIndex((index) => {
        const nextIndex = index === null ? 0 : (index + 1) % musicList.length;
        window.setTimeout(() => {
          const track = musicList[nextIndex];
          const shouldUseFlac = Boolean(
            audio.canPlayType('audio/flac') || audio.canPlayType('audio/x-flac'),
          );

          pendingFallbackRef.current = false;
          currentIndexRef.current = nextIndex;
          qualityRef.current = shouldUseFlac ? 'flac' : 'mp3';
          setQuality(qualityRef.current);
          setError(null);
          setCurrentTime(0);
          setDuration(0);
          audio.src = shouldUseFlac ? track.audio.flac : track.audio.mp3;
          audio.load();
          audio.play().catch(() => {
            setError('这张唱片暂时无法播放。');
            setIsPlaying(false);
          });
        }, 0);
        return nextIndex;
      });
    };
    const handleError = () => {
      const index = currentIndexRef.current;
      const track = index === null ? null : musicList[index];

      if (track && qualityRef.current === 'flac' && !pendingFallbackRef.current) {
        pendingFallbackRef.current = true;
        audio.src = track.audio.mp3;
        qualityRef.current = 'mp3';
        setQuality('mp3');
        setError(null);
        audio.load();
        audio.play().catch(() => {
          setError('这张唱片暂时无法播放。');
          setIsPlaying(false);
        });
        return;
      }

      setError('这张唱片暂时无法播放。');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const supportsFlac = useCallback(() => {
    const audio = audioRef.current || new Audio();
    const nativeFlac = audio.canPlayType('audio/flac');
    const xFlac = audio.canPlayType('audio/x-flac');
    return Boolean(nativeFlac || xFlac);
  }, []);

  const playTrack = useCallback((index) => {
    const audio = audioRef.current;
    const track = musicList[index];
    if (!audio || !track) return;

    const shouldUseFlac = supportsFlac();
    pendingFallbackRef.current = false;
    currentIndexRef.current = index;
    qualityRef.current = shouldUseFlac ? 'flac' : 'mp3';
    setCurrentIndex(index);
    setQuality(qualityRef.current);
    setError(null);
    setCurrentTime(0);
    setDuration(0);

    audio.src = shouldUseFlac ? track.audio.flac : track.audio.mp3;
    audio.volume = volume;
    audio.load();
    audio.play().catch(() => {
      if (shouldUseFlac) {
        pendingFallbackRef.current = true;
        audio.src = track.audio.mp3;
        qualityRef.current = 'mp3';
        setQuality('mp3');
        audio.load();
        audio.play().catch(() => {
          setError('这张唱片暂时无法播放。');
          setIsPlaying(false);
        });
        return;
      }

      setError('这张唱片暂时无法播放。');
      setIsPlaying(false);
    });
  }, [supportsFlac, volume]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentIndex === null) {
      playTrack(0);
      return;
    }

    if (audio.paused) {
      audio.play().catch(() => setError('这张唱片暂时无法播放。'));
      return;
    }

    audio.pause();
  }, [currentIndex, playTrack]);

  const playPrevious = useCallback(() => {
    const nextIndex = currentIndex === null
      ? musicList.length - 1
      : (currentIndex - 1 + musicList.length) % musicList.length;
    playTrack(nextIndex);
  }, [currentIndex, playTrack]);

  const playNext = useCallback(() => {
    const nextIndex = currentIndex === null ? 0 : (currentIndex + 1) % musicList.length;
    playTrack(nextIndex);
  }, [currentIndex, playTrack]);

  const seek = useCallback((value) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration)) return;

    const nextTime = Number(value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [duration]);

  const setVolume = useCallback((value) => {
    const nextVolume = Number(value);
    setVolumeState(nextVolume);
    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }
  }, []);

  const currentTrack = currentIndex === null ? null : musicList[currentIndex];

  return useMemo(() => ({
    currentIndex,
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    volume,
    quality,
    error,
    playTrack,
    togglePlayback,
    playPrevious,
    playNext,
    seek,
    setVolume,
    formatTime: formatPlaybackTime,
  }), [
    currentIndex,
    currentTrack,
    currentTime,
    duration,
    error,
    isPlaying,
    playNext,
    playPrevious,
    playTrack,
    quality,
    seek,
    setVolume,
    togglePlayback,
    volume,
  ]);
}

function App() {
  const [activeModule, setActiveModule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const modalRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const isKeyboardInteractionRef = useRef(false);
  const vinylPlayer = useVinylAudio();
  const ActiveModule = activeModule ? modules[activeModule] : null;
  const isVinylOpen = activeModule === 'vinyl';
  const isContactOpen = activeModule === 'contact';

  const openModule = useCallback((moduleId) => {
    lastFocusedElementRef.current = document.activeElement;
    setActiveModule(moduleId);
  }, []);

  const closeModule = useCallback(() => {
    setActiveModule(null);
    window.requestAnimationFrame(() => {
      if (isKeyboardInteractionRef.current) {
        lastFocusedElementRef.current?.focus?.({ preventScroll: true });
      }
      lastFocusedElementRef.current = null;
    });
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
    if (!ActiveModule) return undefined;

    const focusModal = () => {
      const firstFocusable = modalRef.current?.querySelector(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModule();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = [...(modalRef.current?.querySelectorAll(
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
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ActiveModule, closeModule]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-cream font-body text-sienna">
      <MainCanvas
        activeModule={activeModule}
        isMusicPlaying={vinylPlayer.isPlaying}
        onOpenModule={openModule}
      />
      {isLoading && <LoadingScreen onDone={() => setIsLoading(false)} />}

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
                    : 'h-[72vh] w-[72vw] max-w-5xl rounded-[8px]',
              ].join(' ')}
              initial={{ y: 24, scale: 0.96, opacity: 0, filter: 'blur(14px)' }}
              animate={{ y: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: 16, scale: 0.98, opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
            >
              <ActiveModule onClose={closeModule} player={vinylPlayer} />
              {!isVinylOpen && (
                <button
                  className="studio-close-button absolute right-5 top-5 z-50"
                  type="button"
                  aria-label="关闭"
                  onClick={closeModule}
                >
                  <X aria-hidden="true" size={18} strokeWidth={1.8} />
                </button>
              )}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}

export default App;
