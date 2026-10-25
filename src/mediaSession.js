export function getTrackMetadata(track, baseHref) {
  return {
    title: track.title,
    artist: track.artist,
    album: 'Silas’s Gallery',
    artwork: [{ src: new URL(track.cover, baseHref).href, sizes: '512x512', type: 'image/jpeg' }],
  };
}

export function getMediaSession() {
  return typeof navigator !== 'undefined' && navigator.mediaSession ? navigator.mediaSession : null;
}

export function setMediaPositionState(audio) {
  const session = getMediaSession();
  if (!session?.setPositionState || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
  try {
    session.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate || 1,
      position: Math.min(audio.currentTime || 0, audio.duration),
    });
  } catch {
    // Position state is optional; some browsers reject it mid-load.
  }
}
