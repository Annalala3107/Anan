'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CloudRain,
  Disc3,
  Loader2,
  Minimize2,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import {
  formatSecondsMmSs,
  POMODORO_PRESETS,
  PomodoroPresetKey,
  SleepTimerMode,
  useMusicStore,
} from '@/lib/musicStore';
import { AmbientPreset } from '@/lib/ambientAudio';
import {
  getStudioContextTone,
  STUDIO_TONE_TOKENS,
  StudioEqualizer,
  StudioSlider,
  VinylArtwork,
} from './StudioPrimitives';

const PRESET_ORDER: PomodoroPresetKey[] = ['15/3', '25/5', '50/10'];

const SLEEP_OPTIONS: { id: SleepTimerMode; label: string }[] = [
  { id: 'off', label: 'Tắt' },
  { id: '15', label: '15p' },
  { id: '30', label: '30p' },
  { id: '60', label: '60p' },
  { id: 'end', label: 'Hết bài' },
];

const AMBIENT_OPTIONS: {
  id: AmbientPreset;
  label: string;
  Icon: typeof Wind;
}[] = [
  { id: 'off', label: 'Tắt', Icon: VolumeX },
  { id: 'rain', label: 'Mưa rơi', Icon: CloudRain },
  { id: 'brown', label: 'Brown Noise', Icon: Wind },
];

const HALO_RADIAL_MAP = {
  indigo:
    'radial-gradient(circle, rgba(99,102,241,0.28) 0%, rgba(34,211,238,0.08) 48%, transparent 72%)',
  amber:
    'radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(251,146,60,0.09) 48%, transparent 72%)',
  emerald:
    'radial-gradient(circle, rgba(16,185,129,0.28) 0%, rgba(20,184,166,0.08) 48%, transparent 72%)',
};

/**
 * Isolated 1-second timeline seeker inside Zen Mode.
 */
function ZenSeekBar() {
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
    <div className="w-full max-w-md mx-auto space-y-1.5">
      <StudioSlider
        value={duration > 0 ? displayTime : 0}
        min={0}
        max={maxDuration}
        step={1}
        disabled={!isReady || duration <= 0}
        ariaLabel="Tua thời gian phát nhạc trong Zen Mode"
        tone="indigo"
        heightClass="h-1.5"
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
      <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
        <span>{formatSecondsMmSs(displayTime)}</span>
        <span>{duration > 0 ? formatSecondsMmSs(duration) : '--:--'}</span>
      </div>
    </div>
  );
}

/**
 * Isolated 1-second Pomodoro display inside Zen Mode.
 */
function ZenPomodoroCountdown() {
  const pomodoroSecondsLeft = useMusicStore((s) => s.pomodoroSecondsLeft);

  return (
    <div className="text-5xl sm:text-6xl font-mono font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
      {formatSecondsMmSs(pomodoroSecondsLeft, true)}
    </div>
  );
}

/**
 * Isolated 1-second Sleep timer counter inside Zen Mode.
 */
function ZenSleepCountdown() {
  const sleepTimerMode = useMusicStore((s) => s.sleepTimerMode);
  const sleepSecondsLeft = useMusicStore((s) => s.sleepSecondsLeft);

  if (
    sleepTimerMode === 'off' ||
    sleepTimerMode === 'end' ||
    sleepSecondsLeft <= 0
  ) {
    return null;
  }

  return (
    <span className="text-xs font-mono tabular-nums text-indigo-600 dark:text-cyan-300">
      {formatSecondsMmSs(sleepSecondsLeft, true)}
    </span>
  );
}

