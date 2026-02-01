/**
 * =============================================================================
 * TAILWIND.CONFIG.JS - Tailwind CSS Configuration
 * =============================================================================
 * Tailwind is our utility-first CSS framework.
 * This config extends the default theme with our custom colors and settings.
 *
 * COLOR SCHEME (Duolingo-inspired with music vibes):
 * - Primary: Indigo/Purple gradient (main action color)
 * - Success: Green (completed tasks, streaks)
 * - Warning: Yellow/Orange (approaching deadlines)
 * - Danger: Red (broken streaks, low readiness)
 * - Accent: Teal (secondary actions)
 *
 * USAGE IN COMPONENTS:
 * - bg-primary, text-primary, border-primary
 * - bg-success, text-success
 * - hover:bg-primary-dark
 * =============================================================================
 */

/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind where to look for class usage
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      // Custom color palette
      colors: {
        // Primary brand colors (indigo/purple)
        primary: {
          light: '#818cf8',   // Lighter purple for hover states
          DEFAULT: '#6366f1', // Main purple
          dark: '#4f46e5',    // Darker purple for active states
        },
        // Secondary accent (teal)
        accent: {
          light: '#5eead4',
          DEFAULT: '#14b8a6',
          dark: '#0d9488',
        },
        // Success states (green)
        success: {
          light: '#86efac',
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
        // Warning states (yellow/orange)
        warning: {
          light: '#fde047',
          DEFAULT: '#eab308',
          dark: '#ca8a04',
        },
        // Danger states (red)
        danger: {
          light: '#fca5a5',
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
        // Streak fire color (special orange)
        streak: {
          DEFAULT: '#f97316',
          glow: '#fb923c',
        },
      },

      // Custom font family (optional - uses system fonts by default)
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      // Animation keyframes for celebrations
      keyframes: {
        // Bounce animation for achievements
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // Pulse animation for streaks
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        // Shake animation for warnings
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        // Scale up for button presses
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },

      // Named animations using the keyframes
      animation: {
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'pop': 'pop 0.2s ease-in-out',
      },

      // Box shadow for cards and buttons
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'button': '0 2px 4px rgba(99, 102, 241, 0.3)',
      },
    },
  },

  plugins: [],
}
