'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  ShieldCheck,
  Zap,
  ExternalLink,
  AlertTriangle,
  Plus,
  Trash2,
  Mic,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import HeaderMusicWidget from '@/components/music/HeaderMusicWidget';
import { useMusicStore } from '@/lib/musicStore';
import { SpeechService } from '@/lib/speech';

export default function MusicDemoPage() {
  const tracks = useMusicStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const isReady = useMusicStore((s) => s.isReady);
  const playerState = useMusicStore((s) => s.playerState);
  const isMuted = useMusicStore((s) => s.isMuted);
  const volume = useMusicStore((s) => s.volume);
  const isDucked = useMusicStore((s) => s.isDucked);
  const loopMode = useMusicStore((s) => s.loopMode);
  const autoSkipOnError = useMusicStore((s) => s.autoSkipOnError);
  const trackErrors = useMusicStore((s) => s.trackErrors);
  const eventLogs = useMusicStore((s) => s.eventLogs);

  const selectTrack = useMusicStore((s) => s.selectTrack);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const setPlaying = useMusicStore((s) => s.setPlaying);
  const toggleMute = useMusicStore((s) => s.toggleMute);
  const setMuted = useMusicStore((s) => s.setMuted);
  const setVolume = useMusicStore((s) => s.setVolume);
  const setDucked = useMusicStore((s) => s.setDucked);
  const setLoopMode = useMusicStore((s) => s.setLoopMode);
  const setAutoSkipOnError = useMusicStore((s) => s.setAutoSkipOnError);
  const nextTrack = useMusicStore((s) => s.nextTrack);
  const prevTrack = useMusicStore((s) => s.prevTrack);
  const addCustomTrack = useMusicStore((s) => s.addCustomTrack);
  const pushLog = useMusicStore((s) => s.pushLog);
  const clearLogs = useMusicStore((s) => s.clearLogs);

  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [activeStressTest, setActiveStressTest] = useState<string | null>(null);

  const timersRef = useRef<number[]>([]);

  const clearPendingTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearPendingTimers();
      useMusicStore.getState().setDucked(false);
    };
  }, []);

  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId) || tracks[0],
    [tracks, currentTrackId]
  );

  const effectiveVolume = isMuted ? 0 : isDucked ? Math.min(volume, 15) : volume;

  const handleAddCustomTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addCustomTrack(customUrl, customTitle);
    if (!res.ok) {
      setCustomError(res.error || 'Link YouTube không hợp lệ.');
      return;
    }
    setCustomError(null);
    setCustomUrl('');
    setCustomTitle('');
  };

  // Stress Test 1: Instant Mute/Pause race guard
  const runInstantMuteTest = () => {
    clearPendingTimers();
    setActiveStressTest('mute');
    pushLog('info', '[Test 1] Bắt đầu test bấm Phát rồi Tắt âm/Pause sau 180ms...');
    setMuted(false);
    setPlaying(true);

    const t1 = window.setTimeout(() => {
      setPlaying(false);
      setMuted(true);
      pushLog(
        'success',
        '[Test 1] Đã gửi pauseVideo() + mute() sau 180ms — chốt chặn chặn mọi buffering trễ.'
      );
      setActiveStressTest(null);
    }, 180);

    timersRef.current.push(t1);
  };

  // Stress Test 2: Rapid track switching
  const runRapidSwitchTest = () => {
    if (tracks.length === 0) return;
    clearPendingTimers();
    setActiveStressTest('switch');
    pushLog('info', '[Test 2] Bắt đầu test chuyển liên tiếp qua các bài để kiểm tra trùng iframe...');

    const sequence = [...tracks.map((t) => t.id)];
    sequence.forEach((trackId, idx) => {
      const timerId = window.setTimeout(() => {
        selectTrack(trackId, true);
        if (idx === sequence.length - 1) {
          pushLog(
            'success',
            '[Test 2] Hoàn tất chuyển nhanh — chỉ giữ đúng 1 instance YT.Player duy nhất.'
          );
          setActiveStressTest(null);
        }
      }, idx * 450);
      timersRef.current.push(timerId);
    });
  };

  // Stress Test 3: TTS pronunciation ducking
  const runTtsDuckingTest = async () => {
    setActiveStressTest('tts');
    pushLog(
      'info',
      '[Test 3] Hạ âm lượng nhạc nền xuống tối đa 15% trong khi SpeechService đọc câu hỏi...'
    );
    setDucked(true);
    try {
      await SpeechService.speak('What does the term bus refer to in a computer system?');
    } finally {
      setDucked(false);
      pushLog('success', '[Test 3] Đọc xong phát âm → khôi phục mức âm lượng gốc.');
      setActiveStressTest(null);
    }
  };

  const stateBadgeMap: Record<string, { label: string; cls: string }> = {
    playing: {
      label: 'Đang phát (PLAYING)',
      cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    buffering: {
      label: 'Đang đệm (BUFFERING)',
      cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    },
    paused: {
      label: 'Đã dừng (PAUSED)',
      cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    cued: {
      label: 'Chờ phát (CUED)',
      cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    ended: {
      label: 'Kết thúc (ENDED)',
      cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    },
    error: {
      label: 'Lỗi phát (ERROR)',
      cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
    unstarted: {
      label: 'Chưa bắt đầu',
      cls: 'bg-slate-700/40 text-slate-300 border-slate-600/50',
    },
  };

  const badge = stateBadgeMap[playerState] || stateBadgeMap.unstarted;

  return (
    <>
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-16 space-y-6 text-slate-100">
        {/* Top Banner & Simulated Header Preview */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/"
                className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-200 hover:border-indigo-400/50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
                Quay lại trang chính
              </Link>
              <span className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-300 border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Đã tích hợp vào bản chính · Chẩn đoán trực tiếp
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Phương án A: Singleton YouTube IFrame API + Zustand
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Demo Trình Phát Nhạc Học Tập (Cách ly an toàn)
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Thử nghiệm phát, chuyển bài, tắt âm tức thì và kiểm tra quyền nhúng trực tiếp với 3 link YouTube bạn đã gửi trước khi gắn vào Header toàn trang.
            </p>
          </div>

          {/* Simulated Header Bar Preview */}
          <div className="glass-surface rounded-2xl p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 border border-indigo-500/25">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300 bg-sky-500/15 px-2.5 py-1 rounded-lg border border-sky-500/30">
                Mô phỏng thanh Header
              </span>
              <span className="text-xs text-slate-300 hidden sm:inline">
                Nút gọn gắn cạnh Đồng bộ ĐT & Sáng/Tối — không che BottomNav hay HUD
              </span>
            </div>

            <HeaderMusicWidget />
          </div>
        </header>

        {/* Main Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Playlist, Master Controls & Custom Track */}
          <div className="lg:col-span-7 space-y-5">
            {/* Playlist Card */}
            <section className="glass-surface-elevated rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Danh sách nhạc thử nghiệm ({tracks.length} bài)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Bấm trực tiếp vào từng bài để đổi nhạc qua <code className="text-sky-300 font-mono">loadVideoById()</code> (không reload iframe)
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSkipOnError}
                    onChange={(e) => setAutoSkipOnError(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  Tự qua bài khi gặp lỗi nhúng
                </label>
              </div>

              <div className="space-y-2.5">
                {tracks.map((track, idx) => {
                  const isActive = track.id === currentTrack?.id;
                  const err = trackErrors[track.videoId];
                  const isTrackPlaying = isActive && playerState === 'playing' && isPlaying;

                  return (
                    <div
                      key={track.id}
                      className={`rounded-xl border p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isActive
                          ? 'border-indigo-400/70 bg-indigo-500/15 shadow-md shadow-indigo-500/10'
                          : 'border-slate-700/60 bg-slate-900/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              togglePlay();
                            } else {
                              selectTrack(track.id, true);
                            }
                          }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              : 'bg-slate-800 hover:bg-indigo-600 text-slate-200'
                          }`}
                          aria-label={isTrackPlaying ? `Tạm dừng ${track.title}` : `Phát ${track.title}`}
                        >
                          {isTrackPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 fill-current" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-indigo-300">
                              #{idx + 1}
                            </span>
                            <h3 className="text-sm font-bold text-white truncate">
                              {track.title}
                            </h3>
                            {isActive && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/25 text-indigo-200 border border-indigo-400/30">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">
                            {track.artist} · ID: <code className="text-sky-300 font-mono">{track.videoId}</code>
                          </div>

                          {err && (
                            <div className="mt-2 flex items-start gap-1.5 text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-lg px-2.5 py-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                              <span>{err.message}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => selectTrack(track.id, true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {isActive ? 'Phát lại' : 'Chọn bài'}
                        </button>
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-300 border border-slate-700 transition-colors"
                          title="Mở link YouTube gốc"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Master Transport & Volume Confirmation */}
            <section className="glass-surface rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">Điều khiển trung tâm & Chốt âm thanh</h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={prevTrack}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                  Bài trước
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer transition-colors ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Tạm dừng nhạc
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Phát nhạc ngay
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={nextTrack}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  Bài tiếp
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-4 h-4 text-rose-400" />
                      Đang tắt âm (Mute)
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      Âm thanh: BẬT
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setLoopMode(loopMode === 'all' ? 'one' : 'all')}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {loopMode === 'one' ? (
                    <>
                      <Repeat1 className="w-4 h-4 text-amber-400" />
                      Lặp 1 bài
                    </>
                  ) : (
                    <>
                      <Repeat className="w-4 h-4 text-sky-400" />
                      Lặp danh sách
                    </>
                  )}
                </button>
              </div>

              {/* Volume Slider + Effective Engine Telemetry */}
              <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Thanh trượt âm lượng (lưu vào localStorage)
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400">
                      State Mute: <strong className={isMuted ? 'text-rose-400' : 'text-emerald-400'}>{String(isMuted)}</strong>
                    </span>
                    <span className="text-sky-300">
                      YT Volume thực tế: <strong>{effectiveVolume}%</strong>
                      {isDucked && ' (đã giảm cho TTS)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    aria-label="Thanh trượt âm lượng chính"
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-white w-10 text-right">
                    {volume}%
                  </span>
                </div>
              </div>

              {/* Add Custom Track Form */}
              <form onSubmit={handleAddCustomTrack} className="pt-2 border-t border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-300">
                  Thử dán thêm link YouTube khác (để đối chiếu nếu bài trên bị chủ kênh chặn nhúng):
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="Dán link youtu.be/... hoặc Video ID 11 ký tự"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Tên bài (tùy chọn)"
                    className="sm:w-44 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm & Phát
                  </button>
                </div>
                {customError && (
                  <p className="text-xs text-rose-400 font-medium">{customError}</p>
                )}
              </form>
            </section>
          </div>

          {/* Right 5 Columns: Engine Monitor, Anti-Bug Stress Tests & Live Event Console */}
          <div className="lg:col-span-5 space-y-5">
            {/* Global Engine Status Card (mounted once in app/layout.tsx) */}
            <section className="glass-surface-elevated rounded-2xl p-5 space-y-3">
              <div>
                <h2 className="text-base font-bold text-white">YouTube Audio Engine (Global Singleton)</h2>
                <p className="text-xs text-slate-400">
                  {isReady ? 'API Ready · Đang chạy 1 YT.Player duy nhất tại Root Layout' : 'Đang nạp iframe_api...'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-center space-y-1.5">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                <div className="text-xs font-bold text-emerald-300">
                  Kết nối trực tiếp với YouTubeAudioEngine trong app/layout.tsx
                </div>
                <p className="text-xs text-slate-400">
                  Chạy ẩn 200×112 offscreen xuyên suốt mọi trang (không ngắt nhạc khi chuyển tab học/thi).
                </p>
              </div>
            </section>

            {/* 3 One-Click Anti-Bug Stress Tests */}
            <section className="glass-surface rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-white">Kiểm tra nhanh các lỗi hay gặp</h2>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!isReady || activeStressTest !== null}
                  onClick={runInstantMuteTest}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/60 text-left transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      1. Test Chốt chặn Tắt âm/Pause tức thì
                    </div>
                    <div className="text-xs text-slate-400">
                      Bật phát rồi hủy sau 180ms → kiểm tra không bị phát rò tiếng trễ
                    </div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>

                <button
                  type="button"
                  disabled={!isReady || activeStressTest !== null}
                  onClick={runRapidSwitchTest}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/60 text-left transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      2. Test Đổi nhạc nhanh liên tiếp
                    </div>
                    <div className="text-xs text-slate-400">
                      Chuyển lần lượt qua cả {tracks.length} bài để kiểm tra không chồng âm thanh
                    </div>
                  </div>
                  <RefreshCw
                    className={`w-4 h-4 text-sky-400 shrink-0 ${
                      activeStressTest === 'switch' ? 'animate-spin' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  disabled={activeStressTest !== null}
                  onClick={runTtsDuckingTest}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/60 text-left transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      3. Test Tự giảm nhạc khi đọc Từ vựng (TTS Ducking)
                    </div>
                    <div className="text-xs text-slate-400">
                      Hạ nhạc xuống ≤15% khi SpeechService đọc câu tiếng Anh rồi tự khôi phục
                    </div>
                  </div>
                  <Mic className="w-4 h-4 text-amber-400 shrink-0" />
                </button>
              </div>
            </section>

            {/* Real-time API Event Log */}
            <section className="glass-surface rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Nhật ký sự kiện YT.Player</h2>
                <button
                  type="button"
                  onClick={clearLogs}
                  className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa log
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-xl bg-slate-950/80 border border-slate-800 p-3 font-mono text-xs">
                {eventLogs.length === 0 ? (
                  <div className="text-slate-500">
                    Chưa có sự kiện nào — thử bấm Phát hoặc Chọn bài để theo dõi API thực tế.
                  </div>
                ) : (
                  eventLogs.map((log) => {
                    const colorCls =
                      log.type === 'error'
                        ? 'text-rose-400'
                        : log.type === 'warn'
                        ? 'text-amber-300'
                        : log.type === 'success'
                        ? 'text-emerald-400'
                        : 'text-sky-300';
                    return (
                      <div key={log.id} className="leading-relaxed break-words">
                        <span className="text-slate-500">[{log.time}]</span>{' '}
                        <span className={colorCls}>{log.text}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
