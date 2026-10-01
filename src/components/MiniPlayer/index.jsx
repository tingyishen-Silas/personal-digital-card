import { Disc3, Pause, Play } from 'lucide-react';

export default function MiniPlayer({ player, onOpen }) {
  if (!player?.currentTrack) return null;
  const { currentTrack, isPlaying, togglePlayback, error } = player;

  return (
    <aside className="gallery-mini-player" aria-label={isPlaying ? '正在播放' : '音乐控制'}>
      <button className="mini-player-track" type="button" onClick={onOpen} title="打开留声机">
        <Disc3 className={isPlaying ? 'is-spinning' : ''} aria-hidden="true" size={23} strokeWidth={1.5} />
        <span>
          <strong>{currentTrack.title}</strong>
          <small>{error || currentTrack.artist}</small>
        </span>
      </button>
      <button
        className="mini-player-toggle"
        type="button"
        aria-label={isPlaying ? '暂停音乐' : '继续播放'}
        title={isPlaying ? '暂停音乐' : '继续播放'}
        onClick={togglePlayback}
      >
        {isPlaying ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
      </button>
    </aside>
  );
}
