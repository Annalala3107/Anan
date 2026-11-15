'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CloudRain,
  Loader2,
  Maximize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Timer,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import { formatSecondsMmSs, useMusicStore } from '@/lib/musicStore';
import { AmbientPreset } from '@/lib/ambientAudio';
import {
  getStudioContextTone,
  STUDIO_TONE_TOKENS,
  StudioEqualizer,
  StudioSlider,
  VinylArtwork,
} from './StudioPrimitives';

function nextAmbientPreset(current: AmbientPreset): AmbientPreset {
  if (current === 'off') return 'rain';
  if (current === 'rain') return 'brown';
  return 'off';
}

function getAmbientBadge(preset: AmbientPreset): {
  label: string;
  Icon: typeof Wind;
} {
  if (preset === 'rain') return { label: 'Mưa', Icon: CloudRain };
  if (preset === 'brown') return { label: 'Brown', Icon: Wind };
  return { label: 'Nền: Tắt', Icon: VolumeX };
}

/**
 * Isolated 1-second seek bar for FloatingMiniPlayer.
 */
function MiniPlayerSeekBar() {
  const currentTime = useMusicStore((s) => s.currentTime);
  const duration = useMusicStore((s) => s.duration);
  const isReady = useMusicStore((s) => s.isReady);
  const requestSeek = useMusicStore((s) => s.requestSeek);

  const [dragTime, setDragTime] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragTimeRef = useRef<number | null>(null);

  const displayTime = dragTime ?? currentTime;
  const maxDuration = duration > 0 ? duration : 100;

  return (
    <div className="space-y-1">
      <StudioSlider
        value={duration > 0 ? displayTime : 0}
        min={0}
        max={maxDuration}
        step={1}
        disabled={!isReady || duration <= 0}
        ariaLabel="Tua thời gian trên Mini-Player"
        tone="indigo"
        heightClass="h-1"
        onCommitStart={() => {
          isDraggingRef.current = true;
        }}
        onChange={(val) => {
          dragTimeRef.current = val;
          setDragTime(val);
          if (!isDraggingRef.current) {
            requestSeek(val);
          }
        }}
        onCommitEnd={() => {
          isDraggingRef.current = false;
          if (dragTimeRef.current !== null) {
            requestSeek(dragTimeRef.current);
          }
          dragTimeRef.current = null;
          setDragTime(null);
        }}
      />
      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
        <span>{formatSecondsMmSs(displayTime)}</span>
        <span>{duration > 0 ? formatSecondsMmSs(duration) : '--:--'}</span>
      </div>
    </div>
  );
}

/**
 * Isolated 1-second Pomodoro chip for collapsed & expanded Mini-Player.
 */
function MiniPlayerPomodoroPill({ compact = false }: { compact?: boolean }) {
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);
  const pomodoroMode = useMusicStore((s) => s.pomodoroMode);
  const pomodoroSecondsLeft = useMusicStore((s) => s.pomodoroSecondsLeft);
  const togglePomodoro = useMusicStore((s) => s.togglePomodoro);

  if (compact) {
    if (!pomodoroRunning) return null;
    return (
      <span
        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tabular-nums border ${
          pomodoroMode === 'focus'
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
        }`}
      >
        {formatSecondsMmSs(pomodoroSecondsLeft, true)}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={togglePomodoro}
      title={
        pomodoroRunning ? 'Tạm dừng Pomodoro' : 'Bắt đầu Pomodoro'
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
        pomodoroRunning
          ? pomodoroMode === 'focus'
            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
          : 'bg-slate-900/[0.04] dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-indigo-400/40'
      }`}
    >
      <Timer className="w-3 h-3" />
      <span className="font-mono tabular-nums">
        {formatSecondsMmSs(pomodoroSecondsLeft, true)}
      </span>
    </button>
  );
}

