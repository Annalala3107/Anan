'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  useMusicStore,
  registerMusicPlayerController,
  getTrackErrorKey,
} from '@/lib/musicStore';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;

/**
 * Module-level singleton loader for the YouTube IFrame API script.
 * Ensures the script is injected only once and preserves any existing ready callback.
 */
function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API chỉ chạy trên trình duyệt'));
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise<any>((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prevReady?.();
      } catch {
        // Ignore third-party callback failures
      }
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      } else {
        ytApiPromise = null;
        reject(new Error('YouTube IFrame API không khởi tạo được đối tượng YT.Player'));
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        ytApiPromise = null;
        reject(new Error('Không thể tải YouTube IFrame API (kiểm tra mạng hoặc trình chặn quảng cáo)'));
      };
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

function getYouTubeErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return 'Lỗi 2: Video ID không hợp lệ hoặc bị sai định dạng.';
    case 5:
      return 'Lỗi 5: Trình phát HTML5 gặp sự cố với video này.';
    case 100:
      return 'Lỗi 100: Video không tồn tại, đã bị xóa hoặc đang để chế độ Riêng tư (Private).';
    case 101:
    case 150:
      return `Lỗi ${code}: Chủ sở hữu video hoặc bản quyền Content ID không cho phép nhúng trên web ngoài.`;
    default:
      return `Lỗi ${code}: Không thể phát video này trên trình duyệt.`;
  }
}

function computeEffectiveVolume(isMuted: boolean, volume: number, isDucked: boolean): number {
  if (isMuted || volume <= 0) return 0;
  return isDucked ? Math.min(volume, 15) : volume;
}

function syncPlayerAudio(player: any, isMuted: boolean, volume: number, isDucked: boolean) {
  if (!player) return;
  const effectiveVolume = computeEffectiveVolume(isMuted, volume, isDucked);
  try {
    if (isMuted || effectiveVolume === 0) {
      player.mute?.();
      player.setVolume?.(0);
    } else {
      player.unMute?.();
      player.setVolume?.(effectiveVolume);
    }
  } catch {
    // Player might be tearing down
  }
}

