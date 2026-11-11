'use client';

import { useState, useEffect } from 'react';
import { useQuizStore } from '@/lib/quizStore';
import {
  Focus,
  Maximize2,
  Minimize2,
  Headphones,
  VolumeX,
  Volume2,
  Radio,
  Clock,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

interface ZenFocusHUDProps {
  mode: string;
  onExit: () => void;
}

export default function ZenFocusHUD({ mode, onExit }: ZenFocusHUDProps) {
  const {
    zenMode,
    toggleZenMode,
    ambientFocusSound,
    toggleAmbientFocus,
    ambientSoundType,
    setAmbientSoundType,
    soundEnabled,
    toggleSound,
  } = useQuizStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Focus Session Stopwatch
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track Fullscreen status change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request was blocked or not supported:', err);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'learn':
        return 'Thẻ Học SRS (Spaced Repetition)';
      case 'drill':
        return 'Luyện Phản Xạ & Ngữ Cảnh (Drill)';
      case 'exam':
        return 'Thi Thử Bấm Giờ (Timed Exam)';
      case 'mistakes':
        return 'Ôn Tập Câu Sai & Hay Nhầm';
      default:
        return 'Phiên Học Tập';
    }
  };

  return (
    <div
      className={`w-full transition-all duration-300 z-30 ${
        zenMode
          ? 'max-w-4xl mx-auto px-4 py-2.5 mb-2 bg-[#090D18]/90 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-2xl'
          : 'max-w-3xl mx-auto px-4 py-2 mb-3 flex items-center justify-between text-xs text-slate-500'
      }`}
    >
      <div className="flex items-center justify-between w-full gap-2 flex-wrap sm:flex-nowrap">
        {/* Left: Mode Title & Elapsed Time */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            title="Thoát phiên học"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                zenMode ? 'text-indigo-400' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {getModeTitle()}
            </span>

            {/* Live Stopwatch */}
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{formatTimer(secondsElapsed)}</span>
            </div>
          </div>
        </div>

        {/* Right: Zen Tools & Ambient Sound Generator */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Ambient Sound Focus Generator (Web Audio API) */}
          <div className="relative flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={toggleAmbientFocus}
              title={
                ambientFocusSound
                  ? 'Tắt âm thanh tập trung'
                  : 'Bật âm thanh tập trung (Sóng não Alpha 432Hz / White Noise thuần)'
              }
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                ambientFocusSound
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Headphones className={`w-3.5 h-3.5 ${ambientFocusSound ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">
                {ambientFocusSound ? 'Âm tập trung: Bật' : 'Âm tập trung'}
              </span>
              {ambientFocusSound && (
                <span className="flex gap-0.5 items-end h-3 ml-0.5">
                  <span className="w-0.5 h-2 bg-white rounded-full animate-pulse" />
                  <span className="w-0.5 h-3 bg-white rounded-full animate-pulse delay-75" />
                  <span className="w-0.5 h-1.5 bg-white rounded-full animate-pulse delay-150" />
                </span>
              )}
            </button>

            {/* Select Sound Type Dropdown / Switcher */}
            {ambientFocusSound && (
              <button
                onClick={() =>
                  setAmbientSoundType(
                    ambientSoundType === 'alpha_drone' ? 'pink_noise' : 'alpha_drone'
                  )
                }
                title="Đổi loại âm thanh tập trung"
                className="px-2 py-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors border-l border-slate-700 ml-1"
              >
                {ambientSoundType === 'alpha_drone' ? '432Hz' : 'Pink Noise'}
              </button>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình [F11]'}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Master Zen Mode Toggle */}
          <button
            onClick={() => toggleZenMode()}
            title={
              zenMode
                ? 'Thoát Chế độ Zen (Phím Z hoặc Esc)'
                : 'Bật Chế độ Tập Trung Tuyệt Đối (Phím Z)'
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
              zenMode
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-glow'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
            }`}
          >
            <Focus className={`w-3.5 h-3.5 ${zenMode ? 'animate-spin' : ''}`} />
            <span>{zenMode ? 'Thoát Zen [Z]' : 'Zen Mode [Z]'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
