/**
 * =============================================================================
 * VITE.CONFIG.JS - Vite Build Configuration
 * =============================================================================
 * Vite is our build tool - it handles:
 * - Development server with hot module replacement (instant updates!)
 * - Production builds with code splitting and minification
 * - Plugin system for React, CSS, etc.
 *
 * RUN COMMANDS:
 * - npm run dev    → Start dev server at http://localhost:5173
 * - npm run build  → Create production build in /dist
 * - npm run preview → Preview production build locally
 * =============================================================================
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // React plugin enables JSX transformation and Fast Refresh
  plugins: [react()],

  // Development server configuration
  server: {
    port: 5173,       // Default Vite port
    open: false,      // Don't auto-open browser on start
    cors: true,       // Enable CORS for API requests
  },

  // Build output configuration
  build: {
    outDir: 'dist',   // Output directory for production build
    sourcemap: true,  // Generate sourcemaps for debugging
  }
})
