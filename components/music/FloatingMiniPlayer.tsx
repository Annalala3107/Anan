'use client';

import { useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  X,
  Music,
  CloudRain,
  Waves,
  Timer,
} from 'lucide-react';
import { useMusicStore, formatSecondsMmSs } from '@/lib/musicStore';

export default function FloatingMiniPlayer() {
  const tracks = useMusicStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const playerState = useMusicStore((s) => s.playerState);
  const isMuted = useMusicStore((s) => s.isMuted);
  const volume = useMusicStore((s) => s.volume);
  const currentTime = useMusicStore((s) => s.currentTime);
  const duration = useMusicStore((s) => s.duration);
  const ambientPreset = useMusicStore((s) => s.ambientPreset);
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);
  const pomodoroSecondsLeft = useMusicStore((s) => s.pomodoroSecondsLeft);
  const pomodoroMode = useMusicStore((s) => s.pomodoroMode);
  const showMiniPlayer = useMusicStore((s) => s.showMiniPlayer);
  const miniPlayerCollapsed = useMusicStore((s) => s.miniPlayerCollapsed);

  const togglePlay = useMusicStore((s) => s.togglePlay);
  const toggleMute = useMusicStore((s) => s.toggleMute);
  const nextTrack = useMusicStore((s) => s.nextTrack);
  const prevTrack = useMusicStore((s) => s.prevTrack);
  const requestSeek = useMusicStore((s) => s.requestSeek);
  const setAmbientPreset = useMusicStore((s) => s.setAmbientPreset);
  const togglePomodoro = useMusicStore((s) => s.togglePomodoro);
  const setShowMiniPlayer = useMusicStore((s) => s.setShowMiniPlayer);
  const setMiniPlayerCollapsed = useMusicStore((s) => s.setMiniPlayerCollapsed);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) || tracks[0],
    [tracks, currentTrackId]
  );

  // All hooks are above this guard to obey React Rules of Hooks
  if (!showMiniPlayer || !currentTrack) {
    return null;
  }

  const isActuallyPlaying = playerState === 'playing' && isPlaying;
  const maxDuration = duration > 0 ? duration : Math.max(currentTime, 1);

  const cycleAmbient = () => {
    if (ambientPreset === 'off') setAmbientPreset('rain');
    else if (ambientPreset === 'rain') setAmbientPreset('brown');
    else setAmbientPreset('off');
  };

  if (miniPlayerCollapsed) {
    return (
      <div className="fixed bottom-20 md:bottom-5 right-4 z-40">
        <div className="h-11 px-2.5 rounded-full bg-white/95 dark:bg-[#0d1424]/95 border border-slate-200 dark:border-slate-700/80 shadow-xl backdrop-blur-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/25'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          {isActuallyPlaying ? (
            <span className="flex items-end gap-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <span className="w-[3px] h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="w-[3px] h-3.5 bg-sky-400 rounded-full animate-bounce" />
              <span className="w-[3px] h-2.5 bg-indigo-400 rounded-full animate-pulse" />
            </span>
          ) : (
            <Music className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          )}

          <button
            type="button"
            onClick={() => setMiniPlayerCollapsed(false)}
            className="text-xs font-semibold max-w-[120px] truncate hover:text-indigo-500 dark:hover:text-sky-300 cursor-pointer"
            title="Mở rộng thanh Mini-Player"
          >
            {currentTrack.title}
          </button>

          {pomodoroRunning && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
              {formatSecondsMmSs(pomodoroSecondsLeft, true)}
            </span>
          )}

          <button
            type="button"
            onClick={() => setMiniPlayerCollapsed(false)}
            title="Mở rộng"
            aria-label="Mở rộng Mini-Player"
            className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-5 right-4 z-40 w-[300px] sm:w-[320px]">
      <div className="rounded-2xl bg-white/95 dark:bg-[#0d1424]/95 border border-slate-200 dark:border-slate-700/80 shadow-2xl backdrop-blur-xl p-3.5 space-y-3 text-slate-900 dark:text-slate-100">
        {/* Header Row: Thumbnail + Metadata + Collapse/Close */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-12 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/70 bg-slate-900">
            <img
              src={`https://i.ytimg.com/vi/${currentTrack.videoId}/mqdefault.jpg`}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
            {isActuallyPlaying && (
              <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate text-slate-900 dark:text-white">
              {currentTrack.title}
            </div>
            <div className="text-xs truncate text-slate-500 dark:text-slate-400">
              {currentTrack.artist}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMiniPlayerCollapsed(true)}
              title="Thu gọn thành viên thuốc"
              aria-label="Thu gọn Mini-Player"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowMiniPlayer(false)}
              title="Ẩn Mini-Player (bật lại trong Header)"
              aria-label="Ẩn Mini-Player"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mini Seek Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={maxDuration}
            value={Math.min(currentTime, maxDuration)}
            onChange={(e) => requestSeek(Number(e.target.value))}
            aria-label="Tua thời gian bài hát"
            className="w-full h-1.5 accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
          />
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>{formatSecondsMmSs(currentTime)}</span>
            <span>{duration > 0 ? formatSecondsMmSs(duration) : '--:--'}</span>
          </div>
        </div>

        {/* Transport + Pomodoro + Ambient Row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevTrack}
              title="Bài trước"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'Tạm dừng (Alt+P)' : 'Phát nhạc (Alt+P)'}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={nextTrack}
              title="Bài tiếp (Alt+N)"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={toggleMute}
              title={isMuted || volume === 0 ? 'Bật tiếng (Alt+M)' : 'Tắt âm (Alt+M)'}
              className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ${
                isMuted || volume === 0
                  ? 'bg-rose-500/15 text-rose-500 dark:text-rose-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>{volume}%</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePomodoro}
              title={
                pomodoroRunning
                  ? 'Tạm dừng Pomodoro'
                  : `Bắt đầu Pomodoro (${pomodoroMode === 'focus' ? 'Tập trung' : 'Nghỉ'})`
              }
              className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1 cursor-pointer transition-colors ${
                pomodoroRunning
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{formatSecondsMmSs(pomodoroSecondsLeft, true)}</span>
            </button>

            <button
              type="button"
              onClick={cycleAmbient}
              title={
                ambientPreset === 'off'
                  ? 'Bật tiếng mưa nhẹ'
                  : ambientPreset === 'rain'
                  ? 'Chuyển sang Brown Noise'
                  : 'Tắt âm thanh không gian'
              }
              className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                ambientPreset !== 'off'
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-400'
              }`}
            >
              {ambientPreset === 'brown' ? (
                <Waves className="w-3.5 h-3.5" />
              ) : (
                <CloudRain className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
