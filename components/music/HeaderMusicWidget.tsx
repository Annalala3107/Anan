'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  ExternalLink,
  AlertCircle,
  Plus,
  Shuffle,
  Trash2,
  Timer,
  RotateCcw,
  CloudRain,
  Waves,
  Sparkles,
  Keyboard,
  PanelBottom,
  Loader2,
} from 'lucide-react';
import {
  useMusicStore,
  formatSecondsMmSs,
  POMODORO_FOCUS_SECONDS,
  POMODORO_BREAK_SECONDS,
} from '@/lib/musicStore';
import { AmbientPreset } from '@/lib/ambientAudio';

export default function HeaderMusicWidget() {
  const tracks = useMusicStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isReady = useMusicStore((s) => s.isReady);
  const playerState = useMusicStore((s) => s.playerState);
  const isMuted = useMusicStore((s) => s.isMuted);
  const volume = useMusicStore((s) => s.volume);
  const loopMode = useMusicStore((s) => s.loopMode);
  const isShuffle = useMusicStore((s) => s.isShuffle);
  const trackErrors = useMusicStore((s) => s.trackErrors);
  const currentTime = useMusicStore((s) => s.currentTime);
  const duration = useMusicStore((s) => s.duration);
  const ambientPreset = useMusicStore((s) => s.ambientPreset);
  const ambientVolume = useMusicStore((s) => s.ambientVolume);
  const pomodoroMode = useMusicStore((s) => s.pomodoroMode);
  const pomodoroSecondsLeft = useMusicStore((s) => s.pomodoroSecondsLeft);
  const pomodoroRunning = useMusicStore((s) => s.pomodoroRunning);
  const pomodoroAutoPauseMusic = useMusicStore((s) => s.pomodoroAutoPauseMusic);
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
  const requestSeek = useMusicStore((s) => s.requestSeek);
  const setAmbientPreset = useMusicStore((s) => s.setAmbientPreset);
  const setAmbientVolume = useMusicStore((s) => s.setAmbientVolume);
  const togglePomodoro = useMusicStore((s) => s.togglePomodoro);
  const resetPomodoro = useMusicStore((s) => s.resetPomodoro);
  const setPomodoroAutoPause = useMusicStore((s) => s.setPomodoroAutoPause);
  const setShowMiniPlayer = useMusicStore((s) => s.setShowMiniPlayer);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'playlist' | 'focus'>('playlist');
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) || tracks[0],
    [tracks, currentTrackId]
  );

  // Close popover cleanly on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingCustom || !customUrl.trim()) return;
    setIsAddingCustom(true);
    try {
      const res = await addCustomTrackAsync(customUrl);
      if (!res.ok) {
        setCustomError(res.error || 'Link YouTube không hợp lệ.');
        return;
      }
      setCustomError(null);
      setCustomUrl('');
    } finally {
      setIsAddingCustom(false);
    }
  };

  const activeError = currentTrack ? trackErrors[currentTrack.videoId] : undefined;
  const isActuallyPlaying = playerState === 'playing' && isPlaying;
  const maxDuration = duration > 0 ? duration : Math.max(currentTime, 1);

  const pomodoroTotal =
    pomodoroMode === 'focus' ? POMODORO_FOCUS_SECONDS : POMODORO_BREAK_SECONDS;
  const pomodoroProgressPct = Math.max(
    0,
    Math.min(100, ((pomodoroTotal - pomodoroSecondsLeft) / pomodoroTotal) * 100)
  );

  const ambientOptions: Array<{
    key: AmbientPreset;
    label: string;
    icon: typeof CloudRain | typeof Waves | typeof VolumeX;
  }> = [
    { key: 'off', label: 'Tắt', icon: VolumeX },
    { key: 'rain', label: 'Mưa rơi', icon: CloudRain },
    { key: 'brown', label: 'Brown Noise', icon: Waves },
  ];

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Compact Header Music Pill */}
      <div className="flex items-center rounded-xl border border-indigo-500/30 bg-indigo-50/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm overflow-hidden">
        {/* Quick Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          title={isPlaying ? 'Tạm dừng nhạc (Alt+P)' : 'Phát nhạc học tập (Alt+P)'}
          aria-label={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc học tập'}
          className={`px-2.5 py-1.5 flex items-center justify-center transition-colors cursor-pointer ${
            isPlaying
              ? 'bg-indigo-600 text-white hover:bg-indigo-500'
              : 'text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/15'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        {/* Quick Mute / Unmute */}
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted || volume === 0 ? 'Bật lại âm thanh (Alt+M)' : 'Tắt âm ngay (Alt+M)'}
          aria-label={isMuted || volume === 0 ? 'Bật lại âm thanh' : 'Tắt âm ngay'}
          className={`px-2 py-1.5 border-l border-indigo-500/20 flex items-center justify-center transition-colors cursor-pointer ${
            isMuted || volume === 0
              ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-500/10'
          }`}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Track Title, Optional Pomodoro Pill & Popover Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          className="px-2.5 py-1.5 border-l border-indigo-500/20 flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-indigo-500/10 transition-colors cursor-pointer"
        >
          {isActuallyPlaying ? (
            <span className="flex items-end gap-[2px] h-3.5 w-3.5 shrink-0" aria-hidden="true">
              <span className="w-[3px] h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="w-[3px] h-3.5 bg-sky-400 rounded-full animate-bounce" />
              <span className="w-[3px] h-2.5 bg-indigo-400 rounded-full animate-pulse" />
            </span>
          ) : activeError ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <Music className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          )}

          <span className="hidden xl:inline max-w-[140px] truncate">
            {currentTrack ? currentTrack.title : 'Focus Studio'}
          </span>

          {pomodoroRunning && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-mono text-xs font-bold">
              {formatSecondsMmSs(pomodoroSecondsLeft, true)}
            </span>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Upgraded 2-Tab Focus Studio Popover (Light & Dark Theme Parity) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Focus Studio · Nhạc nền & Pomodoro"
          className="fixed sm:absolute right-2 sm:right-0 top-[60px] sm:top-full sm:mt-2 w-[calc(100vw-1rem)] max-w-[380px] sm:w-[390px] z-[80] rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white/95 dark:bg-[#0d1424]/95 backdrop-blur-xl shadow-2xl p-4 text-slate-900 dark:text-slate-100 space-y-3.5"
        >
          {/* Now Playing Hero Card + Seek Bar */}
          {currentTrack && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/80 bg-slate-900">
                    <img
                      src={`https://i.ytimg.com/vi/${currentTrack.videoId}/mqdefault.jpg`}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                    {isActuallyPlaying && (
                      <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentTrack.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {isReady
                        ? isActuallyPlaying
                          ? `Đang phát · ${currentTrack.artist}`
                          : playerState === 'buffering'
                          ? 'Đang tải luồng âm thanh...'
                          : activeError
                          ? `Lỗi phát (${activeError.code})`
                          : `Tạm dừng · ${currentTrack.artist}`
                        : 'Đang khởi tạo YouTube API...'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLoopMode(loopMode === 'all' ? 'one' : 'all')}
                  title={loopMode === 'one' ? 'Đang lặp 1 bài' : 'Đang lặp toàn danh sách'}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-indigo-500/60 text-xs font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                >
                  {loopMode === 'one' ? (
                    <>
                      <Repeat1 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>1 bài</span>
                    </>
                  ) : (
                    <>
                      <Repeat className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>List</span>
                    </>
                  )}
                </button>
              </div>

              {/* Interactive Timeline Seek Bar */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={maxDuration}
                  value={Math.min(currentTime, maxDuration)}
                  onChange={(e) => requestSeek(Number(e.target.value))}
                  aria-label="Thanh tua tiến độ bài hát"
                  className="w-full h-1.5 accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>{formatSecondsMmSs(currentTime)}</span>
                  <span>{duration > 0 ? formatSecondsMmSs(duration) : '--:--'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2-Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('playlist')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'playlist'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Danh sách nhạc</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('focus')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'focus'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Tập trung & Không gian</span>
            </button>
          </div>

          {/* TAB 1: PLAYLIST & AUDIO CONTROLS */}
          {activeTab === 'playlist' && (
            <div className="space-y-3">
              {/* Track List */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                {tracks.map((track) => {
                  const isSelected = track.id === currentTrack?.id;
                  const err = trackErrors[track.videoId];
                  return (
                    <div
                      key={track.id}
                      className={`rounded-xl border transition-all p-2 flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-indigo-500/70 bg-indigo-50 dark:bg-indigo-500/15'
                          : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectTrack(track.id, true)}
                        className="flex-1 min-w-0 text-left flex items-center gap-2.5 cursor-pointer"
                      >
                        <img
                          src={`https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg`}
                          alt={track.title}
                          className="w-10 h-7 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {track.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {track.artist}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {err && (
                          <span
                            title={err.message}
                            className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-bold"
                          >
                            Lỗi {err.code}
                          </span>
                        )}
                        {track.isCustom && (
                          <button
                            type="button"
                            onClick={() => removeCustomTrack(track.id)}
                            title="Xóa bài tự thêm"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Mở video gốc trên YouTube"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Transport + Shuffle + Volume Row */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleShuffle}
                      title={isShuffle ? 'Đang bật phát ngẫu nhiên' : 'Bật phát ngẫu nhiên'}
                      className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                        isShuffle
                          ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-600 dark:text-indigo-300'
                          : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={prevTrack}
                      title="Bài trước"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={togglePlay}
                      title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
                      className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Dừng</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Phát</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={nextTrack}
                      title="Bài kế tiếp"
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                      isMuted || volume === 0
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isMuted || volume === 0 ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Tắt</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        <span>{volume}%</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <VolumeX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    aria-label="Âm lượng nhạc nền"
                    className="w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer"
                  />
                  <Volume2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                </div>

                {/* Async Custom YouTube Link Input (Auto oEmbed Metadata + Local Persistence) */}
                <form
                  onSubmit={handleAddCustom}
                  className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="Dán link YouTube — tự lấy tên & lưu playlist"
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isAddingCustom}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      title="Tự lấy tên video và lưu vào playlist"
                    >
                      {isAddingCustom ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Thêm</span>
                    </button>
                  </div>
                  {customError && (
                    <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                      {customError}
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: POMODORO TIMER, AMBIENT MIXER & MINI-PLAYER SETTINGS */}
          {activeTab === 'focus' && (
            <div className="space-y-3.5">
              {/* Pomodoro 25/5 Focus Timer */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Pomodoro Tập trung
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => resetPomodoro('focus')}
                      className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                        pomodoroMode === 'focus'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Học 25p
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPomodoro('break')}
                      className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                        pomodoroMode === 'break'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Nghỉ 5p
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-2xl font-mono font-black tracking-tight text-slate-900 dark:text-white">
                    {formatSecondsMmSs(pomodoroSecondsLeft, true)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={togglePomodoro}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                        pomodoroRunning
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {pomodoroRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Tạm dừng</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Bắt đầu</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetPomodoro()}
                      title="Đặt lại đồng hồ"
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      pomodoroMode === 'focus' ? 'bg-indigo-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pomodoroProgressPct}%` }}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pomodoroAutoPauseMusic}
                    onChange={(e) => setPomodoroAutoPause(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  Tự tạm dừng nhạc khi hết phiên 25 phút
                </label>
              </div>

              {/* Web Audio Ambient Mixer */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Âm thanh không gian (0 KB Web Audio)
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {ambientVolume}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {ambientOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = ambientPreset === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setAmbientPreset(opt.key)}
                        className={`py-2 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          active
                            ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={ambientVolume}
                  onChange={(e) => setAmbientVolume(Number(e.target.value))}
                  aria-label="Âm lượng không gian"
                  className="w-full h-1.5 accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Floating Mini-Player Toggle + Global Shortcuts */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3 space-y-2">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                  <span className="flex items-center gap-1.5">
                    <PanelBottom className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    Hiện thanh Mini-Player nổi ở góc phải
                  </span>
                  <input
                    type="checkbox"
                    checked={showMiniPlayer}
                    onChange={(e) => setShowMiniPlayer(e.target.checked)}
                    className="rounded accent-indigo-600 w-4 h-4"
                  />
                </label>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Keyboard className="w-3.5 h-3.5" />
                    Phím tắt:
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      Alt+P
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      Alt+M
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      Alt+N
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
