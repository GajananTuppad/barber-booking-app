/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
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
        card: '12px',
      },
    },
  },
  plugins: [],
};
