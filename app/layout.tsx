import type { Metadata } from 'next';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'AnanQuiz — The Open-Source Smart Quiz & Exam Prep App',
  description:
    'Nền tảng ôn thi trắc nghiệm đại học thông minh (CSI106, SSA101, PRF192) với thuật toán lặp lại ngắt quãng (SRS), hỗ trợ tạo đề bằng AI, 4 chế độ luyện thi và giao diện Cosmic Dark hiện đại.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`dark ${beVietnamPro.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Cosmic Dot-Grid Background */}
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"
          aria-hidden="true"
        />

        {/* Global Desktop Header */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 relative z-10 pb-20 md:pb-8">
          {children}
        </main>

        {/* Mobile Navigation Bar */}
        <BottomNav />
      </body>
    </html>
  );
}
