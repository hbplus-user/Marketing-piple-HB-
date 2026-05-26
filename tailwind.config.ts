import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#4F46E5',
          light: '#EEF2FF',
          dark: '#3730A3',
        },
        sidebar: {
          bg: '#1E1B4B',
          text: '#C7D2FE',
          muted: '#6B7280',
        },
        surface: '#FFFFFF',
        'app-bg': '#F8F9FB',
        'app-border': '#E5E7EB',
        pipeline: {
          pm: '#7C3AED',
          content: '#0EA5E9',
          art: '#EC4899',
          events: '#F59E0B',
        },
        status: {
          todo: '#6B7280',
          inprogress: '#3B82F6',
          inreview: '#8B5CF6',
          done: '#10B981',
          urgent: '#EF4444',
        },
        redalert: {
          bg: '#FEF2F2',
          txt: '#DC2626',
        },
      },
      fontSize: {
        'xxs': '11px',
        'xs': '12px',
        'sm': '13px',
        'base': '14px',
        'md': '16px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '32px',
      },
    },
  },
  plugins: [],
}

export default config
