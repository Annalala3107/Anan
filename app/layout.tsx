import type { Metadata } from 'next';
import { Be_Vietnam_Pro, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import DynamicConstellationBackground from '@/components/DynamicConstellationBackground';
import YouTubeAudioEngine from '@/components/music/YouTubeAudioEngine';
import FloatingMiniPlayer from '@/components/music/FloatingMiniPlayer';
import ZenFocusOverlay from '@/components/music/ZenFocusOverlay';
import PwaRegistrar from '@/components/PwaRegistrar';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-sans',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['vietnamese', 'latin', 'greek'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-reading',
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
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'AnanQuiz',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`dark ${beVietnamPro.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}var m=localStorage.getItem('ananquiz_motion_mode');if(m==='full'||m==='reduced'||m==='system'){document.documentElement.setAttribute('data-motion',m);}else{document.documentElement.setAttribute('data-motion','system');}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
      </head>
      <body className="min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Dynamic Procedural Constellation & Aurora Background */}
        <DynamicConstellationBackground />

        {/* Global Desktop Header */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 relative z-10 pb-20 md:pb-8">
          {children}
        </main>

        {/* Mobile Navigation Bar */}
        <BottomNav />

        {/* Persistent Global YouTube Music Engine, Floating Mini-Player & Zen Focus Overlay */}
        <YouTubeAudioEngine />
        <FloatingMiniPlayer />
        <ZenFocusOverlay />
        <PwaRegistrar />
      </body>
    </html>
  );
}
