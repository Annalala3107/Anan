'use client';

import { useState, useEffect, useRef } from 'react';
import { StorageEngine, ExamRecord } from '@/lib/storage';
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
} from 'lucide-react';
import QrSyncModal from '@/components/QrSyncModal';

export default function ProfilePage() {
  const [streak, setStreak] = useState(1);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [wordProgressCount, setWordProgressCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [examHistory, setExamHistory] = useState<ExamRecord[]>([]);
  const [backupStatus, setBackupStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showQrSync, setShowQrSync] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = () => {
    setStreak(StorageEngine.getStreak());
    setDailyStats(StorageEngine.getDailyStats());
    const progress = StorageEngine.getWordProgress();
    const list = Object.values(progress);
    setWordProgressCount(list.length);
    setMasteredCount(list.filter((p) => p.status === 'mastered').length);
    setExamHistory(StorageEngine.getExamHistory());
  };

  useEffect(() => {
    loadData();
  }, []);

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
      const res = StorageEngine.importAllData(content);

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

  const handleResetProgress = () => {
    if (
      confirm(
        'CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ lịch sử học, streak và bắt đầu lại từ đầu? Hãy xuất file sao lưu trước nếu cần!'
      )
    ) {
      localStorage.removeItem('ananquiz_word_progress');
      localStorage.removeItem('ananquiz_daily_stats');
      localStorage.removeItem('ananquiz_streak');
      localStorage.removeItem('ananquiz_exam_history');
      window.location.reload();
    }
  };

  return (
    <div className="w-full px-3.5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 md:py-10 pb-28 md:pb-12 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-6 rounded-3xl story-glass shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-glow">
          A
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Học Viên AnanQuiz
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hồ sơ học tập cá nhân • Chế độ Lưu trữ Cục Bộ & Đồng bộ Đám mây
          </p>
        </div>
      </div>

      {/* Daily Performance Metrics */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" /> Hoạt Động Hôm Nay ({dailyStats?.date})
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl story-glass hover:border-cyan-400/40 transition-colors">
            <p className="text-xs font-bold text-slate-400 uppercase">Chuỗi ngày (Streak)</p>
            <p className="text-3xl font-black text-amber-500 mt-1 flex items-center gap-1.5">
              <Flame className="w-6 h-6 fill-amber-500" /> {streak}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Ngày học liên tiếp</p>
          </div>

          <div className="p-5 rounded-2xl story-glass hover:border-cyan-400/40 transition-colors">
            <p className="text-xs font-bold text-slate-400 uppercase">Từ đã học hôm nay</p>
            <p className="text-3xl font-black text-indigo-500 mt-1">
              {dailyStats?.wordsLearned || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Qua chế độ Learn</p>
          </div>

          <div className="p-5 rounded-2xl story-glass hover:border-cyan-400/40 transition-colors">
            <p className="text-xs font-bold text-slate-400 uppercase">Luyện Drill & Thi</p>
            <p className="text-3xl font-black text-emerald-500 mt-1">
              {(dailyStats?.wordsDrilled || 0) + (dailyStats?.wordsExamined || 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Câu hỏi đã vượt qua</p>
          </div>

          <div className="p-5 rounded-2xl story-glass hover:border-cyan-400/40 transition-colors">
            <p className="text-xs font-bold text-slate-400 uppercase">Độ chính xác TB</p>
            <p className="text-3xl font-black text-purple-500 mt-1">
              {dailyStats?.accuracy || 100}%
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Trong tất cả các bài tập</p>
          </div>
        </div>
      </div>

      {/* 2-column Layout on Desktop for Backup and History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DISASTER RECOVERY & BACKUP CENTER */}
        <div className="p-6 md:p-8 rounded-3xl story-glass shadow-xl space-y-5 flex flex-col justify-between">
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

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => setShowQrSync(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow text-xs"
              >
                <Smartphone className="w-4 h-4" />
                <span>Đồng Bộ QR 1-Chạm</span>
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
        <div className="p-6 md:p-8 rounded-3xl story-glass shadow-xl space-y-4">
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
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-800/60 text-slate-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Cơ Chế Lặp Lại Ngắt Quãng (SuperMemo SM-2 & Leitner)
            </h3>
            <p className="text-xs text-indigo-300">
              Thuật toán tối ưu hóa đường cong lãng quên (Forgetting Curve) của não bộ
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Mỗi khi bạn trả lời &quot;Đã thuộc&quot; hoặc chọn đúng trong các bài trắc nghiệm, thuật toán sẽ tăng hệ số dễ (Ease Factor) và giãn khoảng cách ngày ôn tập: <strong>1 ngày &rarr; 3 ngày &rarr; 7 ngày &rarr; 16 ngày &rarr; 30 ngày</strong>. Ngược lại, nếu chọn &quot;Chưa nhớ&quot; hoặc trả lời sai, từ vựng sẽ tự động được đưa vào danh sách ưu tiên của chế độ <em>Khắc Phục Lỗi (Mistakes)</em>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="font-bold text-white block mb-1">1. Phản xạ ban đầu</span>
            Học 3 bước (Lật thẻ &rarr; Điền câu &rarr; Phân biệt từ gây nhiễu).
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="font-bold text-white block mb-1">2. Giãn cách chu kỳ</span>
            Từ đạt trên 80% độ nhớ sẽ được phân loại là <em>Đã Thành Thạo (Mastered)</em>.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="font-bold text-white block mb-1">3. Kháng bẫy đề thi</span>
            Rèn luyện phản xạ nhận diện các câu hỏi gài bẫy và đáp án gây nhiễu trong đề thi.
          </div>
        </div>
      </div>

      {/* Cloud & Storage Status */}
      <div className="p-6 rounded-3xl story-glass space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500" /> Trạng Thái Cơ Sở Dữ Liệu & Đồng Bộ
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
                Đang lưu trữ {wordProgressCount} câu hỏi / từ vựng với toàn bộ lịch sử điểm số.
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
                Đồng bộ 1-Chạm đa thiết bị (QR Code & Gzip Hash)
              </p>
              <p className="text-xs text-slate-500">
                Truyền trực tiếp 100% tiến độ SRS, bộ đề tự tạo và streak sang điện thoại không cần tài khoản.
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
            onClick={handleResetProgress}
            className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xoá toàn bộ tiến độ và đặt lại từ đầu</span>
          </button>
        </div>
      </div>

      {/* QR Sync Device Transfer Modal */}
      <QrSyncModal isOpen={showQrSync} onClose={() => setShowQrSync(false)} />
    </div>
  );
}
