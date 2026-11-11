import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Starfield from '@/components/Starfield';

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
    <html lang="vi" className="dark">
      <body className="min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Starfield Cosmic Background */}
        <Starfield />

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
