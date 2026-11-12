'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  Code2,
  Cpu,
  Database,
  Globe,
  BookOpen,
  Brain,
  Layers,
  GraduationCap,
  Flame,
  Terminal,
  Binary,
  FolderPlus,
  Check,
  Sparkles,
} from 'lucide-react';
import { CustomSubject } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';

export const SUBJECT_ICONS = [
  { name: 'Calculator', label: 'Toán / Logic', Icon: Calculator },
  { name: 'Code2', label: 'Lập trình / Code', Icon: Code2 },
  { name: 'Cpu', label: 'Phần cứng / Chip', Icon: Cpu },
  { name: 'Database', label: 'Cơ sở dữ liệu', Icon: Database },
  { name: 'Globe', label: 'Mạng / Web', Icon: Globe },
  { name: 'Brain', label: 'AI / Trí tuệ', Icon: Brain },
  { name: 'BookOpen', label: 'Lý thuyết / Sách', Icon: BookOpen },
  { name: 'Layers', label: 'Cấu trúc / Hệ thống', Icon: Layers },
  { name: 'GraduationCap', label: 'Kỹ năng / ĐH', Icon: GraduationCap },
  { name: 'Terminal', label: 'Linux / OS', Icon: Terminal },
  { name: 'Binary', label: 'Nhị phân / Số', Icon: Binary },
  { name: 'Flame', label: 'Cấp tốc / Thi cử', Icon: Flame },
];

export const SUBJECT_GRADIENTS = [
  { id: 'from-indigo-600 to-purple-600', label: 'Tím Indigo', preview: 'bg-gradient-to-r from-indigo-600 to-purple-600' },
  { id: 'from-blue-600 to-cyan-500', label: 'Xanh Lam', preview: 'bg-gradient-to-r from-blue-600 to-cyan-500' },
  { id: 'from-emerald-600 to-teal-500', label: 'Xanh Lục', preview: 'bg-gradient-to-r from-emerald-600 to-teal-500' },
  { id: 'from-amber-600 to-orange-500', label: 'Cam Hổ Phách', preview: 'bg-gradient-to-r from-amber-600 to-orange-500' },
  { id: 'from-rose-600 to-pink-500', label: 'Đỏ Hồng', preview: 'bg-gradient-to-r from-rose-600 to-pink-500' },
  { id: 'from-violet-600 to-fuchsia-600', label: 'Hồng Fuchsia', preview: 'bg-gradient-to-r from-violet-600 to-fuchsia-600' },
];

export const POPULAR_PRESETS = [
  {
    code: 'MAD101',
    title: 'Toán Rời Rạc (Discrete Mathematics)',
    description: 'Mệnh đề logic, vị từ, tập hợp, đồ thị, cây, thuật toán Euler & Dijkstra.',
    iconName: 'Calculator',
    color: 'from-indigo-600 to-purple-600',
  },
  {
    code: 'MAS291',
    title: 'Xác Suất Thống Kê (Probability & Statistics)',
    description: 'Biến ngẫu nhiên, phân phối chuẩn, kỳ vọng, phương sai, ước lượng và kiểm định giả thuyết.',
    iconName: 'Calculator',
    color: 'from-blue-600 to-cyan-500',
  },
  {
    code: 'SWE201',
    title: 'Nhập Môn Kỹ Thuật Phần Mềm (Software Engineering)',
    description: 'Quy trình SDLC, Agile Scrum, mô hình Waterfall, thiết kế kiến trúc và kiểm thử phần mềm.',
    iconName: 'Layers',
    color: 'from-emerald-600 to-teal-500',
  },
  {
    code: 'JPD113',
    title: 'Tiếng Nhật Sơ Cấp (Elementary Japanese)',
    description: 'Ngữ pháp, từ vựng, Hiragana, Katakana, Kanji và hội thoại cơ bản kỳ 1.',
    iconName: 'BookOpen',
    color: 'from-rose-600 to-pink-500',
  },
  {
    code: 'ECO111',
    title: 'Kinh Tế Vi Mô (Microeconomics)',
    description: 'Quy luật cung cầu, độ co giãn, thặng dư tiêu dùng, hành vi doanh nghiệp và cấu trúc thị trường.',
    iconName: 'Brain',
    color: 'from-amber-600 to-orange-500',
  },
];

