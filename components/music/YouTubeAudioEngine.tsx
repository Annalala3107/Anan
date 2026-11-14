'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useMusicStore } from '@/lib/musicStore';

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

function syncPlayerAudio(player: any, isMuted: boolean, volume: number, isDucked: boolean) {
  if (!player) return;
  const effectiveVolume = isMuted ? 0 : isDucked ? Math.min(volume, 15) : volume;
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

export interface YouTubeAudioEngineProps {
  /** Whether to show a visible 256x144 monitor box (false renders offscreen at real dimensions, never display:none) */
  showVideoPreview?: boolean;
}

export default function YouTubeAudioEngine({
  showVideoPreview = true,
}: YouTubeAudioEngineProps) {
  const tracks = useMusicStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isReady = useMusicStore((s) => s.isReady);
  const isMuted = useMusicStore((s) => s.isMuted);
  const volume = useMusicStore((s) => s.volume);
  const isDucked = useMusicStore((s) => s.isDucked);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) || tracks[0],
    [tracks, currentTrackId]
  );

  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const activeVideoIdRef = useRef<string>('');

  // Initialize singleton YT.Player once per mount with React.StrictMode cleanup protection
  useEffect(() => {
    let cancelled = false;
    const hostEl = hostRef.current;
    if (!hostEl) return;

    useMusicStore.getState().hydratePrefs();

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
        activeVideoIdRef.current = initialVideoId;

        const player = new YT.Player(mountDiv, {
          width: '256',
          height: '144',
          videoId: initialVideoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
            enablejsapi: 1,
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

              playerRef.current = event.target;
              const latest = useMusicStore.getState();
              const latestTrack =
                latest.tracks.find((t) => t.id === latest.currentTrackId) || latest.tracks[0];

              syncPlayerAudio(event.target, latest.isMuted, latest.volume, latest.isDucked);
              latest.setReady(true);
              latest.pushLog('success', 'YouTube IFrame API đã sẵn sàng (onReady)');

              if (latestTrack && latestTrack.videoId !== activeVideoIdRef.current) {
                activeVideoIdRef.current = latestTrack.videoId;
                if (latest.isPlaying) {
                  event.target.loadVideoById?.(latestTrack.videoId);
                } else {
                  event.target.cueVideoById?.(latestTrack.videoId);
                }
              } else if (latest.isPlaying) {
                event.target.playVideo?.();
              } else {
                latest.setPlayerState('cued');
              }
            },
            onStateChange: (event: any) => {
              if (cancelled) return;
              const latest = useMusicStore.getState();
              const stateCode: number = event.data;

              // YT.PlayerState: -1 UNSTARTED, 0 ENDED, 1 PLAYING, 2 PAUSED, 3 BUFFERING, 5 CUED
              if (stateCode === 1 || stateCode === 3) {
                // Race-condition safeguard: kill delayed playback if user already paused
                if (!latest.isPlaying) {
                  try {
                    event.target?.pauseVideo?.();
                  } catch {
                    // Ignore
                  }
                  syncPlayerAudio(event.target, latest.isMuted, latest.volume, latest.isDucked);
                  latest.setPlayerState('paused');
                  latest.pushLog(
                    'warn',
                    'Chốt chặn: Đã ép dừng luồng phát trễ sau khi người dùng bấm Pause'
                  );
                  return;
                }

                syncPlayerAudio(event.target, latest.isMuted, latest.volume, latest.isDucked);
                if (stateCode === 1 && activeVideoIdRef.current) {
                  latest.clearTrackError(activeVideoIdRef.current);
                }
                latest.setPlayerState(stateCode === 1 ? 'playing' : 'buffering');
              } else if (stateCode === 2) {
                latest.setPlayerState('paused');
              } else if (stateCode === 5) {
                latest.setPlayerState('cued');
              } else if (stateCode === -1) {
                latest.setPlayerState('unstarted');
              } else if (stateCode === 0) {
                latest.setPlayerState('ended');
                if (latest.isPlaying) {
                  if (latest.loopMode === 'one' || latest.tracks.length <= 1) {
                    event.target?.seekTo?.(0);
                    event.target?.playVideo?.();
                    latest.pushLog('info', 'Lặp lại bài hiện tại');
                  } else {
                    latest.pushLog('info', 'Hết bài → tự động chuyển sang bài kế tiếp');
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
                latest.tracks.find((t) => t.videoId === activeVideoIdRef.current) ||
                latest.tracks.find((t) => t.id === latest.currentTrackId);
              const videoId = failedTrack?.videoId || activeVideoIdRef.current;
              const msg = getYouTubeErrorMessage(code);

              if (videoId) {
                latest.recordTrackError(videoId, code, msg);
              }
              latest.setPlayerState('error');
              latest.pushLog('error', `[${videoId || 'YouTube'}] ${msg}`);

              if (latest.autoSkipOnError && latest.tracks.length > 1) {
                latest.pushLog('warn', 'Tự động bỏ qua bài lỗi → chuyển bài tiếp theo');
                latest.nextTrack();
              } else {
                latest.setPlaying(false);
              }
            },
          },
        });

        playerRef.current = player;
      } catch (err: any) {
        if (!cancelled) {
          const store = useMusicStore.getState();
          store.setPlayerState('error');
          store.pushLog('error', err?.message || 'Lỗi khởi tạo trình phát YouTube');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
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

  // Track selection / switching effect (uses API loadVideoById / cueVideoById, never recreates iframe)
  useEffect(() => {
    if (!currentTrack || !isReady || !playerRef.current) return;
    if (activeVideoIdRef.current === currentTrack.videoId) return;

    activeVideoIdRef.current = currentTrack.videoId;
    try {
      syncPlayerAudio(playerRef.current, isMuted, volume, isDucked);
      if (isPlaying && typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById(currentTrack.videoId);
        useMusicStore.getState().pushLog('info', `API loadVideoById("${currentTrack.videoId}")`);
      } else if (typeof playerRef.current.cueVideoById === 'function') {
        playerRef.current.cueVideoById(currentTrack.videoId);
        useMusicStore.getState().pushLog('info', `API cueVideoById("${currentTrack.videoId}")`);
      }
    } catch {
      // Ignore if player is mid-transition
    }
  }, [currentTrack, isReady, isPlaying, isMuted, volume, isDucked]);

  // Play / Pause synchronization effect
  useEffect(() => {
    if (!isReady || !playerRef.current) return;
    try {
      if (isPlaying) {
        syncPlayerAudio(playerRef.current, isMuted, volume, isDucked);
        playerRef.current.playVideo?.();
      } else {
        playerRef.current.pauseVideo?.();
        syncPlayerAudio(playerRef.current, isMuted, volume, isDucked);
      }
    } catch {
      // Ignore
    }
  }, [isPlaying, isReady, isMuted, volume, isDucked]);

  // Mute / Volume / Ducking synchronization effect
  useEffect(() => {
    if (!isReady || !playerRef.current) return;
    syncPlayerAudio(playerRef.current, isMuted, volume, isDucked);
  }, [isMuted, volume, isDucked, isReady]);

  return (
    <div
      className={
        showVideoPreview
          ? 'w-[256px] h-[144px] rounded-xl overflow-hidden border border-slate-700/70 bg-black/70 shadow-lg shrink-0'
          : 'w-[200px] h-[112px] fixed -bottom-[9999px] -left-[9999px] opacity-0 pointer-events-none'
      }
      aria-hidden={!showVideoPreview}
    >
      <div ref={hostRef} className="w-full h-full" />
    </div>
  );
}
