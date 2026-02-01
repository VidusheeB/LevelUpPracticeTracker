/**
 * =============================================================================
 * TASKCARD.JSX - Practice Task Card Component
 * =============================================================================
 * Displays a single practice task with:
 * - Title and category icon
 * - Readiness progress bar
 * - Time practiced vs estimated
 * - Rehearsal deadline (if linked)
 * - Quick action to start practice
 *
 * DESIGN:
 * - Google Calendar event-style cards
 * - Color-coded readiness (red → yellow → green)
 * - Shows urgency for upcoming rehearsals
 * =============================================================================
 */

import { useNavigate } from 'react-router-dom'


export default function TaskCard({ task, rehearsal, showActions = true }) {
  const navigate = useNavigate()


  // ---------------------------------------------------------------------------
  // CATEGORY ICONS
  // ---------------------------------------------------------------------------
  const categoryIcons = {
    repertoire: '🎵',
    technique: '🎯',
    sight_reading: '👀',
    section_work: '👥',
  }


  // ---------------------------------------------------------------------------
  // READINESS COLOR
  // ---------------------------------------------------------------------------
  const getReadinessColor = (score) => {
    if (score >= 80) return 'bg-success'
    if (score >= 50) return 'bg-warning'
    return 'bg-danger'
  }

  const getReadinessText = (score) => {
    if (score >= 80) return 'Ready!'
    if (score >= 50) return 'Getting there'
    return 'Needs work'
  }


  // ---------------------------------------------------------------------------
  // DAYS UNTIL REHEARSAL
  // ---------------------------------------------------------------------------
  const daysUntil = rehearsal
    ? Math.ceil((new Date(rehearsal.date) - new Date()) / (1000 * 60 * 60 * 24))
    : null


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="card hover:shadow-card-hover transition-shadow cursor-pointer"
         onClick={() => navigate('/practice', { state: { selectedTask: task.id } })}>

      <div className="flex items-start gap-3">

        {/* Category Icon */}
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-lg">{categoryIcons[task.category] || '🎵'}</span>
        </div>

        {/* Task Info */}
        <div className="flex-1 min-w-0">

          {/* Title */}
          <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>

          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">
                {Math.round(task.readiness_score)}% ready
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                ${task.readiness_score >= 80 ? 'bg-success/10 text-success' :
                  task.readiness_score >= 50 ? 'bg-warning/10 text-warning-dark' :
                  'bg-danger/10 text-danger'}`}>
                {getReadinessText(task.readiness_score)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getReadinessColor(task.readiness_score)} transition-all duration-500`}
                style={{ width: `${Math.min(task.readiness_score, 100)}%` }}
              />
            </div>
          </div>

          {/* Meta info */}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">

            {/* Time practiced */}
            <span className="flex items-center gap-1">
              ⏱ {task.total_time_practiced}/{task.estimated_minutes} min
            </span>

            {/* Difficulty */}
            <span className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < task.difficulty ? 'text-warning' : 'text-gray-300'}>
                  ★
                </span>
              ))}
            </span>
          </div>

          {/* Rehearsal deadline */}
          {rehearsal && daysUntil !== null && (
            <div className={`mt-2 text-xs flex items-center gap-1
              ${daysUntil <= 1 ? 'text-danger font-medium' :
                daysUntil <= 3 ? 'text-warning-dark' : 'text-gray-500'}`}>
              <span>📅</span>
              <span>
                {daysUntil === 0 ? 'Rehearsal TODAY' :
                 daysUntil === 1 ? 'Rehearsal tomorrow' :
                 `Rehearsal in ${daysUntil} days`}
              </span>
            </div>
          )}
        </div>

        {/* Quick Practice Button */}
        {showActions && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate('/practice', { state: { selectedTask: task.id } })
            }}
            className="shrink-0 w-10 h-10 rounded-full bg-primary text-white
                       flex items-center justify-center hover:bg-primary-dark
                       transition-colors shadow-button"
          >
            ▶
          </button>
        )}
      </div>
    </div>
  )
}