interface CustomSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectSaved: (subject: CustomSubject) => void;
  editingSubject?: CustomSubject | null;
}

export default function CustomSubjectModal({
  isOpen,
  onClose,
  onSubjectSaved,
  editingSubject,
}: CustomSubjectModalProps) {
  const [subjectCode, setSubjectCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('BookOpen');
  const [color, setColor] = useState('from-indigo-600 to-purple-600');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingSubject) {
      setSubjectCode(editingSubject.subjectCode);
      setTitle(editingSubject.title);
      setDescription(editingSubject.description || '');
      setIconName(editingSubject.iconName || 'BookOpen');
      setColor(editingSubject.color || 'from-indigo-600 to-purple-600');
    } else {
      setSubjectCode('');
      setTitle('');
      setDescription('');
      setIconName('BookOpen');
      setColor('from-indigo-600 to-purple-600');
    }
    setError(null);
  }, [editingSubject, isOpen]);

  // Support pressing Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof POPULAR_PRESETS[0]) => {
    setSubjectCode(preset.code);
    setTitle(preset.title);
    setDescription(preset.description);
    setIconName(preset.iconName);
    setColor(preset.color);
  };

  const handleSave = () => {
    const cleanCode = subjectCode.trim().toUpperCase();
    const cleanTitle = title.trim();

    if (!cleanCode) {
      setError('Vui lòng nhập Mã môn học (ví dụ: MAD101, SWE201...)');
      return;
    }
    if (!cleanTitle) {
      setError('Vui lòng nhập Tên môn học');
      return;
    }

    try {
      if (editingSubject) {
        const updated = StorageEngine.updateCustomSubject(editingSubject.id, {
          subjectCode: cleanCode,
          title: cleanTitle,
          description: description.trim(),
          iconName,
          color,
        });
        if (updated) {
          onSubjectSaved(updated);
          onClose();
        }
      } else {
        const created = StorageEngine.saveCustomSubject({
          subjectCode: cleanCode,
          title: cleanTitle,
          description: description.trim(),
          iconName,
          color,
        });
        onSubjectSaved(created);
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || 'Có lỗi xảy ra khi lưu môn học.');
    }
  };

  const SelectedIconComp =
    SUBJECT_ICONS.find((i) => i.name === iconName)?.Icon || BookOpen;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${color} flex items-center justify-center text-white shadow-md`}>
              <SelectedIconComp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {editingSubject ? 'Chỉnh Sửa Môn Học' : 'Thêm Môn Học Mới'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tạo chuyên mục môn học để quản lý bộ đề thi và cày phản xạ theo môn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Đóng cửa sổ"
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Quick Preset Selector (Only in Create Mode) */}
          {!editingSubject && (
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý môn học phổ biến (1-Click chọn nhanh)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_PRESETS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-colors border border-slate-200 dark:border-slate-700/60"
                  >
                    {p.code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Code & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Mã Môn Học *
              </label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                placeholder="VD: MAD101"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Tên Môn Học Đầy Đủ *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Toán Rời Rạc & Lý Thuyết Đồ Thị"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Mô tả ngắn về môn học (tùy chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="VD: Tổng hợp các dạng bài tập trắc nghiệm suy luận logic, vị từ, đồ thị Euler, chu trình Hamilton..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              Biểu tượng đại diện
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {SUBJECT_ICONS.map((item) => {
                const isSelected = iconName === item.name;
                const IconComponent = item.Icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIconName(item.name)}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold ${
                      isSelected
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-[10px] truncate max-w-full">{item.label.split('/')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Gradient Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
              Màu chủ đạo (Gradient)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUBJECT_GRADIENTS.map((g) => {
                const isSelected = color === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setColor(g.id)}
                    className={`p-2 rounded-xl flex items-center gap-2 border transition-all text-xs font-bold ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${g.preview} shrink-0`} />
                    <span className="truncate">{g.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold shadow-glow active:scale-95 transition-all flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{editingSubject ? 'Cập Nhật Môn Học' : 'Tạo Môn Học Ngay'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
