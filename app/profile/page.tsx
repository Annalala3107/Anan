'use client';

import { useState, useEffect } from 'react';
import { StorageEngine } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  Flame,
  Award,
  Brain,
  CheckCircle2,
  Database,
  Cloud,
  RefreshCw,
  Trash2,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';

export default function ProfilePage() {
  const [streak, setStreak] = useState(1);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [wordProgressCount, setWordProgressCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);

  useEffect(() => {
    setStreak(StorageEngine.getStreak());
    setDailyStats(StorageEngine.getDailyStats());
    const progress = StorageEngine.getWordProgress();
    const list = Object.values(progress);
    setWordProgressCount(list.length);
    setMasteredCount(list.filter((p) => p.status === 'mastered').length);
  }, []);

  const handleResetProgress = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử học và bắt đầu lại?')) {
      localStorage.removeItem('ananquiz_word_progress');
      localStorage.removeItem('ananquiz_daily_stats');
      localStorage.removeItem('ananquiz_streak');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-8 animate-fade-in">
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xl">
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
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase">Chuỗi ngày (Streak)</p>
            <p className="text-3xl font-black text-amber-500 mt-1 flex items-center gap-1.5">
              <Flame className="w-6 h-6 fill-amber-500" /> {streak}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Ngày học liên tiếp</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase">Từ đã học hôm nay</p>
            <p className="text-3xl font-black text-indigo-500 mt-1">
              {dailyStats?.wordsLearned || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Qua chế độ Learn</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase">Luyện Drill & Thi</p>
            <p className="text-3xl font-black text-emerald-500 mt-1">
              {(dailyStats?.wordsDrilled || 0) + (dailyStats?.wordsExamined || 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Câu hỏi đã vượt qua</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase">Độ chính xác TB</p>
            <p className="text-3xl font-black text-purple-500 mt-1">
              {dailyStats?.accuracy || 100}%
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Trong tất cả các bài tập</p>
          </div>
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
            Ngữ cảnh thi SAT kiểm tra khả năng phân biệt từ đồng nghĩa và từ dễ nhầm.
          </div>
        </div>
      </div>

      {/* Cloud & Storage Status */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 space-y-4">
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
                Đang lưu trữ {wordProgressCount} từ vựng với toàn bộ lịch sử điểm số.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full self-start sm:self-center">
            Sẵn sàng hoạt động offline
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isSupabaseConfigured ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Đồng bộ Supabase PostgreSQL (Cloud Sync)
              </p>
              <p className="text-xs text-slate-500">
                {isSupabaseConfigured
                  ? 'Đã kết nối thành công với Supabase URL & Key.'
                  : 'Chưa cấu hình Supabase keys trong file .env.local (Không bắt buộc).'}
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full self-start sm:self-center ${
            isSupabaseConfigured
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
              : 'text-slate-500 bg-slate-200 dark:bg-slate-700'
          }`}>
            {isSupabaseConfigured ? 'Đang kích hoạt' : 'Chế độ Local-First'}
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
    </div>
  );
}
