'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  CloudRain,
  Disc3,
  Eye,
  EyeOff,
  ListMusic,
  Loader2,
  Minimize2,
  Moon,
  Palette,
  Pause,
  Pencil,
  Pin,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Target,
  Timer,
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
  StudioContextTone,
  StudioEqualizer,
  StudioSceneBackdrop,
  StudioSceneMode,
  StudioSlider,
  StudioTurntable,
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

const SCENE_MODES: { id: StudioSceneMode; label: string; desc: string }[] = [
  { id: 'aura', label: 'Album Aura', desc: 'Mờ khí quyển bài hát' },
  { id: 'midnight', label: 'Pure Midnight', desc: 'Đen sâu tĩnh mịch' },
  { id: 'glow', label: 'Ambient Glow', desc: 'Hào quang Pomodoro' },
];

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
      <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
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
    <div className="text-5xl sm:text-6xl font-mono font-bold tabular-nums tracking-tight text-white drop-shadow-sm">
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
    <span className="text-xs font-mono tabular-nums text-indigo-400">
      {formatSecondsMmSs(sleepSecondsLeft, true)}
    </span>
  );
}

/**
 * Session Intention inline editor.
 */
function SessionIntentionBar() {
  const [intention, setIntention] = useState('Ôn luyện tập trung cùng AnanQuiz');
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('anan_zen_intention');
      if (saved) setIntention(saved);
    } catch {}
  }, []);

  const handleStartEdit = () => {
    setTempText(intention);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSave = () => {
    const trimmed = tempText.trim();
    const finalVal = trimmed || 'Ôn luyện tập trung cùng AnanQuiz';
    setIntention(finalVal);
    setIsEditing(false);
    try {
      localStorage.setItem('anan_zen_intention', finalVal);
    } catch {}
  };

  return (
    <div className="flex items-center justify-center">
      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="flex items-center gap-1.5 w-full max-w-sm"
        >
          <input
            ref={inputRef}
            type="text"
            value={tempText}
            onChange={(e) => setTempText(e.target.value)}
            onBlur={handleSave}
            placeholder="Nhập mục tiêu phiên học (VD: 50 câu PRF192)"
            maxLength={60}
            className="flex-1 px-3 py-1 rounded-xl text-xs bg-black/60 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            className="p-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={handleStartEdit}
          title="Nhấn để chỉnh sửa mục tiêu phiên học"
          className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors"
        >
          <Target className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="truncate max-w-[240px] sm:max-w-[320px]">
            {intention}
          </span>
          <Pencil className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
        </button>
      )}
    </div>
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
  const pomodoroSecondsLeft = useMusicStore((s) => s.pomodoroSecondsLeft);
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);
  const pomodoroCompletedToday = useMusicStore((s) => s.pomodoroCompletedToday);

  const sleepTimerMode = useMusicStore((s) => s.sleepTimerMode);

  const selectTrack = useMusicStore((s) => s.selectTrack);
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

  // New Studio WOW state: Scene Mode & Pure Zen Mode & Right Column View
  const [sceneMode, setSceneMode] = useState<StudioSceneMode>('aura');
  const [isPureZen, setIsPureZen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'focus' | 'queue'>('focus');

  // Load Scene preference
  useEffect(() => {
    try {
      const savedScene = localStorage.getItem('anan_zen_scene') as StudioSceneMode | null;
      if (savedScene && ['aura', 'midnight', 'glow'].includes(savedScene)) {
        setSceneMode(savedScene);
      }
    } catch {}
  }, []);

  const handleChangeScene = (nextScene: StudioSceneMode) => {
    setSceneMode(nextScene);
    try {
      localStorage.setItem('anan_zen_scene', nextScene);
    } catch {}
  };

  // Keyboard shortcuts: Space (Play/Pause), M (Mute), Z (Pure Zen), Esc (Close/Exit Pure)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (isPureZen) {
          setIsPureZen(false);
        } else {
          onClose();
        }
        return;
      }

      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        setIsPureZen((prev) => !prev);
      } else if (e.key === 'ArrowRight' && (e.altKey || !e.ctrlKey)) {
        nextTrack();
      } else if (e.key === 'ArrowLeft' && (e.altKey || !e.ctrlKey)) {
        prevTrack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isPureZen, togglePlay, toggleMute, nextTrack, prevTrack]);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) ?? tracks[0],
    [tracks, currentTrackId]
  );

  const tone = getStudioContextTone(pomodoroRunning, pomodoroMode);
  const toneTokens = STUDIO_TONE_TOKENS[tone];

  const cycleLoopMode = () => {
    setLoopMode(loopMode === 'all' ? 'one' : 'all');
  };

  // Calculate Pomodoro Progress ratio and estimated completion time
  const currentPresetCfg = POMODORO_PRESETS[pomodoroPreset] || POMODORO_PRESETS['25/5'];
  const totalModeSeconds =
    pomodoroMode === 'focus'
      ? currentPresetCfg.focusSeconds
      : currentPresetCfg.breakSeconds;
  const progressRatio = Math.min(
    1,
    Math.max(0, 1 - pomodoroSecondsLeft / totalModeSeconds)
  );

  const estimatedEndTimeStr = useMemo(() => {
    if (!pomodoroRunning) return null;
    const est = new Date(Date.now() + pomodoroSecondsLeft * 1000);
    const hh = String(est.getHours()).padStart(2, '0');
    const mm = String(est.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }, [pomodoroRunning, pomodoroSecondsLeft]);

  if (typeof document === 'undefined' || !currentTrack) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zen Focus Studio"
      className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30"
    >
      {/* Immersive Scene Backdrop: Aura / Midnight / Glow */}
      <StudioSceneBackdrop
        scene={sceneMode}
        videoId={currentTrack.videoId}
        tone={tone}
      />

      {/* Top Navigation Bar (Fades smoothly in Pure Zen mode) */}
      <header
        className={`relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-8 pt-5 flex items-center justify-between gap-3 transition-opacity duration-300 ${
          isPureZen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shadow-sm">
            <Disc3 className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white">
                Zen Focus Studio
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${toneTokens.badge}`}
              >
                {pomodoroRunning
                  ? pomodoroMode === 'focus'
                    ? 'Đang Focus'
                    : 'Đang Nghỉ'
                  : 'Midnight Vinyl'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Hôm nay: <strong className="text-white">{pomodoroCompletedToday}</strong> phiên • Phím tắt{' '}
              <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300">
                Space
              </kbd>{' '}
              (Phát/Dừng),{' '}
              <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px] text-slate-300">
                Z
              </kbd>{' '}
              (Pure Zen)
            </p>
          </div>
        </div>

        {/* Top Right Actions: Scene Mode Switcher, Pure Zen, Exit */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Scene Selector */}
          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.06] border border-white/10">
            {SCENE_MODES.map((sc) => {
              const active = sceneMode === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleChangeScene(sc.id)}
                  title={sc.desc}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sc.label.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Pure Zen Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsPureZen(true)}
            title="Bật chế độ Pure Zen siêu tối giản (Phím tắt Z)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Pure Zen</span>
          </button>

          {/* Minimize / Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Thoát chế độ Zen (Esc)"
            title="Thoát chế độ Zen (Esc)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thu nhỏ</span>
            <X className="w-3.5 h-3.5 sm:hidden" />
          </button>
        </div>
      </header>

      {/* Pure Zen floating banner when active */}
      {isPureZen && (
        <div className="relative z-20 mx-auto pt-4 flex items-center justify-center animate-fade-in">
          <button
            type="button"
            onClick={() => setIsPureZen(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/60 border border-white/15 text-slate-300 hover:text-white shadow-lg hover:border-indigo-400 transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chế độ Pure Zen • Bấm <kbd className="px-1 py-0.2 bg-white/15 rounded text-[10px]">Z</kbd> hoặc click để hiện đầy đủ</span>
          </button>
        </div>
      )}

      {/* Main Studio Stage */}
      <main className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1">
        {/* Left: Turntable Deck & Music Transport */}
        <section
          className={`flex flex-col items-center text-center space-y-4 sm:space-y-5 transition-all duration-500 ${
            isPureZen ? 'lg:col-span-12 scale-105' : 'lg:col-span-6'
          }`}
        >
          {/* Turntable Deck: Platter + Spinning Vinyl + Tonearm */}
          <StudioTurntable
            videoId={currentTrack.videoId}
            title={currentTrack.title}
            isPlaying={isPlaying}
            tone={tone}
          />

          {/* Track Info & Equalizer / Pause Status */}
          <div className="space-y-1.5 max-w-md">
            <div className="flex items-center justify-center gap-2">
              {isPlaying ? (
                <StudioEqualizer isPlaying={true} tone={tone} size="md" />
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] border border-white/10 text-slate-400">
                  <Pause className="w-2.5 h-2.5" />
                  Tạm dừng
                </span>
              )}
              <h2 className="text-lg sm:text-xl font-bold truncate max-w-[280px] sm:max-w-[360px] text-white">
                {currentTrack.title}
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              {currentTrack.artist}
              {currentTrack.playlistId ? ' • YouTube Playlist' : ''}
              {isDucked ? ' • Tự giảm 15% khi thi' : ''}
            </p>
          </div>

          {/* Session Intention Line */}
          <SessionIntentionBar />

          {/* Seeker Slider */}
          <ZenSeekBar />

          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Phát ngẫu nhiên"
              aria-pressed={isShuffle}
              className={`p-2.5 rounded-full transition-colors ${
                isShuffle
                  ? 'bg-indigo-500/20 text-cyan-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={prevTrack}
              aria-label="Bài trước (Mũi tên trái)"
              className="p-3 rounded-full text-slate-200 hover:bg-white/10 transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Tạm dừng (Space)' : 'Phát nhạc (Space)'}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/35 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center ring-2 ring-white/20"
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
              aria-label="Bài tiếp theo (Mũi tên phải)"
              className="p-3 rounded-full text-slate-200 hover:bg-white/10 transition-colors"
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
                  ? 'bg-indigo-500/20 text-cyan-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
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

        {/* Right: Studio Focus Stage OR Quick Queue (hidden in Pure Zen) */}
        {!isPureZen && (
          <section className="lg:col-span-6 space-y-4">
            {/* Right Stage Tabs Header: Pomodoro vs Quick Queue */}
            <div className="flex items-center justify-between p-1 rounded-xl bg-slate-900/60 border border-white/10">
              <button
                type="button"
                onClick={() => setRightPanelTab('focus')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
                  rightPanelTab === 'focus'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                Phiên Tập Trung
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('queue')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
                  rightPanelTab === 'queue'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                Danh Sách Phát ({tracks.length})
              </button>
            </div>

            {/* TAB CONTENT: FOCUS STAGE */}
            {rightPanelTab === 'focus' ? (
              <>
                {/* Pomodoro Timer Stage Card */}
                <div
                  className={`relative rounded-2xl border p-5 sm:p-6 bg-slate-900/60 backdrop-blur-xl transition-all duration-300 space-y-4 shadow-2xl overflow-hidden ${toneTokens.cardBorder} ${toneTokens.cardGlow}`}
                >
                  {/* Top Slim Progress Bar */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full w-full origin-left bg-gradient-to-r ${toneTokens.fillGradient} transition-transform duration-500`}
                      style={{ transform: `scaleX(${progressRatio})` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* Status Pill: Neutral when stopped, glowing when active */}
                    {pomodoroRunning ? (
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          pomodoroMode === 'focus'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {pomodoroMode === 'focus'
                          ? 'Đang tập trung'
                          : 'Đang nghỉ ngơi'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/[0.06] border border-white/10 text-slate-300">
                        Sẵn sàng • {currentPresetCfg.label}
                      </span>
                    )}

                    {/* Presets 15/3, 25/5, 50/10 */}
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
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                            }`}
                          >
                            {POMODORO_PRESETS[presetKey].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Big Countdown */}
                  <div className="text-center py-1">
                    <ZenPomodoroCountdown />
                    {estimatedEndTimeStr ? (
                      <p className="mt-1 text-xs text-slate-400 font-medium">
                        Dự kiến {pomodoroMode === 'focus' ? 'nghỉ lúc' : 'bắt đầu lại lúc'}{' '}
                        <strong className="text-white font-mono">{estimatedEndTimeStr}</strong>
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">
                        Thời lượng: {Math.round(currentPresetCfg.focusSeconds / 60)} phút tập trung
                      </p>
                    )}
                  </div>

                  {/* Pomodoro Action Buttons */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={togglePomodoro}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-all ${
                        pomodoroRunning
                          ? 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/25'
                          : 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/25'
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
                      className="p-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Master Volume, Sleep Timer & Single Ambient Card */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 space-y-4 shadow-xl">
                  {/* Master Volume */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Bật tiếng (M)' : 'Tắt tiếng (M)'}
                      title="Tắt / Bật tiếng (Phím M)"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-cyan-400" />
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
                    <span className="w-10 text-right text-xs font-mono tabular-nums text-slate-300">
                      {isMuted ? '0%' : `${volume}%`}
                    </span>
                  </div>

                  {/* Sleep Timer */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      Hẹn giờ tắt nhạc
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {SLEEP_OPTIONS.map((opt) => {
                        const isOff = opt.id === 'off';
                        const isSelected = sleepTimerMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSleepTimer(opt.id)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                              isSelected && !isOff
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : isSelected && isOff
                                ? 'bg-white/10 text-slate-300 border border-white/15'
                                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      <ZenSleepCountdown />
                    </div>
                  </div>

                  {/* Single Preset Ambient Selector */}
                  <div className="pt-3 border-t border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Âm nền không gian
                      </span>
                      {ambientPreset !== 'off' && (
                        <span className="text-[11px] font-mono tabular-nums text-cyan-400">
                          {ambientVolume}%
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {AMBIENT_OPTIONS.map(({ id, label, Icon }) => {
                        const isOff = id === 'off';
                        const isSelected = ambientPreset === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setAmbientPreset(id)}
                            className={`py-2 px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                              isSelected && !isOff
                                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/20'
                                : isSelected && isOff
                                ? 'bg-white/10 border-white/15 text-slate-300'
                                : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
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
              </>
            ) : (
              /* TAB CONTENT: QUICK QUEUE (DANH SÁCH BÀI HÁT TẠI CHỖ) */
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 space-y-2 shadow-2xl max-h-[460px] flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-semibold text-slate-300">
                  <span>Danh sách phát ({tracks.length} bài)</span>
                  <span className="text-[11px] text-slate-500">Bấm bài để phát</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {tracks.map((t, idx) => {
                    const isCurrent = t.id === currentTrackId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTrack(t.id)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left border transition-all ${
                          isCurrent
                            ? 'bg-indigo-500/20 border-indigo-500/40 text-white shadow-sm'
                            : 'bg-white/[0.02] border-transparent hover:bg-white/[0.06] text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-mono font-semibold ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {isCurrent && isPlaying ? (
                            <StudioEqualizer isPlaying={true} tone={tone} size="sm" />
                          ) : (
                            idx + 1
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold truncate text-white">
                              {t.title}
                            </p>
                            {t.isPinned && (
                              <Pin className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            )}
                            {t.playlistId && (
                              <span className="px-1 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300">
                                Playlist
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {t.artist}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Subtle Shortcut Bar (Fades in Pure Zen) */}
      <footer
        className={`relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-8 pb-4 text-center text-[11px] text-slate-400 transition-opacity duration-300 ${
          isPureZen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        Phím tắt: <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 font-mono">Space</kbd> Phát/Dừng •{' '}
        <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 font-mono">M</kbd> Tắt tiếng •{' '}
        <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 font-mono">Z</kbd> Pure Zen •{' '}
        <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 font-mono">← / →</kbd> Chuyển bài •{' '}
        <kbd className="px-1 py-0.5 rounded bg-white/10 text-slate-300 font-mono">Esc</kbd> Thu nhỏ
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
