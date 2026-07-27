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
        primary: '#F0EDE3',
        secondary: '#C2CBD1',
        metadata: '#AEBBC4',
        disabled: '#75838E',
        evidence: {
          computed: '#10B5A7',
          witness: '#7B68EE',
          unresolved: '#C65D3B',
        },
        'evidence-copy': {
          computed: '#67D4C7',
          witness: '#AFA6FF',
          unresolved: '#EE977C',
        },
        interaction: {
          active: '#C5A017',
          selected: '#89A5FF',
          flow: '#0B50FB',
          focus: '#A9B9FF',
        },
        reading: {
          surface: '#F0EDE3',
          ink: '#171B24',
          muted: '#4C5661',
          rule: '#76652A',
        },
        // State tints (mirror STATE in src/styles/tokens.ts — keep in sync):
        // Witness evidence alias; interaction selection has its own token.
        violetglow: '#7B68EE',
        goldwarm: '#E6B84D',
      },
      fontFamily: {
        display: ['Panchang', 'sans-serif'],
        serif: ['Cinzel', 'Times New Roman', 'serif'],
        body: ['Satoshi', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse-slow 5s ease-in-out infinite',
        'drift': 'drift 20s linear infinite',
        'graph-in': 'graph-in 0.9s ease-out both',
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
        'graph-in': {
          '0%': { opacity: '0', transform: 'scale(0.985)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
