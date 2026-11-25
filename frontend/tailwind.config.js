/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#0C0C0C',
        surfaceDark: '#141414',
        surfaceBorder: '#262626',
        iceText: '#D7E2EA',
        silverMuted: '#646973',
        chromeBright: '#BBCCD7',
        accentPurple: '#7621B0',
        accentPink: '#B600A8',
      },
      fontFamily: {
        kanit: ['Kanit', 'sans-serif'],
      },
      borderRadius: {
        '40': '40px',
        '50': '50px',
        '60': '60px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
