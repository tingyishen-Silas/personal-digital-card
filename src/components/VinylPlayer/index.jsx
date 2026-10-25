import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Disc3,
  Music2,
  Pause,
  Play,
  Volume2,
} from 'lucide-react';
import { musicList } from '../../data/siteContent';

function VinylPlayer({ player }) {
  const {
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
    formatTime,
  } = player;

  const displayTrack = currentTrack || musicList[0];
  const progressValue = duration > 0 ? currentTime : 0;
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const volumePercent = Math.round(volume * 100);

  return (
    <section className="vinyl-frame relative h-full w-full overflow-hidden bg-cream p-7 text-sienna">
      <div className="relative z-10 grid h-full min-h-0 grid-cols-[1.08fr_0.92fr] gap-7">
        <div className="flex min-h-0 flex-col">
          <div className="turntable-stage relative flex min-h-0 flex-1 items-center justify-center rounded-[8px] p-6">
            <div className="turntable-base absolute bottom-6 h-16 w-[82%] rounded-[18px] bg-[linear-gradient(135deg,#8B7355,#A0522D_46%,#6c3e25)] shadow-[0_24px_42px_rgba(65,37,21,0.25)]" />
            <div className="turntable-glow absolute bottom-16 h-7 w-[72%] rounded-full bg-[#E8D5B7]/30 blur-xl" />

            <div className="vinyl-disc-wrap relative z-10">
              <motion.div
                className="vinyl-disc relative grid h-[292px] w-[292px] place-items-center rounded-full"
                animate={{
                  rotate: isPlaying ? 360 : 0,
                  scale: currentIndex === null ? 0.97 : 1,
                }}
                transition={{
                  rotate: isPlaying
                    ? { duration: 5.2, repeat: Infinity, ease: 'linear' }
                    : { duration: 1.2, ease: 'easeOut' },
                  scale: { duration: 0.35, ease: 'easeOut' },
                }}
              >
                <div className="absolute inset-5 rounded-full border border-white/10" />
                <div className="absolute inset-12 rounded-full border border-white/10" />
                <div className="absolute inset-20 rounded-full border border-white/10" />
                <div className="vinyl-highlight absolute left-16 top-10 h-28 w-10 rotate-45 rounded-full" />
                <AnimatePresence mode="wait">
                  <motion.div
                    className="vinyl-center-label absolute z-10 grid h-28 w-28 place-items-center rounded-full"
                    key={displayTrack.id}
                    initial={{ opacity: 0, scale: 0.72 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.82 }}
                    transition={{ duration: 0.34, ease: 'easeOut' }}
                  >
                    <img
                      className="h-[84px] w-[84px] rounded-full object-cover"
                      src={displayTrack.cover}
                      alt=""
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute h-5 w-5 rounded-full bg-[#E8D5B7] shadow-inner" />
              </motion.div>
              {/* Stays still while the record spins, like a lamp reflected in the grooves. */}
              <div className="vinyl-sheen pointer-events-none absolute inset-0 rounded-full" aria-hidden="true" />
            </div>

            <motion.div
              className="vinyl-tone-arm absolute right-[62px] top-[78px] z-20 h-52 w-24 origin-[78px_28px]"
              animate={{ rotate: currentIndex !== null && isPlaying ? 22 : -7, y: isPlaying ? 8 : -8 }}
              transition={{ type: 'spring', stiffness: 90, damping: 15 }}
            >
              <div className="absolute right-2 top-0 h-16 w-16 rounded-full border-[10px] border-[#8B7355] bg-[#D4A574]" />
              <div className="absolute right-10 top-12 h-40 w-3 origin-top rotate-[20deg] rounded-full bg-[#8B7355] shadow-lg" />
            </motion.div>
          </div>

          <div className="now-playing-panel mt-4 shrink-0 rounded-[8px] p-4">
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="font-title text-[30px] italic leading-tight text-cream">
                  {currentTrack?.title || '挑一张唱片'}
                </div>
                <div className="mt-1 text-sm text-cream/60">
                  {currentTrack?.artist || '让这幅画有声音'}
                </div>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-[#E8C6B7]" role="alert">{error}再点一次播放可重试。</p>}

            <div className="mt-4 flex items-center gap-3">
              <button className="vinyl-control-button" type="button" aria-label="上一首" onClick={playPrevious}>
                <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
              </button>
              <button className="vinyl-play-button" type="button" aria-busy={isBuffering} onClick={togglePlayback}>
                {isPlaying ? (
                  <Pause aria-hidden="true" size={16} fill="currentColor" />
                ) : (
                  <Play aria-hidden="true" size={16} fill="currentColor" />
                )}
                <span>{isPlaying ? '暂停' : '播放'}</span>
              </button>
              <button className="vinyl-control-button" type="button" aria-label="下一首" onClick={playNext}>
                <ChevronRight aria-hidden="true" size={20} strokeWidth={1.8} />
              </button>
              <div className="ml-auto text-sm tabular-nums text-cream/55" aria-live="polite">
                {isBuffering && isPlaying ? '载入中…' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
              </div>
            </div>

            <input
              className="vinyl-progress mt-4 w-full"
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={progressValue}
              onChange={(event) => seek(event.target.value)}
              aria-label="播放进度"
              style={{ '--range-progress': `${progressPercent}%` }}
            />

            {canSetVolume && (
              <div className="mt-2 flex items-center gap-3 text-sm text-cream/55">
                <Volume2 aria-hidden="true" size={16} strokeWidth={1.8} />
                <input
                  className="vinyl-volume w-44"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(event) => setVolume(event.target.value)}
                  aria-label="音量"
                  style={{ '--range-progress': `${volumePercent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <aside className="record-library flex min-h-0 flex-col rounded-[8px] p-5">
          <div className="mb-4 flex shrink-0 items-end justify-between">
            <div className="flex items-center gap-3">
              <span className="record-library-icon">
                <Disc3 aria-hidden="true" size={18} strokeWidth={1.6} />
              </span>
              <h2 className="font-title text-3xl italic text-sienna">Records</h2>
            </div>
            <span className="text-xs uppercase text-taupe">{musicList.length} tracks</span>
          </div>

          <div className="record-shelf grid min-h-0 flex-1 auto-rows-[76px] gap-2 overflow-y-auto pr-2">
            {musicList.map((track, index) => (
              <button
                className="record-card group grid grid-cols-[58px_1fr_26px] items-center gap-3 rounded-[6px] p-2 text-left transition duration-300"
                type="button"
                key={track.id}
                onClick={() => playTrack(index)}
                aria-pressed={currentIndex === index}
                data-active={currentIndex === index}
              >
                <span className="record-cover relative block h-[58px] w-[58px]">
                  <img
                    className="relative z-10 h-[58px] w-[58px] rounded-[4px] object-cover shadow-md"
                    src={track.cover}
                    alt=""
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-title text-lg italic leading-tight text-sienna">{track.title}</span>
                  <span className="mt-0.5 block truncate text-sm leading-tight text-taupe">{track.artist}</span>
                  <span className="mt-1 block truncate text-xs text-[#8B7355]/85">{track.mood}</span>
                </span>
                <Music2
                  aria-hidden="true"
                  className="record-card-status"
                  size={16}
                  strokeWidth={1.7}
                />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default VinylPlayer;
