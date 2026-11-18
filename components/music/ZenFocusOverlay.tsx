'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Compass,
  Disc3,
  Eye,
  ListMusic,
  Loader2,
  Minimize2,
  Moon,
  Pause,
  Pencil,
  Pin,
  Play,
  Plus,
  Radio,
  Repeat,
  Repeat1,
  RotateCcw,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  Wind,
  X,
  Music,
  Smartphone,
} from 'lucide-react';
import {
  CURATED_FOCUS_STATIONS,
  CuratedStation,
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
  OuterReactiveVisuals,
  STUDIO_TONE_TOKENS,
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
  { id: 'aura', label: 'Album', desc: 'Mờ khí quyển động theo bìa nhạc' },
  { id: 'midnight', label: 'Midnight', desc: 'Đen sâu tối giản hoàn toàn' },
  { id: 'glow', label: 'Ambient', desc: 'Hào quang ngữ cảnh Pomodoro' },
];

const STATION_FILTERS: {
  id: 'all' | CuratedStation['category'];
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'lofi', label: 'Lofi Study' },
  { id: 'coding', label: 'Chill / Coding' },
  { id: 'piano', label: 'Piano Việt' },
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
 * Isolated 1-second Pomodoro progress bar on the top edge of the card.
 */
function ZenPomodoroProgressBar() {
  const pomodoroPreset = useMusicStore((s) => s.pomodoroPreset);
  const pomodoroMode = useMusicStore((s) => s.pomodoroMode);
  const pomodoroSecondsLeft = useMusicStore((s) => s.pomodoroSecondsLeft);
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);

  const tone = getStudioContextTone(pomodoroRunning, pomodoroMode);
  const fillGradient = STUDIO_TONE_TOKENS[tone].fillGradient;
  const cfg = POMODORO_PRESETS[pomodoroPreset] || POMODORO_PRESETS['25/5'];
  const totalSec =
    pomodoroMode === 'focus' ? cfg.focusSeconds : cfg.breakSeconds;
  const ratio = Math.min(1, Math.max(0, 1 - pomodoroSecondsLeft / totalSec));

  return (
    <div className="absolute top-0 inset-x-0 h-1 bg-white/[0.06] overflow-hidden">
      <div
        className={`h-full w-full origin-left bg-gradient-to-r ${fillGradient} transition-transform duration-500`}
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}

/**
 * Isolated 1-second Pomodoro countdown (#5 Rolling Odometer Digits) & estimated end time.
 */
