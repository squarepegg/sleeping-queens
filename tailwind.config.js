/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        'card-bg': '#f8f4e6',
        'card-border': '#d4af37',
        'queen-pink': '#ff69b4',
        'queen-purple': '#9370db',
        'king-gold': '#ffd700',
        'knight-silver': '#c0c0c0',
        'dragon-red': '#dc143c',
        'wand-blue': '#4169e1',
        'potion-green': '#32cd32',
      },
      fontFamily: {
        'medieval': ['Cinzel', 'serif'],
      },
      backgroundImage: {
        'card-pattern': "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDFMMTMgN0gxOUwxNCAEMTAuNSA5TDE3IDE1SDExTDEwIDE5TDkgMTVIM0w2IDExTDEuNSA5TDEgN0g3TDEwIDFaIiBmaWxsPSIjZjBmMGYwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4K')",
      },
      animation: {
        'card-flip': 'cardFlip 0.6s ease-in-out',
        'card-hover': 'cardHover 0.3s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        cardHover: {
          '0%': { transform: 'translateY(0px) scale(1)' },
          '100%': { transform: 'translateY(-8px) scale(1.05)' },
        },
      },
      boxShadow: {
        'card': '0 4px 8px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)',
        'queen': '0 0 20px rgba(255, 105, 180, 0.5)',
      },
    },
  },
  plugins: [],
}