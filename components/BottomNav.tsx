'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, BookMarked, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Học tập', href: '/', icon: Home },
    { label: 'Bộ đề & AI', href: '/quizzes', icon: Layers },
    { label: 'Tra từ', href: '/library', icon: BookMarked },
    { label: 'Hồ sơ', href: '/profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/85 dark:bg-[#080C14]/90 border-t border-slate-200 dark:border-slate-800/80 px-2 py-1.5 shadow-glass">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
