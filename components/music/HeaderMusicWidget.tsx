'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  CloudRain,
  Disc3,
  Headphones,
  ListMusic,
  Loader2,
  Maximize2,
  Moon,
  Pause,
  PictureInPicture2,
  Pin,
  Play,
  Plus,
  Radio,
  Repeat,
  Repeat1,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import {
  formatSecondsMmSs,
  getTrackErrorKey,
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
  desc: string;
  Icon: typeof Wind;
}[] = [
  { id: 'off', label: 'Tắt', desc: 'Chỉ nhạc chính', Icon: VolumeX },
  { id: 'rain', label: 'Mưa rơi', desc: 'Tiếng mưa dịu', Icon: CloudRain },
  { id: 'brown', label: 'Brown Noise', desc: 'Sóng trầm ổn định', Icon: Wind },
];

/**
 * Isolated 1-second subscriber so timeline updates do not re-render HeaderMusicWidget or its track list.
 */
function HeaderSeekBar() {
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
        ariaLabel="Tua thời gian phát nhạc"
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
      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
        <span>{formatSecondsMmSs(displayTime)}</span>
        <span>{duration > 0 ? formatSecondsMmSs(duration) : '--:--'}</span>
      </div>
    </div>
  );
}

/**
 * Isolated Pomodoro live pill badge in Header so 1s timer ticks stay scoped.
 */
