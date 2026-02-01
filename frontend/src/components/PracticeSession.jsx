/**
 * =============================================================================
 * PRACTICESESSION.JSX - Practice Timer & Session Logging
 * =============================================================================
 * The core practice tracking experience. This component handles:
 *
 * PHASES:
 * 1. Setup: Select which task(s) to practice
 * 2. Active: Timer running, can pause/stop
 * 3. Complete: Rate session quality, see points earned
 *
 * FEATURES:
 * - Large timer display (hh:mm:ss format)
 * - Task selection with checkboxes
 * - Pause/resume functionality
 * - Quality ratings (focus, progress, energy)
 * - Points calculation with streak multiplier
 * - Celebration screen when done!
 *
 * STATE MACHINE:
 * 'setup' → 'active' → 'rating' → 'complete' → back to dashboard
 * =============================================================================
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'


export default function PracticeSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, tasks, saveSession, setToast } = useApp()


  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Session phase: 'setup' | 'active' | 'paused' | 'rating' | 'complete'
  const [phase, setPhase] = useState('setup')

  // Timer state
  const [seconds, setSeconds] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const timerRef = useRef(null)

  // Task selection (can practice multiple tasks in one session)
  const [selectedTasks, setSelectedTasks] = useState(new Set())

  // Ratings (1-5 scale)
  const [focusRating, setFocusRating] = useState(0)
  const [progressRating, setProgressRating] = useState(0)
  const [energyRating, setEnergyRating] = useState(0)

  // Notes
  const [notes, setNotes] = useState('')

  // Session result
  const [sessionResult, setSessionResult] = useState(null)


  // ---------------------------------------------------------------------------
  // INITIALIZE FROM NAVIGATION STATE
  // ---------------------------------------------------------------------------
  // If user clicked "practice" on a specific task, pre-select it
  useEffect(() => {
    if (location.state?.selectedTask) {
      setSelectedTasks(new Set([location.state.selectedTask]))
    }
  }, [location.state])


  // ---------------------------------------------------------------------------
  // TIMER LOGIC
  // ---------------------------------------------------------------------------

  // Start the timer
  const startTimer = () => {
    if (selectedTasks.size === 0) {
      setToast('Please select at least one task', 'warning')
      return
    }

    setStartTime(new Date())
    setPhase('active')

    timerRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
  }

  // Pause the timer
  const pauseTimer = () => {
    clearInterval(timerRef.current)
    setPhase('paused')
  }

  // Resume the timer
  const resumeTimer = () => {
    timerRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
    setPhase('active')
  }

  // Stop the timer and go to rating phase
  const stopTimer = () => {
    clearInterval(timerRef.current)
    setPhase('rating')
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])


  // ---------------------------------------------------------------------------
  // FORMAT TIME
  // ---------------------------------------------------------------------------
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    const pad = (n) => n.toString().padStart(2, '0')

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    }
    return `${pad(minutes)}:${pad(secs)}`
  }


  // ---------------------------------------------------------------------------
  // SAVE SESSION (with ratings)
  // ---------------------------------------------------------------------------
  const handleSaveSession = async () => {
    const durationMinutes = Math.max(1, Math.ceil(seconds / 60))

    // Build task breakdown (evenly split time for now)
    const taskBreakdown = Array.from(selectedTasks).map(taskId => ({
      task_id: taskId,
      minutes_spent: Math.ceil(durationMinutes / selectedTasks.size)
    }))

    try {
      const result = await saveSession({
        start_time: startTime.toISOString(),
        duration_minutes: durationMinutes,
        focus_rating: focusRating || null,
        progress_rating: progressRating || null,
        energy_rating: energyRating || null,
        notes: notes || null,
        tasks: taskBreakdown
      })

      setSessionResult(result)
      setPhase('complete')
    } catch (error) {
      setToast('Failed to save session', 'error')
    }
  }


  // ---------------------------------------------------------------------------
  // QUICK SAVE (save progress without ratings and exit)
  // ---------------------------------------------------------------------------
  const handleQuickSave = async () => {
    const durationMinutes = Math.max(1, Math.ceil(seconds / 60))

    // Build task breakdown (evenly split time for now)
    const taskBreakdown = Array.from(selectedTasks).map(taskId => ({
      task_id: taskId,
      minutes_spent: Math.ceil(durationMinutes / selectedTasks.size)
    }))

    try {
      await saveSession({
        start_time: startTime.toISOString(),
        duration_minutes: durationMinutes,
        focus_rating: null,
        progress_rating: null,
        energy_rating: null,
        notes: notes || `Quick save - ${durationMinutes} min`,
        tasks: taskBreakdown
      })

      setToast(`Saved ${durationMinutes} min of practice!`, 'success')
      navigate('/')
    } catch (error) {
      setToast('Failed to save session', 'error')
    }
  }


  // ---------------------------------------------------------------------------
  // TOGGLE TASK SELECTION
  // ---------------------------------------------------------------------------
  const toggleTask = (taskId) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }


  // ---------------------------------------------------------------------------
  // RATING COMPONENT
  // ---------------------------------------------------------------------------
  const RatingInput = ({ label, value, onChange, emoji }) => (
    <div>
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            className={`w-12 h-12 rounded-full text-xl transition-all
              ${value === rating
                ? 'bg-primary text-white scale-110'
                : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {rating <= 2 ? '😫' : rating === 3 ? '😐' : rating === 4 ? '😊' : '🤩'}
          </button>
        ))}
      </div>
    </div>
  )


  // ---------------------------------------------------------------------------
  // RENDER: SETUP PHASE
  // ---------------------------------------------------------------------------
  if (phase === 'setup') {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Start Practice</h1>
          <p className="text-gray-500">What are you working on today?</p>
        </header>

        {/* Task Selection */}
        <div className="space-y-2">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`w-full p-4 rounded-xl text-left transition-all
                ${selectedTasks.has(task.id)
                  ? 'bg-primary/10 border-2 border-primary'
                  : 'bg-white border-2 border-gray-100 hover:border-gray-200'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${selectedTasks.has(task.id)
                    ? 'bg-primary border-primary text-white'
                    : 'border-gray-300'}`}>
                  {selectedTasks.has(task.id) && '✓'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-500">
                    {task.total_time_practiced}/{task.estimated_minutes} min practiced
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Start Button */}
        <button
          onClick={startTimer}
          disabled={selectedTasks.size === 0}
          className="btn-primary w-full py-4 text-lg"
        >
          Start Timer
        </button>
      </div>
    )
  }


  // ---------------------------------------------------------------------------
  // RENDER: ACTIVE/PAUSED PHASE (Timer Running)
  // ---------------------------------------------------------------------------
  if (phase === 'active' || phase === 'paused') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">

        {/* Timer Display */}
        <div className="mb-8">
          <p className="text-gray-500 mb-2">
            {phase === 'paused' ? '⏸ Paused' : '🎵 Practicing...'}
          </p>
          <div className="timer-display text-primary">
            {formatTime(seconds)}
          </div>
        </div>

        {/* Selected Tasks */}
        <div className="mb-8 text-gray-600">
          <p className="text-sm mb-2">Working on:</p>
          {Array.from(selectedTasks).map(taskId => {
            const task = tasks.find(t => t.id === taskId)
            return task ? (
              <p key={taskId} className="font-medium">{task.title}</p>
            ) : null
          })}
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            {phase === 'active' ? (
              <button
                onClick={pauseTimer}
                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold
                           hover:bg-gray-300 transition-colors"
              >
                ⏸ Pause
              </button>
            ) : (
              <button
                onClick={resumeTimer}
                className="px-8 py-4 bg-primary text-white rounded-xl font-semibold
                           hover:bg-primary-dark transition-colors"
              >
                ▶ Resume
              </button>
            )}
            <button
              onClick={stopTimer}
              className="px-8 py-4 bg-danger text-white rounded-xl font-semibold
                         hover:bg-danger-dark transition-colors"
            >
              ⏹ Finish
            </button>
          </div>

          {/* Quick Save Button (only when paused and has time) */}
          {phase === 'paused' && seconds >= 60 && (
            <button
              onClick={handleQuickSave}
              className="px-6 py-3 bg-success text-white rounded-xl font-semibold
                         hover:bg-success/90 transition-colors"
            >
              💾 Save Progress & Exit
            </button>
          )}

          {/* Hint when paused */}
          {phase === 'paused' && seconds < 60 && (
            <p className="text-sm text-gray-400">
              Practice at least 1 minute to save progress
            </p>
          )}
        </div>

        {/* Notes Input */}
        <div className="mt-8 w-full max-w-md">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Quick note (optional)..."
            className="input text-center"
          />
        </div>
      </div>
    )
  }


  // ---------------------------------------------------------------------------
  // RENDER: RATING PHASE
  // ---------------------------------------------------------------------------
  if (phase === 'rating') {
    const durationMinutes = Math.ceil(seconds / 60)

    return (
      <div className="space-y-8 text-center py-8">
        <div>
          <span className="text-6xl mb-4 block">🎉</span>
          <h1 className="text-2xl font-bold text-gray-900">Great work!</h1>
          <p className="text-gray-500 mt-2">
            You practiced for <span className="font-bold text-primary">{durationMinutes} minutes</span>
          </p>
        </div>

        {/* Rating Inputs */}
        <div className="space-y-6">
          <RatingInput
            label="How focused were you?"
            value={focusRating}
            onChange={setFocusRating}
          />
          <RatingInput
            label="Did you make progress?"
            value={progressRating}
            onChange={setProgressRating}
          />
          <RatingInput
            label="How's your energy?"
            value={energyRating}
            onChange={setEnergyRating}
          />
        </div>

        {/* Notes */}
        <div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this session?"
            className="input"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSession}
          className="btn-primary w-full py-4 text-lg"
        >
          Save & Finish
        </button>
      </div>
    )
  }


  // ---------------------------------------------------------------------------
  // RENDER: COMPLETE PHASE (Celebration!)
  // ---------------------------------------------------------------------------
  if (phase === 'complete' && sessionResult) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">

        {/* Celebration */}
        <div className="text-8xl mb-4 animate-bounce-slow">🎵</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Session Complete!
        </h1>

        {/* Points Earned */}
        <div className="bg-primary/10 rounded-2xl px-8 py-6 mb-6">
          <p className="text-sm text-primary mb-1">XP Earned</p>
          <p className="text-4xl font-bold text-primary">
            +{sessionResult.points_earned}
          </p>
        </div>

        {/* Streak Update */}
        {user.streak_count > 0 && (
          <div className="flex items-center gap-2 bg-orange-100 px-6 py-3 rounded-full mb-6">
            <span className="text-2xl">🔥</span>
            <span className="font-bold text-orange-600">
              {user.streak_count} day streak!
            </span>
          </div>
        )}

        {/* Encouragement */}
        <p className="text-gray-500 italic mb-8">
          {focusRating >= 4
            ? "Excellent focus! Keep it up!"
            : "Every practice session counts!"}
        </p>

        {/* Return to Dashboard */}
        <button
          onClick={() => navigate('/')}
          className="btn-primary px-8"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }


  // Fallback
  return null
}
