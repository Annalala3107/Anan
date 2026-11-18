'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StorageEngine, ExamRecord } from '@/lib/storage';
import { CustomQuiz, CustomSubject, DailyStats, WordProgress } from '@/lib/types';
import { QUESTION_BANKS } from '@/lib/defaultBanks';
import { getQuestionKey } from '@/lib/utils';
import {
  Flame,
  Brain,
  CheckCircle2,
  Database,
  Trash2,
  TrendingUp,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  History,
  Smartphone,
  Sparkles,
  Clock,
  BarChart3,
  ArrowRight,
  Layers,
} from 'lucide-react';
import QrSyncModal from '@/components/QrSyncModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useQuizStore } from '@/lib/quizStore';

interface ManifestEntry {
  count: number;
  subject?: string;
  keys?: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [streak, setStreak] = useState(1);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [dailyHistory, setDailyHistory] = useState<DailyStats[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [wordProgressCount, setWordProgressCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [dueWordsCount, setDueWordsCount] = useState(0);
  const [examHistory, setExamHistory] = useState<ExamRecord[]>([]);
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>([]);
  const [manifestFiles, setManifestFiles] = useState<Record<string, ManifestEntry>>({});
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [backupStatus, setBackupStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showQrSync, setShowQrSync] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const showConstellationHud = useQuizStore((s) => s.showConstellationHud);
  const setShowConstellationHud = useQuizStore((s) => s.setShowConstellationHud);
  const enableConstellationBg = useQuizStore((s) => s.enableConstellationBg);
  const setEnableConstellationBg = useQuizStore((s) => s.setEnableConstellationBg);
  const triggerConstellationAction = useQuizStore((s) => s.triggerConstellationAction);
  const hydrateSelection = useQuizStore((s) => s.hydrateSelection);
  const setSelectedQuizPath = useQuizStore((s) => s.setSelectedQuizPath);
  const setActiveCustomQuiz = useQuizStore((s) => s.setActiveCustomQuiz);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = () => {
    setStreak(StorageEngine.getStreak());
    setDailyStats(StorageEngine.getDailyStats());
    setDailyHistory(StorageEngine.getDailyHistory(14));
    const progress = StorageEngine.getWordProgress();
    setProgressMap(progress);
    const list = Object.values(progress);
    setWordProgressCount(list.length);
    setMasteredCount(list.filter((p) => p.status === 'mastered').length);
    setDueWordsCount(StorageEngine.getDueWordsCount(progress));
    setExamHistory(StorageEngine.getExamHistory());
    setCustomQuizzes(StorageEngine.getCustomQuizzes());
    setCustomSubjects(StorageEngine.getCustomSubjects());
  };

  useEffect(() => {
    hydrateSelection();
    loadData();
    const onStatsUpdated = () => loadData();
    window.addEventListener('ananquiz:stats-updated', onStatsUpdated);
    return () => window.removeEventListener('ananquiz:stats-updated', onStatsUpdated);
  }, [hydrateSelection]);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/index.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.files) {
          setManifestFiles(data.files as Record<string, ManifestEntry>);
        }
      })
      .catch(() => {
        // Ignore offline/network errors gracefully
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subjectBreakdown = useMemo(() => {
    const items: Array<{
      id: string;
      code: string;
      title: string;
      color: string;
      mastered: number;
      seen: number;
      total: number;
      percent: number;
      primaryPath?: string;
      firstCustomQuiz?: CustomQuiz;
    }> = [];

    for (const sec of QUESTION_BANKS) {
      const keySet = new Set<string>();
      for (const q of sec.quizzes) {
        const entry = manifestFiles[q.file_path];
        if (entry?.keys) {
          for (const k of entry.keys) keySet.add(k);
        }
      }
      for (const cq of customQuizzes) {
        if (cq.subject === sec.subjectCode) {
          for (const w of cq.words || []) {
            keySet.add(getQuestionKey(w));
          }
        }
      }

      let mastered = 0;
      let seen = 0;
      keySet.forEach((k) => {
        const p = progressMap[k];
        if (p?.status === 'mastered') {
          mastered++;
          seen++;
        } else if (p && p.seenCount > 0) {
          seen++;
        }
      });

      const fallbackTotal = sec.quizzes.reduce((max, q) => Math.max(max, q.wordCount || 0), 0);
      const total = keySet.size > 0 ? keySet.size : fallbackTotal;
      items.push({
        id: sec.id,
        code: sec.subjectCode,
        title: sec.title,
        color: sec.color,
        mastered,
        seen,
        total,
        percent: total > 0 ? Math.min(100, Math.round((mastered / total) * 100)) : 0,
        primaryPath: sec.quizzes[0]?.file_path,
      });
    }

    for (const cs of customSubjects) {
      const matchingQuizzes = customQuizzes.filter((q) => q.subject === cs.subjectCode);
      const keySet = new Set<string>();
      for (const cq of matchingQuizzes) {
        for (const w of cq.words || []) {
          keySet.add(getQuestionKey(w));
        }
      }
      let mastered = 0;
      let seen = 0;
      keySet.forEach((k) => {
        const p = progressMap[k];
        if (p?.status === 'mastered') {
          mastered++;
          seen++;
        } else if (p && p.seenCount > 0) {
          seen++;
        }
      });
      const total = keySet.size;
      items.push({
        id: `custom_${cs.id}`,
        code: cs.subjectCode,
        title: cs.title,
        color: cs.color,
        mastered,
        seen,
        total,
        percent: total > 0 ? Math.min(100, Math.round((mastered / total) * 100)) : 0,
        firstCustomQuiz: matchingQuizzes[0],
      });
    }

    return items;
  }, [manifestFiles, customQuizzes, customSubjects, progressMap]);

  const maxDailyActivity = useMemo(
    () =>
      Math.max(
        1,
        ...dailyHistory.map((d) => d.wordsLearned + d.wordsDrilled + d.wordsExamined)
      ),
    [dailyHistory]
  );

  const total14DayQuestions = useMemo(
    () =>
      dailyHistory.reduce(
        (acc, d) => acc + d.wordsLearned + d.wordsDrilled + d.wordsExamined,
        0
      ),
    [dailyHistory]
  );

  const handleExportBackup = () => {
    try {
      const jsonContent = StorageEngine.exportAllData();
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      link.href = url;
      link.download = `AnanQuiz_Backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupStatus({
        type: 'success',
        text: 'Đã xuất file sao lưu thành công! Hãy lưu file này vào nơi an toàn.',
      });
    } catch (err: any) {
      setBackupStatus({
        type: 'error',
        text: 'Không thể xuất file sao lưu: ' + (err?.message || 'Lỗi không xác định'),
      });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageEngine.importAllData(content, { mode: importMode });

      if (res.success) {
        loadData();
        setBackupStatus({
          type: 'success',
          text: res.message,
        });
      } else {
        setBackupStatus({
          type: 'error',
          text: res.message,
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setBackupStatus({
        type: 'error',
        text: 'Không thể đọc file. Vui lòng thử lại với file .json hợp lệ.',
      });
    };

    reader.readAsText(file);
  };

  const executeResetProgress = () => {
    localStorage.removeItem('ananquiz_word_progress');
    localStorage.removeItem('ananquiz_daily_stats');
    localStorage.removeItem('ananquiz_streak');
    localStorage.removeItem('ananquiz_exam_history');
    window.location.reload();
  };

  return (
    <div className="w-full px-3.5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 md:py-10 pb-28 md:pb-12 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-6 rounded-3xl glass-surface">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-glow">
          A
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Học Viên AnanQuiz
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hồ sơ học tập cá nhân • Lưu trữ cục bộ &amp; Chuyển dữ liệu qua QR / Mã PIN 15 phút
          </p>
        </div>
      </div>

      {/* Daily Performance Metrics */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" /> Hoạt Động Hôm Nay ({dailyStats?.date})
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl glass-surface hover:border-cyan-400/40 transition-colors">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Chuỗi ngày (Streak)</p>
            <p className="text-3xl font-black text-amber-500 mt-1 flex items-center gap-1.5">
              <Flame className="w-6 h-6 fill-amber-500" /> {streak}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Ngày học liên tiếp</p>
          </div>

          <div className="p-5 rounded-2xl glass-surface hover:border-cyan-400/40 transition-colors">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Câu đã học hôm nay</p>
            <p className="text-3xl font-black text-indigo-500 mt-1">
              {dailyStats?.wordsLearned || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Qua chế độ Học (Learn)</p>
          </div>

          <div className="p-5 rounded-2xl glass-surface hover:border-cyan-400/40 transition-colors">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Luyện Drill & Thi</p>
            <p className="text-3xl font-black text-emerald-500 mt-1">
              {(dailyStats?.wordsDrilled || 0) + (dailyStats?.wordsExamined || 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Câu hỏi đã vượt qua</p>
          </div>

          <div className="p-5 rounded-2xl glass-surface hover:border-cyan-400/40 transition-colors">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Độ chính xác TB</p>
            <p className="text-3xl font-black text-purple-500 mt-1">
              {dailyStats?.accuracy || 100}%
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Trong tất cả các bài tập</p>
          </div>
        </div>
      </div>

      {/* SRS Due Today Action Card */}
      <div className="p-5 sm:p-6 rounded-3xl glass-surface border border-amber-500/35 bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Hàng đợi SRS đến hạn hôm nay: {dueWordsCount} câu
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tổng cộng đã thành thạo <strong className="text-emerald-500">{masteredCount}</strong>/{wordProgressCount} câu hỏi đã học trên toàn bộ ngân hàng.
            </p>
          </div>
        </div>

        <Link
          href="/session/learn?due=1"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm shadow-sm transition-all shrink-0 whitespace-nowrap"
        >
          <span>{dueWordsCount > 0 ? 'Ôn Câu Đến Hạn Ngay' : 'Vào Ôn Tập Thẻ 3D'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 14-Day Activity Chart + Subject Mastery Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 14-Day History Bar Chart */}
        <div className="p-6 md:p-8 rounded-3xl glass-surface space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              <span>Hoạt Động 14 Ngày Gần Nhất</span>
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
              {total14DayQuestions} câu đã giải
            </span>
          </div>

          <div className="grid gap-1.5 items-end h-36 pt-4 pb-1 px-2 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
            {dailyHistory.map((day, idx) => {
              const totalDay = day.wordsLearned + day.wordsDrilled + day.wordsExamined;
              const heightPct = totalDay > 0 ? Math.max(14, Math.round((totalDay / maxDailyActivity) * 100)) : 6;
              const isToday = idx === dailyHistory.length - 1;
              const label = day.date.slice(5).replace('-', '/');

              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${totalDay} câu (Learn: ${day.wordsLearned}, Drill: ${day.wordsDrilled}, Exam: ${day.wordsExamined})${day.accuracySamples ? ` • Chính xác: ${day.accuracy}%` : ''}`}
                  className="flex flex-col items-center justify-end h-full gap-1.5 group"
                >
                  <span className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {totalDay}
                  </span>
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      className={`w-full max-w-[16px] rounded-t-md transition-all duration-300 ${
                        totalDay === 0
                          ? 'bg-slate-200 dark:bg-slate-800'
                          : isToday
                          ? 'bg-gradient-to-t from-indigo-600 to-cyan-400 shadow-glow'
                          : 'bg-indigo-500/75 group-hover:bg-indigo-500'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-mono leading-none ${isToday ? 'font-black text-indigo-500' : 'text-slate-400'}`}>
                    {idx % 2 === 0 || isToday ? label : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Di chuột vào từng cột ngày để xem chi tiết số câu Học / Drill / Thi Thử và độ chính xác (lưu 30 ngày gần nhất).
          </p>
        </div>

        {/* Per-Subject Mastery Breakdown */}
        <div className="p-6 md:p-8 rounded-3xl glass-surface space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-500" />
              <span>Tiến Độ Thành Thạo Theo Môn</span>
            </h3>
            <span className="text-xs text-slate-400">{subjectBreakdown.length} môn học</span>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {subjectBreakdown.map((sub) => (
              <div
                key={sub.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                        {sub.code}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {sub.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Đã thuộc <strong className="text-emerald-500">{sub.mastered}</strong>/{sub.total} câu ({sub.percent}%) · Đã ôn {sub.seen} câu
                    </p>
                  </div>

                  {(sub.primaryPath || sub.firstCustomQuiz) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (sub.primaryPath) {
                          setActiveCustomQuiz(null);
                          setSelectedQuizPath(sub.primaryPath);
                          router.push('/session/learn');
                        } else if (sub.firstCustomQuiz) {
                          setActiveCustomQuiz(sub.firstCustomQuiz);
                          router.push('/session/learn');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      Ôn ngay
                    </button>
                  )}
                </div>

                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${sub.color} transition-all duration-300`}
                    style={{ width: `${Math.max(sub.percent, sub.seen > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2-column Layout on Desktop for Backup and History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DISASTER RECOVERY & BACKUP CENTER */}
        <div className="p-6 md:p-8 rounded-3xl glass-surface space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Trung Tâm Sao Lưu & Phục Hồi Khẩn Cấp
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bảo vệ 100% tiến độ học tập, streak và điểm số của bạn.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Zod Validated
              </span>
            </div>

            {/* Restore Mode Selector */}
            <div className="flex items-center justify-between flex-wrap gap-2 py-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px]">
              <span className="font-bold text-slate-600 dark:text-slate-300">
                Chế độ khi Khôi Phục File (.json):
              </span>
              <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    importMode === 'merge'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Hợp nhất thông minh
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('overwrite')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    importMode === 'overwrite'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Ghi đè toàn bộ
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQrSync(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow text-xs cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Chuyển QR / Mã PIN</span>
              </button>

              <button
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 transition-all text-xs"
              >
                <Download className="w-4 h-4 text-indigo-500" />
                <span>Xuất File (.json)</span>
              </button>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 transition-all text-xs"
                >
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Khôi Phục File</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status Toast */}
          {backupStatus && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 transition-all mt-4 ${
                backupStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {backupStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{backupStatus.text}</span>
            </div>
          )}
        </div>

        {/* RECENT EXAM HISTORY */}
        <div className="p-6 md:p-8 rounded-3xl glass-surface space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" /> Lịch Sử Thi Thử Gần Đây ({examHistory.length})
            </h3>
            <span className="text-xs text-slate-400">Tách biệt độc lập SRS</span>
          </div>

          {examHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              Chưa có bài thi thử nào được ghi nhận. Hãy hoàn thành một bài thi thử để theo dõi tiến độ điểm số tại đây!
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {examHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {rec.quizTitle || 'Bài thi thử trắc nghiệm'}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(rec.date).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Số câu đúng: <strong className="text-indigo-500">{rec.score}</strong>/{rec.total} câu
                      {rec.wrongCount > 0 && (
                        <span className="text-rose-500 ml-1">({rec.wrongCount} câu sai)</span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-base font-black ${
                        rec.percent >= 80
                          ? 'text-emerald-500'
                          : rec.percent >= 50
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {rec.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SRS Algorithm Explanation Card */}
      <div className="p-6 md:p-8 rounded-3xl glass-elevated bg-gradient-to-br from-indigo-50/90 via-purple-50/75 to-white/95 dark:from-indigo-950/60 dark:via-slate-900/60 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800/60 text-slate-700 dark:text-slate-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Cơ Chế Lặp Lại Ngắt Quãng (SuperMemo SM-2 & Leitner)
            </h3>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              Thuật toán tối ưu hóa đường cong lãng quên (Forgetting Curve) của não bộ
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Mỗi khi bạn chọn &quot;Đã thuộc&quot; hoặc trả lời đúng trong các bài trắc nghiệm, thuật toán sẽ tăng hệ số dễ (Ease Factor) và giãn khoảng cách ngày ôn tập: <strong>1 ngày &rarr; 3 ngày &rarr; 7 ngày &rarr; 16 ngày &rarr; 30 ngày</strong>. Ngược lại, nếu chọn &quot;Chưa nhớ&quot; hoặc trả lời sai, câu hỏi sẽ tự động được đưa vào danh sách ưu tiên của chế độ <em>Khắc Phục Lỗi (Mistakes)</em>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-white/80 dark:bg-white/5 border border-indigo-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">1. Phản xạ chủ động</span>
            Lật thẻ Flashcard 3D, điền trắc nghiệm &amp; đối chiếu giải thích chi tiết từng đáp án.
          </div>
          <div className="p-3 rounded-xl bg-white/80 dark:bg-white/5 border border-indigo-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">2. Giãn cách chu kỳ</span>
            Câu hỏi đạt trên 80% độ nhớ sẽ được phân loại là <em>Đã Thành Thạo (Mastered)</em>.
          </div>
          <div className="p-3 rounded-xl bg-white/80 dark:bg-white/5 border border-indigo-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">3. Kháng bẫy đề thi</span>
            Rèn luyện phản xạ nhận diện các câu hỏi gài bẫy và đáp án gây nhiễu trong đề thi.
          </div>
        </div>
      </div>

      {/* Appearance & Performance Controls (Constellation HUD Settings) */}
      <div className="p-6 rounded-3xl glass-surface space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Giao Diện & Bảng Thông Số Chòm Sao
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bật/tắt thanh điều khiển FPS & chòm sao nền nổi ở góc dưới bên trái màn hình.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableConstellationBg}
                onChange={(e) => setEnableConstellationBg(e.target.checked)}
                className="rounded accent-indigo-600 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Hiệu ứng chòm sao chuyển động (Tắt để tiết kiệm Pin/GPU)
              </span>
            </label>

            <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showConstellationHud}
                onChange={(e) => setShowConstellationHud(e.target.checked)}
                className="rounded accent-cyan-600 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {showConstellationHud ? 'Đang hiện HUD hiệu năng' : 'Ẩn HUD (Gọn gàng)'}
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            disabled={!enableConstellationBg}
            onClick={() => triggerConstellationAction('regenerate')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            🎲 Tạo chòm sao mới
          </button>
          <button
            type="button"
            disabled={!enableConstellationBg}
            onClick={() => triggerConstellationAction('shooting_star')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 text-xs font-bold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            ☄️ Thả sao băng ngay
          </button>
        </div>
      </div>

      {/* Storage & Transfer Status */}
      <div className="p-6 rounded-3xl glass-surface space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500" /> Trạng Thái Cơ Sở Dữ Liệu &amp; Chuyển Thiết Bị
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Bộ nhớ cục bộ trình duyệt (Local Storage)
              </p>
              <p className="text-xs text-slate-500">
                Đang lưu trữ {wordProgressCount} câu hỏi với toàn bộ lịch sử điểm số.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full self-start sm:self-center">
            Sẵn sàng hoạt động offline
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Chuyển dữ liệu qua QR / Mã PIN 15 phút
              </p>
              <p className="text-xs text-slate-500">
                Truyền trực tiếp 100% tiến độ SRS, bộ đề tự tạo và streak sang thiết bị khác không cần tài khoản (mã tự hủy ngay khi nhận).
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full self-start sm:self-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40">
            Đang kích hoạt
          </span>
        </div>

        {/* Reset Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xoá toàn bộ tiến độ và đặt lại từ đầu</span>
          </button>
        </div>
      </div>

      {/* QR Sync Device Transfer Modal */}
      <QrSyncModal isOpen={showQrSync} onClose={() => setShowQrSync(false)} />

      {/* Reset Progress Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Xóa toàn bộ tiến độ học?"
        message="CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn lịch sử SRS, streak và lịch sử thi thử trên trình duyệt này. Hãy xuất file sao lưu JSON trước nếu cần!"
        confirmText="Xóa toàn bộ & đặt lại"
        cancelText="Hủy"
        variant="danger"
        onConfirm={executeResetProgress}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
