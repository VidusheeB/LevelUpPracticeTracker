/**
 * =============================================================================
 * TOAST.JSX - Toast Notification Component
 * =============================================================================
 * Displays temporary notification messages at the bottom of the screen.
 *
 * TYPES:
 * - success: Green background (task completed, points earned)
 * - error: Red background (API errors, validation failures)
 * - info: Blue background (general info)
 * - warning: Yellow background (low readiness alerts)
 *
 * BEHAVIOR:
 * - Slides up from bottom
 * - Auto-dismisses after 3 seconds (handled by AppContext)
 * - Can be dismissed by clicking X
 * =============================================================================
 */


export default function Toast({ message, type = 'info', onClose }) {
  // ---------------------------------------------------------------------------
  // STYLE VARIANTS
  // ---------------------------------------------------------------------------
  const variants = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-warning text-gray-900',
    info: 'bg-primary text-white',
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div
        className={`
          ${variants[type]}
          px-4 py-3 rounded-xl shadow-lg
          flex items-center gap-3
          animate-pop pointer-events-auto
          max-w-md w-full
        `}
      >
        {/* Icon */}
        <span className="text-lg font-bold">{icons[type]}</span>

        {/* Message */}
        <span className="flex-1 font-medium">{message}</span>

        {/* Close button */}
        <button
          onClick={onClose}
          className="opacity-70 hover:opacity-100 transition-opacity text-lg"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
