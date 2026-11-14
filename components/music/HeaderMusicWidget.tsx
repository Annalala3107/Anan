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
  Radio,
  Plus,
} from 'lucide-react';
import { useMusicStore } from '@/lib/musicStore';

export default function HeaderMusicWidget() {
  const tracks = useMusicStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isReady = useMusicStore((s) => s.isReady);
  const playerState = useMusicStore((s) => s.playerState);
  const isMuted = useMusicStore((s) => s.isMuted);
  const volume = useMusicStore((s) => s.volume);
  const loopMode = useMusicStore((s) => s.loopMode);
  const trackErrors = useMusicStore((s) => s.trackErrors);

  const selectTrack = useMusicStore((s) => s.selectTrack);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const toggleMute = useMusicStore((s) => s.toggleMute);
  const setVolume = useMusicStore((s) => s.setVolume);
  const setLoopMode = useMusicStore((s) => s.setLoopMode);
  const nextTrack = useMusicStore((s) => s.nextTrack);
  const prevTrack = useMusicStore((s) => s.prevTrack);
  const addCustomTrack = useMusicStore((s) => s.addCustomTrack);

  const [isOpen, setIsOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addCustomTrack(customUrl);
    if (!res.ok) {
      setCustomError(res.error || 'Link YouTube không hợp lệ.');
      return;
    }
    setCustomError(null);
    setCustomUrl('');
  };

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

  const activeError = currentTrack ? trackErrors[currentTrack.videoId] : undefined;
  const isActuallyPlaying = playerState === 'playing' && isPlaying;

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Compact Header Music Pill */}
      <div className="flex items-center rounded-xl border border-indigo-500/30 bg-indigo-50/80 dark:bg-slate-900/90 backdrop-blur-md shadow-sm overflow-hidden">
        {/* Quick Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          title={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc học tập'}
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
          title={isMuted || volume === 0 ? 'Bật lại âm thanh' : 'Tắt âm ngay (Mute)'}
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

        {/* Track Title & Popover Toggle */}
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
            <Music className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          )}

          <span className="hidden xl:inline max-w-[140px] truncate">
            {currentTrack ? currentTrack.title : 'Chọn nhạc nền'}
          </span>

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Trình phát nhạc học tập"
          className="fixed sm:absolute right-2 sm:right-0 top-[60px] sm:top-full sm:mt-2 w-[calc(100vw-1rem)] max-w-[350px] sm:w-[360px] z-[80] rounded-2xl border border-slate-700/80 bg-[#0d1424]/95 backdrop-blur-xl shadow-2xl p-4 text-slate-100 space-y-3.5"
        >
          {/* Top Status Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentTrack?.title || 'Chưa chọn bài'}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {isReady
                    ? isActuallyPlaying
                      ? 'Đang phát từ YouTube Engine'
                      : playerState === 'buffering'
                      ? 'Đang tải luồng âm thanh...'
                      : activeError
                      ? `Lỗi phát (${activeError.code})`
                      : 'Đang tạm dừng · Sẵn sàng'
                    : 'Đang khởi tạo YouTube API...'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLoopMode(loopMode === 'all' ? 'one' : 'all')}
              title={loopMode === 'one' ? 'Đang lặp 1 bài' : 'Đang lặp toàn danh sách'}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:border-indigo-500/60 text-xs font-semibold flex items-center gap-1.5 text-slate-200 cursor-pointer shrink-0"
            >
              {loopMode === 'one' ? (
                <>
                  <Repeat1 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lặp 1 bài</span>
                </>
              ) : (
                <>
                  <Repeat className="w-3.5 h-3.5 text-sky-400" />
                  <span>Lặp list</span>
                </>
              )}
            </button>
          </div>

          {/* Track List */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
            {tracks.map((track, index) => {
              const isSelected = track.id === currentTrack?.id;
              const err = trackErrors[track.videoId];
              return (
                <div
                  key={track.id}
                  className={`rounded-xl border transition-all p-2.5 flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-indigo-500/70 bg-indigo-500/15'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectTrack(track.id, true)}
                    className="flex-1 min-w-0 text-left flex items-center gap-2.5 cursor-pointer"
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {track.title}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {track.artist}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {err && (
                      <span
                        title={err.message}
                        className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold"
                      >
                        Lỗi {err.code}
                      </span>
                    )}
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Mở video gốc trên YouTube"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transport + Volume Row */}
          <div className="pt-2 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevTrack}
                  title="Bài trước"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Tạm dừng</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Phát nhạc</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={nextTrack}
                  title="Bài kế tiếp"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={toggleMute}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                  isMuted || volume === 0
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {isMuted || volume === 0 ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Đã tắt âm</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{volume}%</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <VolumeX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Âm lượng nhạc nền"
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </div>

            {/* Compact Custom YouTube Link Input */}
            <form onSubmit={handleAddCustom} className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="Dán thêm link YouTube hoặc Video ID..."
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  title="Thêm bài mới và phát ngay"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>
              {customError && (
                <p className="text-xs text-rose-400 font-medium">{customError}</p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