function ZenPomodoroCountdown({ compact = false }: { compact?: boolean }) {
  const pomodoroPreset = useMusicStore((s) => s.pomodoroPreset);
  const pomodoroMode = useMusicStore((s) => s.pomodoroMode);
  const pomodoroSecondsLeft = useMusicStore((s) => s.pomodoroSecondsLeft);
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);

  const cfg = POMODORO_PRESETS[pomodoroPreset] || POMODORO_PRESETS['25/5'];
  const formatted = formatSecondsMmSs(pomodoroSecondsLeft, true);

  const estimatedEndTimeStr = useMemo(() => {
    if (!pomodoroRunning) return null;
    const est = new Date(Date.now() + pomodoroSecondsLeft * 1000);
    const hh = String(est.getHours()).padStart(2, '0');
    const mm = String(est.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }, [pomodoroRunning, pomodoroSecondsLeft]);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10">
        <Timer className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-sm font-mono font-bold tabular-nums text-white">
          {formatted}
        </span>
        {pomodoroRunning && (
          <span className="text-[11px] text-slate-400">
            • {pomodoroMode === 'focus' ? 'Focus' : 'Nghỉ'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-1">
      <div
        aria-label={formatted}
        className="text-5xl sm:text-6xl font-mono font-bold tabular-nums tracking-tight text-white drop-shadow-sm inline-flex items-center justify-center overflow-hidden"
      >
        {formatted.split('').map((ch, idx) =>
          ch === ':' ? (
            <span key={`sep-${idx}`} className="mx-0.5 text-indigo-300/80">
              :
            </span>
          ) : (
            <span
              key={`slot-${idx}-${ch}`}
              className="digit-roll-enter min-w-[0.62em] text-center"
            >
              {ch}
            </span>
          )
        )}
      </div>
      {estimatedEndTimeStr ? (
        <p className="mt-1 text-xs text-slate-400 font-medium">
          Dự kiến {pomodoroMode === 'focus' ? 'nghỉ lúc' : 'bắt đầu lại lúc'}{' '}
          <strong className="text-white font-mono">{estimatedEndTimeStr}</strong>
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-400">
          Thời lượng: {Math.round(cfg.focusSeconds / 60)} phút tập trung
        </p>
      )}
    </div>
  );
}

/**
 * Isolated Pomodoro Completion Milestone Burst (#7) when daily count increments.
 */
function ZenPomodoroMilestoneHalo() {
  const pomodoroCompletedToday = useMusicStore((s) => s.pomodoroCompletedToday);
  const prevCountRef = useRef(pomodoroCompletedToday);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    if (pomodoroCompletedToday > prevCountRef.current) {
      prevCountRef.current = pomodoroCompletedToday;
      setShowBurst(true);
      const timer = window.setTimeout(() => setShowBurst(false), 1800);
      return () => window.clearTimeout(timer);
    }
    prevCountRef.current = pomodoroCompletedToday;
  }, [pomodoroCompletedToday]);

  if (!showBurst) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="milestone-burst pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_32px_rgba(16,185,129,0.5)]"
      />
      <div className="pointer-events-none absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-md combo-pop-enter">
        +1 phiên hoàn thành!
      </div>
    </>
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
    } catch {
      // Ignore storage failures
    }
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
    } catch {
      // Ignore storage failures
    }
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
            className="flex-1 px-3 py-1 rounded-xl text-xs bg-black/70 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            aria-label="Lưu mục tiêu"
            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={handleStartEdit}
          title="Nhấn để chỉnh sửa mục tiêu phiên học"
          className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 transition-colors"
        >
          <Target className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="truncate max-w-[240px] sm:max-w-[320px]">
            {intention}
          </span>
          <Pencil className="w-2.5 h-2.5 opacity-45 group-hover:opacity-100" />
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
  const pomodoroCompletedToday = useMusicStore((s) => s.pomodoroCompletedToday);
  const pomodoroAutoPauseMusic = useMusicStore(
    (s) => s.pomodoroAutoPauseMusic
  );
  const examAutoDuckMusic = useMusicStore((s) => s.examAutoDuckMusic);
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
  const setPomodoroAutoPause = useMusicStore((s) => s.setPomodoroAutoPause);
  const setExamAutoDuck = useMusicStore((s) => s.setExamAutoDuck);
  const addCustomTrackAsync = useMusicStore((s) => s.addCustomTrackAsync);
  const addLocalFileTrack = useMusicStore((s) => s.addLocalFileTrack);
  const removeCustomTrack = useMusicStore((s) => s.removeCustomTrack);
  const togglePinTrack = useMusicStore((s) => s.togglePinTrack);
  const moveTrack = useMusicStore((s) => s.moveTrack);
  const playCuratedStation = useMusicStore((s) => s.playCuratedStation);
  const addStationToQueue = useMusicStore((s) => s.addStationToQueue);

  const [sceneMode, setSceneMode] = useState<StudioSceneMode>('aura');
  const [isPureZen, setIsPureZen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<
    'focus' | 'queue' | 'stations'
  >('focus');

  // Queue tab states
  const [queueFilter, setQueueFilter] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [formMsg, setFormMsg] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Stations tab state
  const [stationFilter, setStationFilter] = useState<
    'all' | CuratedStation['category']
  >('all');
  const [queuedNoticeId, setQueuedNoticeId] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const localAudioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || '';
      setIsIOS(
        /iPad|iPhone|iPod/.test(ua) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );
      const savedScene = localStorage.getItem(
        'anan_zen_scene'
      ) as StudioSceneMode | null;
      if (savedScene && ['aura', 'midnight', 'glow'].includes(savedScene)) {
        setSceneMode(savedScene);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleChangeScene = (nextScene: StudioSceneMode) => {
    setSceneMode(nextScene);
    try {
      localStorage.setItem('anan_zen_scene', nextScene);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
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

  const filteredTracks = useMemo(() => {
    const q = queueFilter.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
    );
  }, [tracks, queueFilter]);

  const filteredStations = useMemo(() => {
    if (stationFilter === 'all') return CURATED_FOCUS_STATIONS;
    return CURATED_FOCUS_STATIONS.filter((s) => s.category === stationFilter);
  }, [stationFilter]);

  const tone = getStudioContextTone(pomodoroRunning, pomodoroMode);
  const toneTokens = STUDIO_TONE_TOKENS[tone];
  const currentPresetCfg =
    POMODORO_PRESETS[pomodoroPreset] || POMODORO_PRESETS['25/5'];

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
        setFormMsg({ type: 'ok', text: 'Đã thêm và phát ngay trong Studio.' });
      } else {
        setFormMsg({
          type: 'err',
          text: res.error || 'Link YouTube hoặc Playlist không hợp lệ.',
        });
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleLocalAudioFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    let added = 0;
    let lastError: string | undefined;
    for (const file of files) {
      const res = addLocalFileTrack(file);
      if (res.ok) added++;
      else lastError = res.error;
    }

    if (added > 0) {
      setFormMsg({
        type: 'ok',
        text: `Đã thêm ${added} file nhạc trên máy & phát ngay (chạy Offline cực mượt).`,
      });
    } else if (lastError) {
      setFormMsg({ type: 'err', text: lastError });
    }
  };

  if (typeof document === 'undefined' || !currentTrack) return null;

  const displayVideoId = liveVideoId || currentTrack.videoId;
  const displayTitle = liveTitle || currentTrack.title;
  const displayArtist = liveArtist || currentTrack.artist;

  const sceneIndex = Math.max(
    0,
    SCENE_MODES.findIndex((s) => s.id === sceneMode)
  );
  const dockTabIndex =
    rightPanelTab === 'focus' ? 0 : rightPanelTab === 'queue' ? 1 : 2;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zen Focus Studio"
      className="zen-stage-enter fixed inset-0 z-[90] overflow-y-auto bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30"
    >
      {/* Immersive Living Scene Backdrop (Orbiting Album Clouds / Motes) */}
      <StudioSceneBackdrop
        scene={sceneMode}
        videoId={displayVideoId}
        tone={tone}
        isPlaying={isPlaying}
      />

      {/* Full-Viewport Outer Reactive Visuals (Side Wave Curtains + Bottom Horizon Spectrum) */}
      {sceneMode !== 'midnight' && (
        <OuterReactiveVisuals isPlaying={isPlaying} tone={tone} />
      )}

      {/* Top Navigation Bar */}
      <header
        className={`relative z-10 max-w-6xl xl:max-w-7xl w-full mx-auto px-4 sm:px-8 pt-4 sm:pt-5 flex items-center justify-between gap-3 transition-opacity duration-300 ${
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
                  : 'Không Quảng Cáo'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Hôm nay:{' '}
              <strong className="text-white">{pomodoroCompletedToday}</strong>{' '}
              phiên • Không cần mở tab YouTube ngoài
            </p>
          </div>
        </div>

        {/* Scene Switcher (#8 Sliding Pill), Pure Zen & Minimize */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative grid grid-cols-3 p-0.5 rounded-xl bg-white/[0.06] border border-white/10">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-[10px] bg-indigo-600 shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: `translate3d(${sceneIndex * 100}%, 0, 0)` }}
            />
            {SCENE_MODES.map((sc) => {
              const active = sceneMode === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleChangeScene(sc.id)}
                  title={sc.desc}
                  className={`relative z-10 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors text-center ${
                    active ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsPureZen(true)}
            title="Bật chế độ Pure Zen siêu tối giản (Phím Z)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Pure Zen</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Quay lại học bài (Esc)"
            title="Thu nhỏ & quay lại học bài (Esc)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Về bài học</span>
            <X className="w-3.5 h-3.5 sm:hidden" />
          </button>
        </div>
      </header>

      {/* Pure Zen floating exit banner */}
      {isPureZen && (
        <div className="relative z-20 mx-auto pt-4 flex items-center justify-center gap-3 flex-wrap px-4">
          <ZenPomodoroCountdown compact />
          <button
            type="button"
            onClick={() => setIsPureZen(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-black/65 border border-white/15 text-slate-300 hover:text-white shadow-lg hover:border-indigo-400 transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Chế độ Pure Zen • Bấm{' '}
              <kbd className="px-1 bg-white/15 rounded text-[10px]">Z</kbd> để
              hiện bảng điều khiển
            </span>
          </button>
        </div>
      )}

      {/* Main Studio Stage */}
      <main className="relative z-10 max-w-6xl xl:max-w-7xl w-full mx-auto px-4 sm:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center flex-1">
        {/* Left: Reactive Turntable Deck + Song Metadata + Transport (#4 Staggered) */}
        <section
          className={`zen-plinth-enter flex flex-col items-center text-center space-y-4 sm:space-y-5 transition-all duration-500 ${
            isPureZen ? 'lg:col-span-12 scale-105' : 'lg:col-span-6'
          }`}
        >
          <StudioTurntable
            videoId={displayVideoId}
            title={displayTitle}
            isPlaying={isPlaying}
            tone={tone}
          />

          {/* Track Info & Playback Indicator */}
          <div className="space-y-1.5 max-w-md px-2">
            <div className="flex items-center justify-center gap-2">
              {isPlaying ? (
                <StudioEqualizer isPlaying={true} tone={tone} size="md" />
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.06] border border-white/10 text-slate-400">
                  <Pause className="w-2.5 h-2.5" />
                  Tạm dừng
                </span>
              )}
              <h2 className="text-lg sm:text-xl font-bold truncate max-w-[260px] sm:max-w-[360px] text-white">
                {displayTitle}
              </h2>
            </div>

            <p className="text-sm text-slate-400 truncate">
              {displayArtist}
              {currentTrack.playlistId && livePlaylistTotal > 0
                ? ` • Bài ${livePlaylistIndex + 1}/${livePlaylistTotal}`
                : currentTrack.playlistId
                ? ' • YouTube Playlist'
                : ''}
              {isDucked ? ' • Tự giảm 15% khi thi' : ''}
            </p>
          </div>

          <SessionIntentionBar />

          <ZenSeekBar />

          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Phát ngẫu nhiên"
              aria-pressed={isShuffle}
              title="Phát ngẫu nhiên"
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
              title="Bài trước"
              className="p-3 rounded-full text-slate-200 hover:bg-white/10 transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Tạm dừng (Space)' : 'Phát nhạc (Space)'}
              className="studio-tactile-btn w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/35 hover:scale-105 transition-transform flex items-center justify-center ring-2 ring-white/25"
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
              title="Bài tiếp theo"
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

        {/* Right Studio Hub: Focus | Queue + Add YouTube | Curated Focus Stations (#4 + #8 Sliding Pill) */}
        {!isPureZen && (
          <section className="zen-dock-enter lg:col-span-6 space-y-4">
            {/* 3-Tab Studio Dock Header with GPU Sliding Indicator */}
            <div className="relative grid grid-cols-3 p-1 rounded-xl bg-slate-900/75 backdrop-blur-md border border-white/10">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/3)] rounded-lg bg-indigo-600 shadow-sm transition-transform duration-300 ease-out"
                style={{
                  transform: `translate3d(${dockTabIndex * 100}%, 0, 0)`,
                }}
              />
              <button
                type="button"
                onClick={() => setRightPanelTab('focus')}
                className={`relative z-10 py-2 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  rightPanelTab === 'focus'
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Timer className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Tập Trung</span>
              </button>

              <button
                type="button"
                onClick={() => setRightPanelTab('queue')}
                className={`relative z-10 py-2 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  rightPanelTab === 'queue'
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Hàng Đợi ({tracks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRightPanelTab('stations')}
                className={`relative z-10 py-2 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  rightPanelTab === 'stations'
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Kênh Nhạc</span>
              </button>
            </div>

            {/* TAB 1: POMODORO + VOLUME + SLEEP + AMBIENT */}
            {rightPanelTab === 'focus' && (
              <div className="space-y-4">
                {/* Pomodoro Stage Card */}
                <div
                  className={`relative rounded-2xl border p-5 sm:p-6 bg-slate-900/72 backdrop-blur-md transition-all duration-300 space-y-4 shadow-2xl overflow-hidden ${toneTokens.cardBorder} ${toneTokens.cardGlow}`}
                >
                  <ZenPomodoroProgressBar />
                  <ZenPomodoroMilestoneHalo />

                  <div className="flex items-center justify-between gap-2 pt-1">
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

                  <ZenPomodoroCountdown />

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={togglePomodoro}
                      className={`studio-tactile-btn flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 ${
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

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] text-slate-400">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                      <input
                        type="checkbox"
                        checked={pomodoroAutoPauseMusic}
                        onChange={(e) => setPomodoroAutoPause(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                      />
                      Tạm dừng nhạc khi nghỉ
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                      <input
                        type="checkbox"
                        checked={examAutoDuckMusic}
                        onChange={(e) => setExamAutoDuck(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                      />
                      Hạ nhạc còn 15% khi thi
                    </label>
                  </div>
                </div>

                {/* Audio & Ambient Glass Card */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/72 backdrop-blur-md p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Bật tiếng (M)' : 'Tắt tiếng (M)'}
                      title="Tắt / Bật tiếng (M)"
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

                  {isIOS && currentTrack && !currentTrack.isLocalFile && (
                    <p className="text-[11px] leading-snug text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl px-2.5 py-2 flex items-start gap-2">
                      <Smartphone className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                      <span>
                        Trên iPhone/iPad, Safari khóa chỉnh âm lượng YouTube bằng thanh trượt web — hãy dùng phím âm lượng máy, chọn file MP3 cục bộ ở tab Hàng Đợi hoặc dùng Mưa rơi / Brown Noise để phát nền khi khóa màn hình.
                      </span>
                    </p>
                  )}

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
              </div>
            )}

            {/* TAB 2: QUEUE MANAGER + ADD YOUTUBE VIDEO/PLAYLIST INLINE */}
            {rightPanelTab === 'queue' && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/72 backdrop-blur-md p-4 space-y-3 shadow-2xl flex flex-col max-h-[500px]">
                {/* Search Queue Filter */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={queueFilter}
                    onChange={(e) => setQueueFilter(e.target.value)}
                    placeholder="Tìm nhanh trong hàng đợi..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>

                {/* Track List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[180px]">
                  {filteredTracks.map((t, idx) => {
                    const isCurrent = t.id === currentTrackId;
                    const errKey = getTrackErrorKey(t);
                    const hasErr = Boolean(trackErrors[errKey]);

                    return (
                      <div
                        key={t.id}
                        className={`group flex items-center gap-2 p-2 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-indigo-500/20 border-indigo-500/40 shadow-sm'
                            : 'bg-white/[0.02] border-transparent hover:bg-white/[0.06]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => selectTrack(t.id)}
                          className="min-w-0 flex-1 flex items-center gap-2.5 text-left"
                        >
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-white/10 flex items-center justify-center">
                            {t.isLocalFile ? (
                              <Music className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Image
                                src={`https://i.ytimg.com/vi/${t.videoId}/mqdefault.jpg`}
                                alt={t.title}
                                width={72}
                                height={72}
                                unoptimized
                                className="w-full h-full object-cover"
                              />
                            )}
                            {isCurrent && (
                              <span className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                <StudioEqualizer
                                  isPlaying={isPlaying}
                                  tone={tone}
                                  size="sm"
                                />
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-500">
                                {idx + 1}.
                              </span>
                              <p className="text-xs font-semibold truncate text-white">
                                {t.title}
                              </p>
                              {t.playlistId && (
                                <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300">
                                  Playlist
                                </span>
                              )}
                              {t.isLocalFile && (
                                <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300">
                                  Offline
                                </span>
                              )}
                              {hasErr && (
                                <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-semibold bg-rose-500/20 text-rose-300">
                                  Lỗi
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {t.artist}
                            </p>
                          </div>
                        </button>

                        {/* Row controls */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => togglePinTrack(t.id)}
                            aria-label={t.isPinned ? 'Bỏ ghim' : 'Ghim bài'}
                            title={t.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                            className={`p-1 rounded-md transition-colors ${
                              t.isPinned
                                ? 'text-amber-400 bg-amber-500/15'
                                : 'text-slate-500 hover:text-amber-400 hover:bg-white/10'
                            }`}
                          >
                            <Pin className="w-3 h-3" />
                          </button>

                          {!queueFilter && (
                            <>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveTrack(t.id, 'up')}
                                aria-label="Lên"
                                className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === tracks.length - 1}
                                onClick={() => moveTrack(t.id, 'down')}
                                aria-label="Xuống"
                                className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </>
                          )}

                          {t.isCustom && (
                            <button
                              type="button"
                              onClick={() => removeCustomTrack(t.id)}
                              aria-label="Xóa bài"
                              className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredTracks.length === 0 && (
                    <p className="text-center text-xs text-slate-500 py-8">
                      Không tìm thấy bài phù hợp.
                    </p>
                  )}
                </div>

                {/* Inline Add YouTube Video / Playlist directly inside Zen */}
                <form
                  onSubmit={handleAddTrack}
                  className="pt-3 border-t border-white/10 space-y-2"
                >
                  <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    Thêm trực tiếp Video hoặc Playlist YouTube
                  </p>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Dán link YouTube (tự động lấy tên bài, không quảng cáo)"
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-black/50 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Đặt tên riêng (không bắt buộc)"
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-black/50 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      disabled={!customUrl.trim() || isAdding}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white inline-flex items-center gap-1 transition-colors"
                    >
                      {isAdding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Phát ngay
                    </button>
                  </div>
                  {formMsg && (
                    <p
                      className={`text-[11px] ${
                        formMsg.type === 'ok'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formMsg.text}
                    </p>
                  )}

                  <div className="pt-2 border-t border-white/10">
                    <input
                      ref={localAudioInputRef}
                      type="file"
                      accept="audio/*,.mp3,.m4a,.wav,.ogg"
                      multiple
                      onChange={handleLocalAudioFiles}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => localAudioInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Music className="w-3.5 h-3.5 shrink-0" />
                      <span>📂 Phát file nhạc trên máy (MP3/M4A/WAV)</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: CURATED AD-FREE FOCUS STATIONS */}
            {rightPanelTab === 'stations' && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/72 backdrop-blur-md p-4 space-y-3 shadow-2xl flex flex-col max-h-[500px]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    {STATION_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStationFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          stationFilter === f.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/[0.05] text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    1 chạm để nghe
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredStations.map((st) => {
                    const isActive =
                      currentTrack.videoId === st.videoId &&
                      !currentTrack.playlistId;
                    const justAdded = queuedNoticeId === st.id;

                    return (
                      <div
                        key={st.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-indigo-500/20 border-indigo-500/40'
                            : 'bg-white/[0.03] border-white/5 hover:border-white/15 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-slate-800">
                          <Image
                            src={`https://i.ytimg.com/vi/${st.videoId}/mqdefault.jpg`}
                            alt={st.title}
                            width={96}
                            height={96}
                            unoptimized
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {st.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {st.artist}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              addStationToQueue(st);
                              setQueuedNoticeId(st.id);
                              window.setTimeout(
                                () =>
                                  setQueuedNoticeId((cur) =>
                                    cur === st.id ? null : cur
                                  ),
                                1500
                              );
                            }}
                            title="Thêm vào hàng đợi"
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                          >
                            {justAdded ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => playCuratedStation(st)}
                            className="studio-tactile-btn px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Nghe
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Shortcut Bar */}
      <footer
        className={`relative z-10 max-w-6xl xl:max-w-7xl w-full mx-auto px-4 sm:px-8 pb-4 text-center text-[11px] text-slate-400 transition-opacity duration-300 ${
          isPureZen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        Phím tắt:{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
          Space
        </kbd>{' '}
        Phát/Dừng •{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
          M
        </kbd>{' '}
        Tắt tiếng •{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
          Z
        </kbd>{' '}
        Pure Zen •{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
          ← / →
        </kbd>{' '}
        Chuyển bài •{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
          Esc
        </kbd>{' '}
        Về bài học
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
