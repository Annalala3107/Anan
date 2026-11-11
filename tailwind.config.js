/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1', // Cosmic Indigo
          dark: '#4F46E5',
          light: '#818CF8',
          glow: '#A5B4FC',
        },
        secondary: {
          DEFAULT: '#8B5CF6', // Purple
          dark: '#7C3AED',
          light: '#A78BFA',
        },
        success: {
          DEFAULT: '#10B981', // Emerald
          dark: '#059669',
          light: '#34D399',
        },
        warning: {
          DEFAULT: '#F59E0B', // Amber
          dark: '#D97706',
          light: '#FBBF24',
        },
        danger: {
          DEFAULT: '#EF4444', // Rose / Red
          dark: '#DC2626',
          light: '#F87171',
        },
        cosmic: {
          bg: '#080C14',
          surface: '#0F172A',
          card: '#131D31',
          border: '#1E293B',
          hover: '#1B273F',
        },
      },
      boxShadow: {
        glow: '0 0 25px -5px rgba(99, 102, 241, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(139, 92, 246, 0.4)',
        'glow-success': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'glow-danger': '0 0 25px -5px rgba(239, 68, 68, 0.4)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'fade-in': 'fadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-up': 'scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'question-enter': 'questionEnter 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        'pop-correct': 'popCorrect 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        shake: 'shakeWrong 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translate3d(0, 10px, 0)', opacity: '0' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '1' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.96) translate3d(0, 6px, 0)', opacity: '0' },
          '100%': { transform: 'scale(1) translate3d(0, 0, 0)', opacity: '1' },
        },
        questionEnter: {
          '0%': { transform: 'translate3d(0, 8px, 0) scale(0.994)', opacity: '0.01' },
          '100%': { transform: 'translate3d(0, 0, 0) scale(1)', opacity: '1' },
        },
        popCorrect: {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.018)' },
          '100%': { transform: 'scale(1)' },
        },
        shakeWrong: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '20%, 60%': { transform: 'translate3d(-5px, 0, 0)' },
          '40%, 80%': { transform: 'translate3d(5px, 0, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0px, 0)' },
          '50%': { transform: 'translate3d(0, -8px, 0)' },
        },
      },
    },
  },
  plugins: [],
}
