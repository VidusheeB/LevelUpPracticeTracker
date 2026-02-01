/**
 * =============================================================================
 * POSTCSS.CONFIG.JS - PostCSS Configuration
 * =============================================================================
 * PostCSS is a CSS transformer that Tailwind uses to:
 * - Process Tailwind directives (@tailwind, @apply)
 * - Add vendor prefixes for browser compatibility (autoprefixer)
 *
 * This is a standard config - you typically don't need to modify it.
 * =============================================================================
 */

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
