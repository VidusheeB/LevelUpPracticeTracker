/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
        },
        success: '#22c55e',
        warning: {
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
        danger: {
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
      },
    },
  },
  plugins: [],
}