export default function YouTubeAudioEngine() {
  const tracks = useMusicStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isReady = useMusicStore((s) => s.isReady);
  const isMuted = useMusicStore((s) => s.isMuted);
  const volume = useMusicStore((s) => s.volume);
  const isDucked = useMusicStore((s) => s.isDucked);
  const seekRequest = useMusicStore((s) => s.seekRequest);
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) || tracks[0],
    [tracks, currentTrackId]
  );

  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef(false);
  const activeVideoIdRef = useRef<string>('');
  const activeMediaKeyRef = useRef<string>('');
  const syncedIntentRef = useRef<{ mediaKey: string; isPlaying: boolean } | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const autoSkipTimerRef = useRef<number | null>(null);
  const isFadingOutRef = useRef(false);

  // Initialize singleton YT.Player once per mount with React.StrictMode cleanup protection
  useEffect(() => {
    let cancelled = false;
    const hostEl = hostRef.current;
    if (!hostEl) return;

    const clearFade = () => {
      if (fadeTimerRef.current !== null) {
        window.clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      isFadingOutRef.current = false;
    };

    const fadeVolumeTo = (
      player: any,
      targetVol: number,
      durationMs = 260,
      onComplete?: () => void
    ) => {
      clearFade();
      if (!player) {
        onComplete?.();
        return;
      }

      let startVol = targetVol;
      try {
        const cur = Number(player.getVolume?.());
        if (Number.isFinite(cur)) startVol = cur;
        if (player.isMuted?.()) startVol = 0;
      } catch {
        // Ignore read error
      }

      if (Math.abs(targetVol - startVol) <= 2 || durationMs <= 0) {
        try {
          if (targetVol === 0) {
            player.setVolume?.(0);
          } else {
            player.unMute?.();
            player.setVolume?.(targetVol);
          }
        } catch {
          // Ignore
        }
        onComplete?.();
        return;
      }

      const steps = 5;
      const stepMs = Math.max(30, Math.round(durationMs / steps));
      let step = 0;

      if (targetVol > 0) {
        try {
          player.unMute?.();
        } catch {
          // Ignore
        }
      }

      fadeTimerRef.current = window.setInterval(() => {
        step += 1;
        const progress = Math.min(1, step / steps);
        const nextVol = Math.round(startVol + (targetVol - startVol) * progress);
        try {
          player.setVolume?.(Math.max(0, Math.min(100, nextVol)));
        } catch {
          // Ignore
        }
        if (step >= steps) {
          clearFade();
          onComplete?.();
        }
      }, stepMs);
    };

    const loadIntoPlayer = (
      player: any,
      videoId: string,
      autoPlay: boolean,
      playlistId?: string
    ) => {
      const mediaKey = playlistId ? `playlist:${playlistId}` : videoId;
      activeVideoIdRef.current = videoId;
      activeMediaKeyRef.current = mediaKey;
      syncedIntentRef.current = { mediaKey, isPlaying: autoPlay };
      const latest = useMusicStore.getState();
      const targetVol = computeEffectiveVolume(latest.isMuted, latest.volume, latest.isDucked);
      clearFade();
      syncPlayerAudio(player, latest.isMuted, latest.volume, latest.isDucked);
      try {
        player.setPlaybackQuality?.('small');
      } catch {
        // Ignore
      }

      if (playlistId && typeof player.loadPlaylist === 'function') {
        if (autoPlay) {
          if (targetVol > 0) {
            try {
              player.setVolume?.(0);
            } catch {
              // Ignore
            }
          }
          player.loadPlaylist({ list: playlistId, listType: 'playlist' });
          if (targetVol > 0) fadeVolumeTo(player, targetVol, 280);
        } else {
          player.cuePlaylist?.({ list: playlistId, listType: 'playlist' });
        }
        return;
      }

      if (autoPlay && typeof player.loadVideoById === 'function') {
        if (targetVol > 0) {
          try {
            player.setVolume?.(0);
          } catch {
            // Ignore
          }
        }
        player.loadVideoById(videoId);
        if (targetVol > 0) fadeVolumeTo(player, targetVol, 280);
      } else if (typeof player.cueVideoById === 'function') {
        player.cueVideoById(videoId);
      }
    };

    useMusicStore.getState().hydratePrefs();

    registerMusicPlayerController({
      loadTrack: (videoId: string, autoPlay: boolean, playlistId?: string) => {
        const player = playerRef.current;
        if (!isPlayerReadyRef.current || !player) return;
        try {
          loadIntoPlayer(player, videoId, autoPlay, playlistId);
        } catch {
          // Ignore if player is mid-transition
        }
      },
      play: () => {
        const player = playerRef.current;
        if (!isPlayerReadyRef.current || !player) return;
        const latest = useMusicStore.getState();
        const targetTrack =
          latest.tracks.find((t) => t.id === latest.currentTrackId) || latest.tracks[0];
        if (!targetTrack) return;
        const targetMediaKey = getTrackErrorKey(targetTrack);
        const targetVol = computeEffectiveVolume(latest.isMuted, latest.volume, latest.isDucked);

        try {
          try {
            player.setPlaybackQuality?.('small');
          } catch {
            // Ignore
          }
          if (activeMediaKeyRef.current !== targetMediaKey) {
            loadIntoPlayer(player, targetTrack.videoId, true, targetTrack.playlistId);
          } else {
            syncedIntentRef.current = {
              mediaKey: activeMediaKeyRef.current,
              isPlaying: true,
            };
            clearFade();
            if (targetVol > 0) {
              try {
                player.unMute?.();
                player.setVolume?.(0);
              } catch {
                // Ignore
              }
            }
            player.playVideo?.();
            if (targetVol > 0) {
              fadeVolumeTo(player, targetVol, 260);
            } else {
              syncPlayerAudio(player, latest.isMuted, latest.volume, latest.isDucked);
            }
          }
        } catch {
          // Ignore
        }
      },
      pause: () => {
        const player = playerRef.current;
        if (!isPlayerReadyRef.current || !player) return;
        syncedIntentRef.current = {
          mediaKey: activeMediaKeyRef.current,
          isPlaying: false,
        };
        const latest = useMusicStore.getState();
        const effectiveVol = computeEffectiveVolume(latest.isMuted, latest.volume, latest.isDucked);
        if (effectiveVol === 0) {
          clearFade();
          try {
            player.pauseVideo?.();
          } catch {
            // Ignore
          }
          return;
        }
        isFadingOutRef.current = true;
        fadeVolumeTo(player, 0, 240, () => {
          isFadingOutRef.current = false;
          try {
            player.pauseVideo?.();
          } catch {
            // Ignore
          }
        });
      },
      seekTo: (seconds: number) => {
        const player = playerRef.current;
        if (!isPlayerReadyRef.current || !player) return;
        try {
          player.seekTo?.(seconds, true);
          useMusicStore.getState().clearSeekRequest();
        } catch {
          // Ignore seek errors
        }
      },
      syncAudio: (muted: boolean, vol: number, ducked: boolean) => {
        const player = playerRef.current;
        if (!isPlayerReadyRef.current || !player || isFadingOutRef.current) return;
        const targetVol = computeEffectiveVolume(muted, vol, ducked);
        fadeVolumeTo(player, targetVol, 180, () => {
          syncPlayerAudio(player, muted, vol, ducked);
        });
      },
    });

    const init = async () => {
      try {
        const YT = await loadYouTubeIframeApi();
        if (cancelled || !hostRef.current) return;

        // Clear any leftover nodes before instantiating
        hostRef.current.innerHTML = '';
        const mountDiv = document.createElement('div');
        hostRef.current.appendChild(mountDiv);

        const initial = useMusicStore.getState();
        const initialTrack =
          initial.tracks.find((t) => t.id === initial.currentTrackId) || initial.tracks[0];
        const initialVideoId = initialTrack?.videoId || '';
        const initialPlaylistId = initialTrack?.playlistId;
        activeVideoIdRef.current = initialVideoId;
        activeMediaKeyRef.current = initialTrack ? getTrackErrorKey(initialTrack) : initialVideoId;

        const player = new YT.Player(mountDiv, {
          width: '256',
          height: '144',
          videoId: initialPlaylistId ? undefined : initialVideoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            enablejsapi: 1,
            ...(initialPlaylistId ? { listType: 'playlist', list: initialPlaylistId } : {}),
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event: any) => {
              if (cancelled) {
                try {
                  event.target?.stopVideo?.();
                  event.target?.destroy?.();
                } catch {
                  // Ignore
                }
                return;
              }

              isPlayerReadyRef.current = true;
              playerRef.current = event.target;
              try {
                const iframe = event.target?.getIframe?.();
                if (iframe) {
                  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
                }
              } catch {
                // Ignore attribute errors
              }

              const latest = useMusicStore.getState();
              const latestTrack =
                latest.tracks.find((t) => t.id === latest.currentTrackId) || latest.tracks[0];
              const latestMediaKey = latestTrack ? getTrackErrorKey(latestTrack) : '';

              syncPlayerAudio(event.target, latest.isMuted, latest.volume, latest.isDucked);
              try {
                event.target?.setPlaybackQuality?.('small');
              } catch {
                // Ignore
              }
              latest.setReady(true);

              if (latestTrack && latestMediaKey !== activeMediaKeyRef.current) {
                loadIntoPlayer(
                  event.target,
                  latestTrack.videoId,
                  latest.isPlaying,
                  latestTrack.playlistId
                );
              } else if (latest.isPlaying) {
                syncedIntentRef.current = {
                  mediaKey: activeMediaKeyRef.current,
                  isPlaying: true,
                };
                event.target.playVideo?.();
              } else {
                syncedIntentRef.current = {
                  mediaKey: activeMediaKeyRef.current,
                  isPlaying: false,
                };
                latest.setPlayerState('cued');
              }
            },
            onStateChange: (event: any) => {
              if (cancelled) return;
              const latest = useMusicStore.getState();
              const stateCode: number = event.data;

              // YT.PlayerState: -1 UNSTARTED, 0 ENDED, 1 PLAYING, 2 PAUSED, 3 BUFFERING, 5 CUED
              if (stateCode === 1) {
                // Race-condition safeguard: kill delayed playback only once PLAYING actually starts if paused
                if (!latest.isPlaying && !isFadingOutRef.current) {
                  try {
                    event.target?.pauseVideo?.();
                  } catch {
                    // Ignore
                  }
                  syncPlayerAudio(event.target, latest.isMuted, latest.volume, latest.isDucked);
                  latest.setPlayerState('paused');
                  return;
                }

                if (!isFadingOutRef.current && fadeTimerRef.current === null) {
                  syncPlayerAudio(event.target, latest.isMuted, latest.volume, latest.isDucked);
                }
                try {
                  event.target?.setPlaybackQuality?.('small');
                } catch {
                  // Ignore
                }
                if (activeMediaKeyRef.current) {
                  latest.clearTrackError(activeMediaKeyRef.current);
                }
                latest.setPlayerState('playing');
              } else if (stateCode === 3) {
                if (!isFadingOutRef.current && fadeTimerRef.current === null) {
                  syncPlayerAudio(event.target, latest.isMuted, latest.volume, latest.isDucked);
                }
                latest.setPlayerState('buffering');
              } else if (stateCode === 2) {
                latest.setPlayerState('paused');
              } else if (stateCode === 5) {
                if (latest.isPlaying) {
                  try {
                    event.target?.playVideo?.();
                  } catch {
                    // Ignore
                  }
                  latest.setPlayerState('buffering');
                } else {
                  latest.setPlayerState('cued');
                }
              } else if (stateCode === -1) {
                latest.setPlayerState('unstarted');
              } else if (stateCode === 0) {
                latest.setPlayerState('ended');
                if (latest.isPlaying) {
                  if (latest.sleepTimerMode === 'end') {
                    latest.setSleepTimer('off');
                    latest.setPlaying(false);
                  } else if (latest.loopMode === 'one' || latest.tracks.length <= 1) {
                    event.target?.seekTo?.(0);
                    event.target?.playVideo?.();
                  } else {
                    latest.nextTrack();
                  }
                }
              }
            },
            onError: (event: any) => {
              if (cancelled) return;
              const latest = useMusicStore.getState();
              const code = Number(event.data ?? -1);
              const failedTrack =
                latest.tracks.find((t) => getTrackErrorKey(t) === activeMediaKeyRef.current) ||
                latest.tracks.find((t) => t.id === latest.currentTrackId);
              const errorKey = failedTrack
                ? getTrackErrorKey(failedTrack)
                : activeMediaKeyRef.current || activeVideoIdRef.current;
              const msg = getYouTubeErrorMessage(code);

              if (errorKey) {
                latest.recordTrackError(errorKey, code, msg);
              }

              // Auto-skip to next valid track if user intended to play and another playable track exists
              const hasOtherPlayable = latest.tracks.some((t) => {
                const key = getTrackErrorKey(t);
                return key !== errorKey && !latest.trackErrors[key];
              });

              if (latest.isPlaying && hasOtherPlayable) {
                latest.setPlayerState('buffering');
                if (autoSkipTimerRef.current !== null) {
                  window.clearTimeout(autoSkipTimerRef.current);
                }
                autoSkipTimerRef.current = window.setTimeout(() => {
                  autoSkipTimerRef.current = null;
                  if (!cancelled && useMusicStore.getState().isPlaying) {
                    useMusicStore.getState().nextTrack();
                  }
                }, 350);
              } else {
                latest.setPlayerState('error');
                latest.setPlaying(false);
              }
            },
          },
        });

        playerRef.current = player;
      } catch {
        if (!cancelled) {
          useMusicStore.getState().setPlayerState('error');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      clearFade();
      if (autoSkipTimerRef.current !== null) {
        window.clearTimeout(autoSkipTimerRef.current);
        autoSkipTimerRef.current = null;
      }
      isPlayerReadyRef.current = false;
      syncedIntentRef.current = null;
      registerMusicPlayerController(null);
      useMusicStore.getState().setReady(false);
      if (playerRef.current) {
        try {
          playerRef.current.stopVideo?.();
          playerRef.current.destroy?.();
        } catch {
          // Ignore teardown errors
        }
        playerRef.current = null;
      }
      if (hostEl) {
        hostEl.innerHTML = '';
      }
    };
  }, []);

  const currentVideoId = currentTrack?.videoId;
  const currentPlaylistId = currentTrack?.playlistId;
  const currentMediaKey = currentTrack ? getTrackErrorKey(currentTrack) : undefined;

  // Unified reactive fallback effect for track changes & play/pause (e.g. Pomodoro or state changes before onReady)
  useEffect(() => {
    if (!currentVideoId || !currentMediaKey || !isReady || !isPlayerReadyRef.current || !playerRef.current) return;

    const intent = syncedIntentRef.current;
    if (intent && intent.mediaKey === currentMediaKey && intent.isPlaying === isPlaying) {
      return;
    }

    const latest = useMusicStore.getState();
    syncedIntentRef.current = { mediaKey: currentMediaKey, isPlaying };

    try {
      if (activeMediaKeyRef.current !== currentMediaKey) {
        activeVideoIdRef.current = currentVideoId;
        activeMediaKeyRef.current = currentMediaKey;
        syncPlayerAudio(playerRef.current, latest.isMuted, latest.volume, latest.isDucked);
        try {
          playerRef.current?.setPlaybackQuality?.('small');
        } catch {
          // Ignore
        }
        if (currentPlaylistId && typeof playerRef.current.loadPlaylist === 'function') {
          if (isPlaying) {
            playerRef.current.loadPlaylist({ list: currentPlaylistId, listType: 'playlist' });
          } else {
            playerRef.current.cuePlaylist?.({ list: currentPlaylistId, listType: 'playlist' });
          }
        } else if (isPlaying && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById(currentVideoId);
        } else if (typeof playerRef.current.cueVideoById === 'function') {
          playerRef.current.cueVideoById(currentVideoId);
        }
        return;
      }

      if (isPlaying) {
        syncPlayerAudio(playerRef.current, latest.isMuted, latest.volume, latest.isDucked);
        try {
          playerRef.current?.setPlaybackQuality?.('small');
        } catch {
          // Ignore
        }
        playerRef.current.playVideo?.();
      } else if (!isFadingOutRef.current) {
        playerRef.current.pauseVideo?.();
      }
    } catch {
      // Ignore if player is mid-transition
    }
  }, [currentVideoId, currentPlaylistId, currentMediaKey, isPlaying, isReady]);

  // Mute / Volume / Ducking synchronization effect
  useEffect(() => {
    if (!isReady || !playerRef.current || isFadingOutRef.current) return;
    syncPlayerAudio(playerRef.current, isMuted, volume, isDucked);
  }, [isMuted, volume, isDucked, isReady]);

  // Handle user seek bar drags via player.seekTo()
  useEffect(() => {
    if (seekRequest === null || !isReady || !playerRef.current) return;
    try {
      playerRef.current.seekTo?.(seekRequest, true);
    } catch {
      // Ignore seek errors
    } finally {
      useMusicStore.getState().clearSeekRequest();
    }
  }, [seekRequest, isReady]);

  // Poll current playback timeline & Sleep Timer once per second while playing
  useEffect(() => {
    if (!isReady || !isPlaying) return;
    let lastSec = -1;
    const updateNow = () => {
      const store = useMusicStore.getState();
      store.tickSleepTimer();

      const p = playerRef.current;
      if (!p) return;
      try {
        const cur = Number(p.getCurrentTime?.() ?? 0);
        const dur = Number(p.getDuration?.() ?? 0);
        const sec = Math.floor(cur);
        if (sec !== lastSec && (dur > 0 || cur > 0)) {
          lastSec = sec;
          store.setProgress(cur, dur);
        }
      } catch {
        // Ignore if tearing down
      }
    };
    updateNow();
    const timer = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(timer);
  }, [isReady, isPlaying, currentTrackId]);

  // Global Pomodoro Focus Timer ticker (survives route changes)
  useEffect(() => {
    if (!pomodoroRunning) return;
    const timer = window.setInterval(() => {
      useMusicStore.getState().tickPomodoro();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pomodoroRunning]);

  // Media Session API integration (hardware keyboard / Bluetooth headset / lock screen)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentTrack) {
      return;
    }

    try {
      if (typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: 'AnanQuiz Focus Studio',
          artwork: [
            {
              src: `https://i.ytimg.com/vi/${currentTrack.videoId}/mqdefault.jpg`,
              sizes: '320x180',
              type: 'image/jpeg',
            },
            {
              src: `https://i.ytimg.com/vi/${currentTrack.videoId}/hqdefault.jpg`,
              sizes: '480x360',
              type: 'image/jpeg',
            },
          ],
        });
      }
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', () =>
        useMusicStore.getState().setPlaying(true)
      );
      navigator.mediaSession.setActionHandler('pause', () =>
        useMusicStore.getState().setPlaying(false)
      );
      navigator.mediaSession.setActionHandler('previoustrack', () =>
        useMusicStore.getState().prevTrack()
      );
      navigator.mediaSession.setActionHandler('nexttrack', () =>
        useMusicStore.getState().nextTrack()
      );
    } catch {
      // Ignore Media Session errors on unsupported browsers
    }
  }, [currentTrack, isPlaying]);

  // Global keyboard shortcuts (Alt+P play/pause, Alt+M mute, Alt+N next track)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const store = useMusicStore.getState();
      if (e.code === 'KeyP') {
        e.preventDefault();
        store.togglePlay();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        store.toggleMute();
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        store.nextTrack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="fixed bottom-0 right-0 w-16 h-10 opacity-[0.01] pointer-events-none z-[1] overflow-hidden"
      aria-hidden={true}
    >
      <div ref={hostRef} className="w-[256px] h-[144px]" />
    </div>
  );
}
