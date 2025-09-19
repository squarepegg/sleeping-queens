/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/presentation/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      // Mobile-first breakpoints
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Device-specific breakpoints
      'mobile': '320px',
      'tablet': '768px',
      'laptop': '1024px',
      'desktop': '1280px',
      // Orientation breakpoints
      'portrait': { 'raw': '(orientation: portrait)' },
      'landscape': { 'raw': '(orientation: landscape)' },
      // Touch device detection
      'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
      'mouse': { 'raw': '(hover: hover) and (pointer: fine)' },
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
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      fontSize: {
        // Responsive font sizes using clamp
        'xs-responsive': 'clamp(0.65rem, 1.5vw, 0.75rem)',
        'sm-responsive': 'clamp(0.75rem, 2vw, 0.875rem)',
        'base-responsive': 'clamp(0.875rem, 2.5vw, 1rem)',
        'lg-responsive': 'clamp(1rem, 3vw, 1.125rem)',
        'xl-responsive': 'clamp(1.125rem, 3.5vw, 1.25rem)',
        '2xl-responsive': 'clamp(1.25rem, 4vw, 1.5rem)',
        '3xl-responsive': 'clamp(1.5rem, 5vw, 1.875rem)',
        '4xl-responsive': 'clamp(1.875rem, 6vw, 2.25rem)',
      },
      minHeight: {
        'touch-target': '44px', // iOS minimum touch target
        'android-touch': '48px', // Android minimum touch target
      },
      minWidth: {
        'touch-target': '44px',
        'android-touch': '48px',
      },
    },
  },
  plugins: [],
}