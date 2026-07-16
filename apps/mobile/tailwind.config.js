/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        card: '#141414',
        input: '#1C1C1C',
        gold: '#C9A84C',
        border: '#2A2A2A',
        muted: '#A0A0A0',
        success: '#3FBF6B',
        warning: '#E0A83E',
        danger: '#E0524B',
      },
      borderRadius: {
        DEFAULT: '12px',
        card: '12px',
      },
    },
  },
  plugins: [],
};