function ZenFocusContent({ onClose }: { onClose: () => void }) {
  const tracks = useMusicStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isReady = useMusicStore((s) => s.isReady);
  const isMuted = useMusicStore((s) => s.isMuted);
  const volume = useMusicStore((s) => s.volume);
  const isDucked = useMusicStore((s) => s.isDucked);
  const loopMode = useMusicStore((s) => s.loopMode);
  const isShuffle = useMusicStore((s) => s.isShuffle);

  const ambientPreset = useMusicStore((s) => s.ambientPreset);
  const ambientVolume = useMusicStore((s) => s.ambientVolume);

  const pomodoroPreset = useMusicStore((s) => s.pomodoroPreset);
  const pomodoroMode = useMusicStore((s) => s.pomodoroMode);
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);
  const pomodoroCompletedToday = useMusicStore((s) => s.pomodoroCompletedToday);

  const sleepTimerMode = useMusicStore((s) => s.sleepTimerMode);

  const togglePlay = useMusicStore((s) => s.togglePlay);
  const nextTrack = useMusicStore((s) => s.nextTrack);
  const prevTrack = useMusicStore((s) => s.prevTrack);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const setLoopMode = useMusicStore((s) => s.setLoopMode);
  const toggleMute = useMusicStore((s) => s.toggleMute);
  const setVolume = useMusicStore((s) => s.setVolume);
  const setSleepTimer = useMusicStore((s) => s.setSleepTimer);
  const setAmbientPreset = useMusicStore((s) => s.setAmbientPreset);
  const setAmbientVolume = useMusicStore((s) => s.setAmbientVolume);
  const togglePomodoro = useMusicStore((s) => s.togglePomodoro);
  const setPomodoroPreset = useMusicStore((s) => s.setPomodoroPreset);
  const resetPomodoro = useMusicStore((s) => s.resetPomodoro);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) ?? tracks[0],
    [tracks, currentTrackId]
  );

  const tone = getStudioContextTone(pomodoroRunning, pomodoroMode);
  const toneTokens = STUDIO_TONE_TOKENS[tone];

  const cycleLoopMode = () => {
    setLoopMode(loopMode === 'all' ? 'one' : 'all');
  };

  if (typeof document === 'undefined' || !currentTrack) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zen Focus Studio"
      className="fixed inset-0 z-[90] overflow-y-auto bg-slate-100/88 dark:bg-[#050814]/84 backdrop-blur-md text-slate-900 dark:text-slate-100 flex flex-col justify-between"
    >
      {/* Contextual Ambient Radial Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden"
      >
        <div
          className="w-[540px] h-[540px] rounded-full transition-all duration-700 opacity-85"
          style={{ background: HALO_RADIAL_MAP[tone] }}
        />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-8 pt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-cyan-300 border border-indigo-500/25">
            <Disc3 className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">
                Zen Focus Studio
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${toneTokens.badge}`}
              >
                {pomodoroRunning
                  ? pomodoroMode === 'focus'
                    ? 'Focus • Warm Amber'
                    : 'Nghỉ • Emerald'
                  : 'Midnight Vinyl'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hôm nay: <strong>{pomodoroCompletedToday}</strong> phiên • Nhấn{' '}
              <kbd className="px-1 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 font-mono text-[10px]">
                Esc
              </kbd>{' '}
              để quay lại
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Thoát chế độ Zen"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300/70 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/10 text-xs font-semibold transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Thu nhỏ</span>
          <X className="w-3.5 h-3.5 sm:hidden" />
        </button>
      </header>

      {/* Main Studio Stage */}
      <main className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Vinyl Turntable & Music Transport */}
        <section className="lg:col-span-6 flex flex-col items-center text-center space-y-5">
          <VinylArtwork
            videoId={currentTrack.videoId}
            title={currentTrack.title}
            isPlaying={isPlaying}
            tone={tone}
            size="lg"
          />

          <div className="space-y-1.5 max-w-md">
            <div className="flex items-center justify-center gap-2">
              <StudioEqualizer isPlaying={isPlaying} tone={tone} size="md" />
              <h2 className="text-lg sm:text-xl font-bold truncate max-w-[280px] sm:max-w-[360px]">
                {currentTrack.title}
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {currentTrack.artist}
              {currentTrack.playlistId ? ' • YouTube Playlist' : ''}
              {isDucked ? ' • Tự giảm 15% khi thi' : ''}
            </p>
          </div>

          <ZenSeekBar />

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Phát ngẫu nhiên"
              aria-pressed={isShuffle}
              className={`p-2.5 rounded-full transition-colors ${
                isShuffle
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-cyan-300'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={prevTrack}
              aria-label="Bài trước"
              className="p-3 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/35 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
            >
              {!isReady && isPlaying ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={nextTrack}
              aria-label="Bài tiếp theo"
              className="p-3 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={cycleLoopMode}
              aria-label="Chế độ lặp"
              title={loopMode === 'one' ? 'Lặp 1 bài' : 'Lặp toàn danh sách'}
              className={`p-2.5 rounded-full transition-colors ${
                loopMode === 'one'
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-cyan-300'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10'
              }`}
            >
              {loopMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>
        </section>

        {/* Right: Pomodoro Clock + Volume + Single Ambient Switcher */}
        <section className="lg:col-span-6 space-y-4">
          {/* Pomodoro Timer Card (NO nested backdrop-blur!) */}
          <div
            className={`rounded-2xl border p-5 sm:p-6 bg-white/75 dark:bg-slate-900/70 transition-all duration-300 space-y-4 ${toneTokens.cardBorder} ${toneTokens.cardGlow}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  pomodoroMode === 'focus'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                }`}
              >
                {pomodoroMode === 'focus'
                  ? 'Đang ở phiên Tập trung'
                  : 'Đang ở phiên Nghỉ ngơi'}
              </span>

              <div className="flex items-center gap-1.5">
                {PRESET_ORDER.map((presetKey) => {
                  const active = pomodoroPreset === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => setPomodoroPreset(presetKey)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-indigo-400/50'
                      }`}
                    >
                      {POMODORO_PRESETS[presetKey].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-center py-2">
              <ZenPomodoroCountdown />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={togglePomodoro}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors ${
                  pomodoroRunning
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {pomodoroRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Tạm dừng phiên
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Bắt đầu phiên
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => resetPomodoro()}
                aria-label="Đặt lại Pomodoro"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-white/15 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Volume, Sleep Timer & Single Ambient Card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/70 p-4 sm:p-5 space-y-4">
            {/* Master Volume */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/10"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-indigo-500 dark:text-cyan-400" />
                )}
              </button>
              <StudioSlider
                value={isMuted ? 0 : volume}
                min={0}
                max={100}
                step={1}
                ariaLabel="Âm lượng tổng trong Zen Mode"
                tone="indigo"
                heightClass="h-1.5"
                onChange={(val) => setVolume(val)}
                className="flex-1"
              />
              <span className="w-10 text-right text-xs font-mono tabular-nums">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>

            {/* Sleep Timer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/75 dark:border-white/10">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                Hẹn giờ tắt nhạc
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {SLEEP_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSleepTimer(opt.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      sleepTimerMode === opt.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <ZenSleepCountdown />
              </div>
            </div>

            {/* Single Preset Ambient Selector */}
            <div className="pt-3 border-t border-slate-200/75 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                  Âm nền tập trung
                </span>
                {ambientPreset !== 'off' && (
                  <span className="text-[11px] font-mono tabular-nums text-cyan-600 dark:text-cyan-300">
                    {ambientVolume}%
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {AMBIENT_OPTIONS.map(({ id, label, Icon }) => {
                  const active = ambientPreset === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAmbientPreset(id)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                          : 'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-cyan-500/35'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {ambientPreset !== 'off' && (
                <StudioSlider
                  value={ambientVolume}
                  min={0}
                  max={100}
                  step={1}
                  ariaLabel="Âm lượng âm nền Zen Mode"
                  tone="indigo"
                  heightClass="h-1.5"
                  onChange={(val) => setAmbientVolume(val)}
                />
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Subtle Shortcut Hint */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-8 pb-5 text-center text-[11px] text-slate-500 dark:text-slate-400">
        Phím tắt toàn app: <span className="font-mono">Alt+P</span> Phát/Dừng •{' '}
        <span className="font-mono">Alt+M</span> Tắt tiếng •{' '}
        <span className="font-mono">Alt+N</span> Chuyển bài
      </footer>
    </div>,
    document.body
  );
}

/**
 * Unmounts completely when `isZenModeOpen` is false so Zen Mode costs zero DOM/listeners at rest.
 */
export default function ZenFocusOverlay() {
  const isZenModeOpen = useMusicStore((s) => s.isZenModeOpen);
  const setZenModeOpen = useMusicStore((s) => s.setZenModeOpen);

  if (!isZenModeOpen) {
    return null;
  }

  return <ZenFocusContent onClose={() => setZenModeOpen(false)} />;
}
