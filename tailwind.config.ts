import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Gilroy', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['The Seasons', 'Cormorant Garamond', 'Georgia', 'serif'],
        serif:   ['The Seasons', 'Cormorant Garamond', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#a9674d',
          light:   '#f5ece7',
          dark:    '#8a4f39',
        },
        sidebar: {
          bg:    '#1a1a1a',
          text:  '#f5f2e9',
          muted: '#a89e8e',
        },
        surface:    '#FFFFFF',
        'app-bg':   '#f5f2e9',
        'app-border':'#ede0d0',
        pipeline: {
          pm:      '#344161',
          content: '#6f8e7c',
          art:     '#a9674d',
          events:  '#c99d5d',
        },
        status: {
          todo:      '#888888',
          inprogress:'#344161',
          inreview:  '#747440',
          done:      '#6f8e7c',
          urgent:    '#9f4022',
        },
        redalert: {
          bg:  '#fdf2ee',
          txt: '#9f4022',
        },
      },
      fontSize: {
        'xxs':  '11px',
        'xs':   '12px',
        'sm':   '13px',
        'base': '14px',
        'md':   '16px',
        'lg':   '20px',
        'xl':   '24px',
        '2xl':  '32px',
      },
    },
  },
  plugins: [],
}

export default config