function HeaderPomodoroChip() {
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);
  const pomodoroMode = useMusicStore((s) => s.pomodoroMode);
  const pomodoroSecondsLeft = useMusicStore((s) => s.pomodoroSecondsLeft);

  if (!pomodoroRunning) return null;

  return (
    <span
      className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tabular-nums border ${
        pomodoroMode === 'focus'
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
      }`}
    >
      {formatSecondsMmSs(pomodoroSecondsLeft, true)}
    </span>
  );
}

function HeaderSleepCountdown() {
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
    <span className="ml-1 text-[10px] font-mono tabular-nums text-indigo-600 dark:text-cyan-300">
      {formatSecondsMmSs(sleepSecondsLeft, true)}
    </span>
  );
}

function HeaderPomodoroCountdown() {
  const pomodoroSecondsLeft = useMusicStore((s) => s.pomodoroSecondsLeft);

  return (
    <div className="text-xl font-mono font-bold tabular-nums tracking-tight">
      {formatSecondsMmSs(pomodoroSecondsLeft, true)}
    </div>
  );
}

export default function HeaderMusicWidget() {
  const tracks = useMusicStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isReady = useMusicStore((s) => s.isReady);
  const isMuted = useMusicStore((s) => s.isMuted);
  const volume = useMusicStore((s) => s.volume);
  const isDucked = useMusicStore((s) => s.isDucked);
  const loopMode = useMusicStore((s) => s.loopMode);
  const isShuffle = useMusicStore((s) => s.isShuffle);
  const trackErrors = useMusicStore((s) => s.trackErrors);
  const liveVideoId = useMusicStore((s) => s.liveVideoId);
  const liveTitle = useMusicStore((s) => s.liveTitle);
  const liveArtist = useMusicStore((s) => s.liveArtist);
  const livePlaylistIndex = useMusicStore((s) => s.livePlaylistIndex);
  const livePlaylistTotal = useMusicStore((s) => s.livePlaylistTotal);

  const ambientPreset = useMusicStore((s) => s.ambientPreset);
  const ambientVolume = useMusicStore((s) => s.ambientVolume);

  const pomodoroPreset = useMusicStore((s) => s.pomodoroPreset);
  const pomodoroMode = useMusicStore((s) => s.pomodoroMode);
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);
  const pomodoroAutoPauseMusic = useMusicStore(
    (s) => s.pomodoroAutoPauseMusic
  );
  const pomodoroCompletedToday = useMusicStore((s) => s.pomodoroCompletedToday);
  const examAutoDuckMusic = useMusicStore((s) => s.examAutoDuckMusic);

  const sleepTimerMode = useMusicStore((s) => s.sleepTimerMode);
  const showMiniPlayer = useMusicStore((s) => s.showMiniPlayer);

  const selectTrack = useMusicStore((s) => s.selectTrack);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const toggleMute = useMusicStore((s) => s.toggleMute);
  const setVolume = useMusicStore((s) => s.setVolume);
  const setLoopMode = useMusicStore((s) => s.setLoopMode);
  const toggleShuffle = useMusicStore((s) => s.toggleShuffle);
  const nextTrack = useMusicStore((s) => s.nextTrack);
  const prevTrack = useMusicStore((s) => s.prevTrack);
  const addCustomTrackAsync = useMusicStore((s) => s.addCustomTrackAsync);
  const removeCustomTrack = useMusicStore((s) => s.removeCustomTrack);
  const togglePinTrack = useMusicStore((s) => s.togglePinTrack);
  const moveTrack = useMusicStore((s) => s.moveTrack);

  const setAmbientPreset = useMusicStore((s) => s.setAmbientPreset);
  const setAmbientVolume = useMusicStore((s) => s.setAmbientVolume);

  const togglePomodoro = useMusicStore((s) => s.togglePomodoro);
  const setPomodoroPreset = useMusicStore((s) => s.setPomodoroPreset);
  const resetPomodoro = useMusicStore((s) => s.resetPomodoro);
  const setPomodoroAutoPause = useMusicStore((s) => s.setPomodoroAutoPause);
  const setExamAutoDuck = useMusicStore((s) => s.setExamAutoDuck);
  const setSleepTimer = useMusicStore((s) => s.setSleepTimer);
  const setZenModeOpen = useMusicStore((s) => s.setZenModeOpen);
  const setShowMiniPlayer = useMusicStore((s) => s.setShowMiniPlayer);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'playlist' | 'focus'>('playlist');
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number }>({
    top: 68,
    right: 16,
  });

  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [formMsg, setFormMsg] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const triggerWrapRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) ?? tracks[0],
    [tracks, currentTrackId]
  );

  const tone = getStudioContextTone(pomodoroRunning, pomodoroMode);
  const toneTokens = STUDIO_TONE_TOKENS[tone];

  // Calculate anchor coordinates relative to viewport
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerWrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rightOffset = Math.max(12, window.innerWidth - rect.right);
      const topOffset = Math.min(window.innerHeight - 120, rect.bottom + 10);
      setCoords({ top: topOffset, right: rightOffset });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Outside click & Escape handler
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerWrapRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const cycleLoopMode = () => {
    setLoopMode(loopMode === 'all' ? 'one' : 'all');
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || isAdding) return;

    setFormMsg(null);
    setIsAdding(true);
    try {
      const res = await addCustomTrackAsync(
        customUrl.trim(),
        customTitle.trim() || undefined
      );
      if (res.ok) {
        setCustomUrl('');
        setCustomTitle('');
        setFormMsg({ type: 'ok', text: 'Đã thêm vào danh sách phát.' });
      } else {
        setFormMsg({
          type: 'err',
          text: res.error || 'Không nhận diện được link YouTube hợp lệ.',
        });
      }
    } finally {
      setIsAdding(false);
    }
  };

  const statusBadgeText = pomodoroRunning
    ? pomodoroMode === 'focus'
      ? 'Focus • Warm Amber'
      : 'Nghỉ ngơi • Emerald'
    : isPlaying
    ? 'Đang phát Studio'
    : 'Sẵn sàng';

  const currentErrorKey = currentTrack ? getTrackErrorKey(currentTrack) : '';
  const hasCurrentTrackError = Boolean(
    currentErrorKey && trackErrors[currentErrorKey]
  );
  const displayVideoId = liveVideoId || currentTrack?.videoId || '';
  const displayTitle = liveTitle || currentTrack?.title || 'Focus Studio';
  const displayArtist = liveArtist || currentTrack?.artist || '';

  return (
    <>
      {/* Header Pill Trigger */}
      <div
        ref={triggerWrapRef}
        className={`inline-flex items-center rounded-full border transition-all duration-200 ${
          isPlaying || pomodoroRunning
            ? `${toneTokens.cardBorder} bg-indigo-500/10 dark:bg-white/[0.06] ${toneTokens.cardGlow}`
            : 'border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] hover:border-indigo-400/40'
        }`}
      >
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Tạm dừng nhạc nền' : 'Phát nhạc nền'}
          title="Phát / Tạm dừng (Alt + P)"
          className="pl-2.5 pr-1.5 py-1.5 flex items-center justify-center rounded-l-full text-slate-700 dark:text-slate-200 hover:text-indigo-500 dark:hover:text-cyan-300 transition-colors"
        >
          {isPlaying ? (
            <StudioEqualizer isPlaying={true} tone={tone} size="sm" />
          ) : (
            <Headphones className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="Mở Focus Studio"
          className="pr-2.5 pl-1 py-1.5 flex items-center gap-1.5 rounded-r-full text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[165px] sm:max-w-[205px]"
        >
          <span className="truncate">
            {currentTrack ? displayTitle : 'Focus Studio'}
          </span>
          <HeaderPomodoroChip />
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Portaled Studio Glass Dialog */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="AnanQuiz Focus Studio"
            style={{
              top: `${coords.top}px`,
              right: `${coords.right}px`,
            }}
            className="glass-elevated fixed z-[80] w-[calc(100vw-24px)] sm:w-[404px] max-h-[calc(100vh-92px)] overflow-y-auto rounded-2xl p-4 text-slate-900 dark:text-slate-100"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/75 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                  <Disc3 className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold leading-tight flex items-center gap-1.5">
                    Focus Studio
                    {ambientPreset !== 'off' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25">
                        {ambientPreset === 'rain' ? 'Mưa' : 'Brown'}
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Midnight Vinyl • Alt+P / M / N
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setZenModeOpen(true);
                    setIsOpen(false);
                  }}
                  title="Mở chế độ Zen toàn màn hình"
                  aria-label="Mở chế độ Zen toàn màn hình"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-cyan-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowMiniPlayer(!showMiniPlayer)}
                  title={
                    showMiniPlayer
                      ? 'Ẩn Mini-Player nổi'
                      : 'Ghim Mini-Player nổi'
                  }
                  aria-label="Bật tắt Mini-Player nổi"
                  className={`p-1.5 rounded-lg transition-colors ${
                    showMiniPlayer
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10'
                  }`}
                >
                  <PictureInPicture2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Đóng Focus Studio"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Now Playing Hero Card (NO inner backdrop-blur!) */}
            {currentTrack && (
              <div
                className={`mt-3 rounded-xl border p-3 transition-all duration-300 bg-slate-900/[0.035] dark:bg-white/[0.035] ${toneTokens.cardBorder} ${toneTokens.cardGlow}`}
              >
                <div className="flex items-center gap-3">
                  <VinylArtwork
                    videoId={displayVideoId}
                    title={displayTitle}
                    isPlaying={isPlaying}
                    tone={tone}
                    size="md"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${toneTokens.badge}`}
                      >
                        {statusBadgeText}
                      </span>
                      {currentTrack.playlistId && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                          <ListMusic className="w-2.5 h-2.5" />
                          {livePlaylistTotal > 0
                            ? `Bài ${livePlaylistIndex + 1}/${livePlaylistTotal}`
                            : 'Playlist'}
                        </span>
                      )}
                      {isDucked && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/25">
                          Thi: 15%
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                      {displayTitle}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {displayArtist}
                    </p>
                  </div>

                  <StudioEqualizer
                    isPlaying={isPlaying}
                    tone={tone}
                    size="md"
                    className="shrink-0"
                  />
                </div>

                {hasCurrentTrackError && (
                  <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5">
                    {trackErrors[currentErrorKey].message}
                  </p>
                )}

                {/* Timeline Seekbar */}
                <div className="mt-3">
                  <HeaderSeekBar />
                </div>

                {/* Transport Row */}
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleShuffle}
                    aria-label="Phát ngẫu nhiên"
                    aria-pressed={isShuffle}
                    title="Phát ngẫu nhiên"
                    className={`p-1.5 rounded-lg transition-colors ${
                      isShuffle
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-cyan-300'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={prevTrack}
                      aria-label="Bài trước"
                      title="Bài trước"
                      className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
                      className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                    >
                      {!isReady && isPlaying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={nextTrack}
                      aria-label="Bài tiếp theo"
                      title="Bài tiếp theo (Alt + N)"
                      className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={cycleLoopMode}
                    aria-label="Chế độ lặp"
                    title={
                      loopMode === 'one' ? 'Lặp 1 bài' : 'Lặp toàn danh sách'
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      loopMode === 'one'
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-cyan-300'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {loopMode === 'one' ? (
                      <Repeat1 className="w-4 h-4" />
                    ) : (
                      <Repeat className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Studio Tabs (#8 Sliding Pill Indicator) */}
            <div className="relative mt-3 grid grid-cols-2 p-1 rounded-xl bg-slate-200/70 dark:bg-white/[0.05]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/2)] rounded-lg bg-white dark:bg-slate-800 shadow-sm transition-transform duration-300 ease-out"
                style={{
                  transform: `translate3d(${activeTab === 'playlist' ? 0 : 100}%, 0, 0)`,
                }}
              />
              <button
                type="button"
                onClick={() => setActiveTab('playlist')}
                className={`relative z-10 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === 'playlist'
                    ? 'text-indigo-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                Nhạc &amp; Danh sách
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('focus')}
                className={`relative z-10 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === 'focus'
                    ? 'text-indigo-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                Pomodoro &amp; Môi trường
              </button>
            </div>

            {/* TAB 1: PLAYLIST, VOLUME, SLEEP & CUSTOM YOUTUBE */}
            {activeTab === 'playlist' ? (
              <div className="mt-3 space-y-3">
                {/* Volume Control */}
                <div className="rounded-xl border border-slate-200/75 dark:border-white/10 bg-slate-900/[0.025] dark:bg-white/[0.025] px-3 py-2.5 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
                      title="Tắt / Bật tiếng (Alt + M)"
                      className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10"
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
                      ariaLabel="Âm lượng nhạc chính"
                      tone="indigo"
                      heightClass="h-1.5"
                      onChange={(val) => setVolume(val)}
                      className="flex-1"
                    />
                    <span className="w-11 text-right text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {isMuted ? '0%' : `${volume}%`}
                    </span>
                  </div>

                  {/* Sleep Timer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
                      <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      Hẹn giờ
                    </span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {SLEEP_OPTIONS.map((opt) => {
                        const active = sleepTimerMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSleepTimer(opt.id)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                              active
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-200/70 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-white/10'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      <HeaderSleepCountdown />
                    </div>
                  </div>
                </div>

                {/* Track List */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {tracks.map((track, idx) => {
                    const isActive = track.id === currentTrackId;
                    const errKey = getTrackErrorKey(track);
                    const hasError = Boolean(trackErrors[errKey]);

                    return (
                      <div
                        key={track.id}
                        className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 border transition-colors ${
                          isActive
                            ? 'bg-indigo-500/12 border-indigo-500/35 dark:border-indigo-400/35'
                            : 'bg-transparent border-transparent hover:bg-slate-200/50 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => selectTrack(track.id)}
                          className="min-w-0 flex-1 flex items-center gap-2.5 text-left"
                        >
                          <div
                            className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-mono ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isActive && isPlaying ? (
                              <StudioEqualizer
                                isPlaying={true}
                                tone={tone}
                                size="sm"
                              />
                            ) : (
                              idx + 1
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p
                                className={`text-xs font-medium truncate ${
                                  isActive
                                    ? 'text-indigo-700 dark:text-cyan-300'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {track.title}
                              </p>
                              {track.playlistId && (
                                <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                                  Playlist
                                </span>
                              )}
                              {hasError && (
                                <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-300">
                                  Lỗi nhúng
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {track.artist}
                            </p>
                          </div>
                        </button>

                        {/* Track Row Actions: Pin, Move Up/Down, Delete */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => togglePinTrack(track.id)}
                            aria-label={
                              track.isPinned ? 'Bỏ ghim bài' : 'Ghim yêu thích'
                            }
                            title={
                              track.isPinned ? 'Bỏ ghim bài' : 'Ghim lên đầu'
                            }
                            className={`p-1 rounded-md transition-colors ${
                              track.isPinned
                                ? 'text-amber-500 bg-amber-500/15'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200/70 dark:hover:bg-white/10'
                            }`}
                          >
                            <Pin className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveTrack(track.id, 'up')}
                            aria-label="Di chuyển lên"
                            title="Lên"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === tracks.length - 1}
                            onClick={() => moveTrack(track.id, 'down')}
                            aria-label="Di chuyển xuống"
                            title="Xuống"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {track.isCustom && (
                            <button
                              type="button"
                              onClick={() => removeCustomTrack(track.id)}
                              aria-label="Xóa bài tự thêm"
                              title="Xóa"
                              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add YouTube Video or Playlist Form */}
                <form
                  onSubmit={handleAddTrack}
                  className="rounded-xl border border-slate-200/75 dark:border-white/10 bg-slate-900/[0.025] dark:bg-white/[0.025] p-2.5 space-y-2"
                >
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-indigo-500" />
                    Thêm YouTube Video hoặc Playlist
                  </p>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Dán link YouTube video hoặc ?list=... playlist"
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Tên gợi nhớ (tuỳ chọn)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!customUrl.trim() || isAdding}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white inline-flex items-center gap-1 transition-colors"
                    >
                      {isAdding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Thêm
                    </button>
                  </div>
                  {formMsg && (
                    <p
                      className={`text-[11px] ${
                        formMsg.type === 'ok'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formMsg.text}
                    </p>
                  )}
                </form>
              </div>
            ) : (
              /* TAB 2: POMODORO & AMBIENT SOUNDSCAPE (SINGLE PRESET) */
              <div className="mt-3 space-y-3">
                {/* Pomodoro Studio Card */}
                <div
                  className={`rounded-xl border p-3 space-y-3 bg-slate-900/[0.025] dark:bg-white/[0.025] ${toneTokens.cardBorder}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          pomodoroMode === 'focus'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {pomodoroMode === 'focus' ? 'Phiên Focus' : 'Nghỉ ngơi'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Hôm nay: <strong>{pomodoroCompletedToday}</strong> phiên
                      </span>
                    </div>

                    <HeaderPomodoroCountdown />
                  </div>

                  {/* Presets: 15/3 | 25/5 | 50/10 */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRESET_ORDER.map((presetKey) => {
                      const presetCfg = POMODORO_PRESETS[presetKey];
                      const active = pomodoroPreset === presetKey;
                      return (
                        <button
                          key={presetKey}
                          type="button"
                          onClick={() => setPomodoroPreset(presetKey)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-white/60 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400/50'
                          }`}
                        >
                          {presetCfg.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Pomodoro Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePomodoro}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors ${
                        pomodoroRunning
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-indigo-600 hover:bg-indigo-500'
                      }`}
                    >
                      {pomodoroRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          Tạm dừng phiên
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          Bắt đầu Pomodoro
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPomodoro()}
                      aria-label="Đặt lại Pomodoro"
                      title="Đặt lại đồng hồ"
                      className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Smart Pomodoro + Exam Duck Options */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-white/10">
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pomodoroAutoPauseMusic}
                        onChange={(e) => setPomodoroAutoPause(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Tự tạm dừng nhạc khi chuyển sang phiên nghỉ
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={examAutoDuckMusic}
                        onChange={(e) => setExamAutoDuck(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Tự giảm âm lượng còn 15% khi đang làm bài thi
                    </label>
                  </div>
                </div>

                {/* Ambient Soundscape (Single Preset Only) */}
                <div className="rounded-xl border border-slate-200/75 dark:border-white/10 bg-slate-900/[0.025] dark:bg-white/[0.025] p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                      Âm nền không gian (Web Audio)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      0 MB tải mạng
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {AMBIENT_OPTIONS.map(({ id, label, desc, Icon }) => {
                      const active = ambientPreset === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setAmbientPreset(id)}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
                              : 'bg-white/50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-cyan-500/30'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 mb-1" />
                          <div className="text-[11px] font-semibold leading-tight">
                            {label}
                          </div>
                          <div className="text-[10px] opacity-75 truncate">
                            {desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {ambientPreset !== 'off' && (
                    <div className="flex items-center gap-2.5 pt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                        Âm lượng nền
                      </span>
                      <StudioSlider
                        value={ambientVolume}
                        min={0}
                        max={100}
                        step={1}
                        ariaLabel="Âm lượng âm nền"
                        tone="indigo"
                        heightClass="h-1.5"
                        onChange={(val) => setAmbientVolume(val)}
                        className="flex-1"
                      />
                      <span className="w-9 text-right text-[11px] font-mono tabular-nums">
                        {ambientVolume}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Mode Triggers */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMiniPlayer(!showMiniPlayer)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border inline-flex items-center justify-center gap-1.5 transition-colors ${
                      showMiniPlayer
                        ? 'bg-indigo-500/15 border-indigo-500/35 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-200/50 dark:hover:bg-white/10'
                    }`}
                  >
                    <PictureInPicture2 className="w-3.5 h-3.5" />
                    {showMiniPlayer ? 'Đang bật Mini-Player' : 'Ghim Mini-Player'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setZenModeOpen(true);
                      setIsOpen(false);
                    }}
                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:opacity-95 inline-flex items-center justify-center gap-1.5 shadow-sm transition-opacity"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Mở Zen Mode
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
