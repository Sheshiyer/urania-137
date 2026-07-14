/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#070B1D',
        surface: '#0E1428',
        parchment: '#F0EDE3',
        silver: '#8A9BA8',
        violet: '#2D0050',
        indigo: '#0B50FB',
        gold: '#C5A017',
        emerald: '#10B5A7',
        terracotta: '#C65D3B',
      },
      fontFamily: {
        display: ['Panchang', 'sans-serif'],
        body: ['Satoshi', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse-slow 5s ease-in-out infinite',
        'drift': 'drift 20s linear infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        'drift': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