export default function FloatingMiniPlayer() {
  const tracks = useMusicStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isReady = useMusicStore((s) => s.isReady);
  const isMuted = useMusicStore((s) => s.isMuted);
  const volume = useMusicStore((s) => s.volume);
  const isDucked = useMusicStore((s) => s.isDucked);
  const ambientPreset = useMusicStore((s) => s.ambientPreset);
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);
  const pomodoroMode = useMusicStore((s) => s.pomodoroMode);
  const showMiniPlayer = useMusicStore((s) => s.showMiniPlayer);
  const miniPlayerCollapsed = useMusicStore((s) => s.miniPlayerCollapsed);
  const isZenModeOpen = useMusicStore((s) => s.isZenModeOpen);

  const togglePlay = useMusicStore((s) => s.togglePlay);
  const nextTrack = useMusicStore((s) => s.nextTrack);
  const prevTrack = useMusicStore((s) => s.prevTrack);
  const toggleMute = useMusicStore((s) => s.toggleMute);
  const setVolume = useMusicStore((s) => s.setVolume);
  const setAmbientPreset = useMusicStore((s) => s.setAmbientPreset);
  const setShowMiniPlayer = useMusicStore((s) => s.setShowMiniPlayer);
  const setMiniPlayerCollapsed = useMusicStore(
    (s) => s.setMiniPlayerCollapsed
  );
  const setZenModeOpen = useMusicStore((s) => s.setZenModeOpen);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) ?? tracks[0],
    [tracks, currentTrackId]
  );

  // Respect P1 rule (showMiniPlayer defaults false) and hide under Zen overlay
  if (!showMiniPlayer || isZenModeOpen || !currentTrack) {
    return null;
  }

  const tone = getStudioContextTone(pomodoroRunning, pomodoroMode);
  const toneTokens = STUDIO_TONE_TOKENS[tone];
  const ambientMeta = getAmbientBadge(ambientPreset);
  const AmbientIcon = ambientMeta.Icon;

  if (miniPlayerCollapsed) {
    return (
      <div
        role="region"
        aria-label="Trình phát nhạc thu gọn"
        className={`glass-elevated fixed bottom-20 md:bottom-5 right-4 z-[70] flex items-center gap-2 rounded-full p-1.5 pr-2 border max-w-[calc(100vw-24px)] text-slate-900 dark:text-slate-100 transition-all duration-300 ${toneTokens.cardBorder} ${toneTokens.cardGlow}`}
      >
        <VinylArtwork
          videoId={currentTrack.videoId}
          title={currentTrack.title}
          isPlaying={isPlaying}
          tone={tone}
          size="xs"
        />

        <button
          type="button"
          onClick={() => setMiniPlayerCollapsed(false)}
          className="min-w-0 flex items-center gap-2 text-left max-w-[130px] sm:max-w-[165px]"
          title="Mở rộng Mini-Player"
        >
          <span className="text-xs font-medium truncate">
            {currentTrack.title}
          </span>
          <StudioEqualizer isPlaying={isPlaying} tone={tone} size="sm" />
        </button>

        <MiniPlayerPomodoroPill compact />

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
            className="w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setZenModeOpen(true)}
            aria-label="Mở chế độ Zen"
            title="Chế độ Zen"
            className="p-1.5 rounded-full text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-cyan-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setMiniPlayerCollapsed(false)}
            aria-label="Mở rộng Mini-Player"
            title="Mở rộng"
            className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowMiniPlayer(false)}
            aria-label="Ẩn Mini-Player"
            title="Ẩn Mini-Player"
            className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Focus Studio Mini-Player"
      className={`glass-elevated fixed bottom-20 md:bottom-5 right-4 z-[70] w-[calc(100vw-32px)] max-w-[344px] rounded-2xl p-3.5 text-slate-900 dark:text-slate-100 border transition-all duration-300 ${toneTokens.cardBorder} ${toneTokens.cardGlow}`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <VinylArtwork
            videoId={currentTrack.videoId}
            title={currentTrack.title}
            isPlaying={isPlaying}
            tone={tone}
            size="md"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <StudioEqualizer isPlaying={isPlaying} tone={tone} size="sm" />
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${toneTokens.badge}`}
              >
                {pomodoroRunning
                  ? pomodoroMode === 'focus'
                    ? 'Focus'
                    : 'Nghỉ ngơi'
                  : 'Studio'}
              </span>
              {isDucked && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/25">
                  Thi: 15%
                </span>
              )}
            </div>
            <p className="text-xs font-semibold truncate text-slate-900 dark:text-white">
              {currentTrack.title}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setZenModeOpen(true)}
            aria-label="Mở chế độ Zen toàn màn hình"
            title="Zen Focus Mode"
            className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-cyan-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMiniPlayerCollapsed(true)}
            aria-label="Thu gọn Mini-Player"
            title="Thu gọn"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowMiniPlayer(false)}
            aria-label="Đóng Mini-Player"
            title="Đóng"
            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timeline Seekbar */}
      <div className="mt-2.5">
        <MiniPlayerSeekBar />
      </div>

      {/* Transport & Volume Row */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevTrack}
            aria-label="Bài trước"
            className="p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-sm hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
          >
            {!isReady && isPlaying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={nextTrack}
            aria-label="Bài tiếp theo"
            className="p-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
            className="p-1 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 shrink-0"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
            )}
          </button>
          <StudioSlider
            value={isMuted ? 0 : volume}
            min={0}
            max={100}
            step={1}
            ariaLabel="Âm lượng Mini-Player"
            tone="indigo"
            heightClass="h-1"
            onChange={(val) => setVolume(val)}
            className="flex-1"
          />
        </div>
      </div>

      {/* Footer Quick Chips: Pomodoro + Single Ambient Cycle */}
      <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-2">
        <MiniPlayerPomodoroPill />

        <button
          type="button"
          onClick={() => setAmbientPreset(nextAmbientPreset(ambientPreset))}
          title="Đổi âm nền (Tắt -> Mưa -> Brown Noise)"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
            ambientPreset !== 'off'
              ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
              : 'bg-slate-900/[0.04] dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-cyan-500/30'
          }`}
        >
          <AmbientIcon className="w-3 h-3" />
          <span>{ambientMeta.label}</span>
        </button>
      </div>
    </div>
  );
}
