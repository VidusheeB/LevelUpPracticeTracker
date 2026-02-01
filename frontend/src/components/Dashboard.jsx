/**
 * =============================================================================
 * DASHBOARD.JSX - Main Home Screen
 * =============================================================================
 * The first screen users see after login. Shows everything at a glance:
 *
 * SECTIONS:
 * 1. Header: User greeting, streak display, settings
 * 2. Weekly Progress: Circular progress indicator for weekly goal
 * 3. Today's Tasks: Cards for tasks to practice today
 * 4. Active Challenge: Current group challenge progress
 * 5. Quick Stats: Level, points, badges count
 *
 * DESIGN NOTES:
 * - Duolingo-inspired gamification elements
 * - Google Calendar-like task cards
 * - Mobile-first, card-based layout
 * - Encouraging messaging throughout
 * =============================================================================
 */

import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'
import TaskCard from './TaskCard'


export default function Dashboard() {
  const navigate = useNavigate()
  const {
    user,
    stats,
    tasks,
    rehearsals,
    challenges,
    logout,
    setToast,
    loadUserData
  } = useApp()

  // State for joining ensemble
  const [showJoinEnsemble, setShowJoinEnsemble] = useState(false)
  const [ensembleCode, setEnsembleCode] = useState('')
  const [joiningEnsemble, setJoiningEnsemble] = useState(false)

  // State for editing weekly goal
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)

  // Handle editing weekly goal
  const handleEditGoal = () => {
    setEditingGoal(stats?.weekly_goal_minutes || 0)
    setShowGoalEditor(true)
  }

  const handleSaveGoal = async () => {
    if (editingGoal === null || editingGoal === undefined || editingGoal < 0) {
      setToast('Please enter a valid goal', 'error')
      return
    }
    
    try {
      const goalValue = parseInt(editingGoal, 10)
      if (isNaN(goalValue) || goalValue < 0) {
        setToast('Please enter a valid number', 'error')
        return
      }
      
      await api.updateUser(user.id, { weekly_goal_minutes: goalValue })
      setToast('Weekly goal updated! 🎯', 'success')
      setShowGoalEditor(false)
      await loadUserData(user.id)
    } catch (error) {
      console.error('Error updating goal:', error)
      setToast(error.message || 'Failed to update goal', 'error')
    }
  }

  // Handle joining ensemble by code
  const handleJoinEnsemble = async () => {
    if (!ensembleCode.trim()) {
      setToast('Please enter an ensemble code', 'error')
      return
    }

    setJoiningEnsemble(true)
    try {
      await api.joinEnsembleByCode(ensembleCode.trim(), user.id)
      setToast('Joined ensemble! 🎉', 'success')
      setShowJoinEnsemble(false)
      setEnsembleCode('')
      // Reload user data to reflect ensemble membership
      await loadUserData(user.id)
    } catch (error) {
      setToast(error.message || 'Failed to join ensemble', 'error')
    } finally {
      setJoiningEnsemble(false)
    }
  }

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------

  // Get tasks that need attention (not ready status)
  const activeTasks = tasks.filter(t => t.status !== 'ready').slice(0, 4)

  // Get next rehearsal
  const nextRehearsal = rehearsals.length > 0 ? rehearsals[0] : null

  // Get active challenge
  const activeChallenge = challenges.length > 0 ? challenges[0] : null

  // Calculate days until next rehearsal
  const daysUntilRehearsal = nextRehearsal
    ? Math.ceil((new Date(nextRehearsal.date) - new Date()) / (1000 * 60 * 60 * 24))
    : null


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-4">

      {/* =================================================================
          HEADER SECTION
          User greeting, streak display, logout button
          ================================================================= */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-500">Ready to practice?</p>
        </div>

        {/* Streak Badge */}
        {stats && stats.streak_count > 0 && (
          <div className="flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full">
            <span className="text-2xl">🔥</span>
            <span className="font-bold text-orange-600">{stats.streak_count}</span>
          </div>
        )}

        {/* Settings/Logout */}
        <button
          onClick={logout}
          className="p-2 text-gray-400 hover:text-gray-600"
          title="Logout"
        >
          ⚙️
        </button>
      </header>


      {/* =================================================================
          JOIN ENSEMBLE SECTION (Personal users only)
          Allow users to join an ensemble with a code
          ================================================================= */}
      {user.role === 'personal' && !user.ensemble_id && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👥</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Join an Ensemble</h3>
              <p className="text-sm text-gray-600">Connect with other musicians</p>
            </div>
            <button
              onClick={() => setShowJoinEnsemble(true)}
              className="btn-primary text-sm px-4"
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* Modal for joining ensemble */}
      {showJoinEnsemble && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-4">Enter Ensemble Code</h3>
            <p className="text-gray-600 text-sm mb-4">
              Ask your ensemble coordinator for the 8-digit code
            </p>
            <input
              type="text"
              value={ensembleCode}
              onChange={(e) => setEnsembleCode(e.target.value.toUpperCase())}
              placeholder="12345678"
              maxLength={8}
              className="input text-center text-2xl tracking-widest mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowJoinEnsemble(false)
                  setEnsembleCode('')
                }}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinEnsemble}
                disabled={joiningEnsemble || !ensembleCode.trim()}
                className="flex-1 btn-primary"
              >
                {joiningEnsemble ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for editing weekly goal */}
      {showGoalEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-4">Set Your Weekly Goal</h3>
            <p className="text-gray-600 text-sm mb-6">
              How many minutes would you like to practice this week?
            </p>
            
            {/* Goal input */}
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editingGoal ?? 0}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10)
                    setEditingGoal(isNaN(num) ? 0 : Math.max(0, num))
                  }}
                  placeholder="0"
                  min="0"
                  className="input text-center text-3xl font-bold flex-1"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
                <span className="text-2xl font-bold text-gray-400">min</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {editingGoal && editingGoal > 0 ? `That's ${Math.round(editingGoal / 60)} hours per week` : 'No goal set'}
              </p>
            </div>

            {/* Quick presets */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={() => setEditingGoal(60)}
                className="text-sm py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                1 hour
              </button>
              <button
                onClick={() => setEditingGoal(180)}
                className="text-sm py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                3 hours
              </button>
              <button
                onClick={() => setEditingGoal(300)}
                className="text-sm py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                5 hours
              </button>
              <button
                onClick={() => setEditingGoal(600)}
                className="text-sm py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                10 hours
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowGoalEditor(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 btn-primary"
              >
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}


      {/* =================================================================
          WEEKLY PROGRESS CARD
          Circular progress ring showing weekly goal progress
          Click to edit the goal
          ================================================================= */}
      {stats && (
        <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={handleEditGoal}>
          <div className="flex items-center gap-6">

            {/* Progress Circle */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#6366f1"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(stats.weekly_progress_percent, 100) * 2.51} 251`}
                  className="transition-all duration-500"
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {Math.round(Math.min(stats.weekly_progress_percent, 100))}%
                </span>
              </div>
            </div>

            {/* Stats text */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Weekly Goal</h3>
              <p className="text-gray-500">
                {stats.weekly_minutes} / {stats.weekly_goal_minutes || 0} min
              </p>
              <p className="text-xs text-gray-400 mt-1">👆 Click to edit</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="text-primary">⭐</span>
                  Level {stats.level}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-warning">💎</span>
                  {stats.total_points} XP
                </span>
              </div>
            </div>
          </div>

          {/* Encouragement message based on progress */}
          <p className="mt-4 text-sm text-center text-gray-500 italic">
            {stats.weekly_goal_minutes === 0
              ? "🎯 Set a weekly goal to get started!"
              : stats.weekly_progress_percent >= 100
                ? "🎉 Goal crushed! You're on fire!"
                : stats.weekly_progress_percent >= 50
                  ? "💪 Halfway there! Keep it up!"
                  : "🎵 Every minute counts. Let's practice!"}
          </p>
        </div>
      )}


      {/* =================================================================
          UPCOMING REHEARSAL ALERT
          Shows if there's a rehearsal coming up soon
          ================================================================= */}
      {nextRehearsal && daysUntilRehearsal <= 3 && (
        <div className={`
          p-4 rounded-2xl flex items-center gap-3
          ${daysUntilRehearsal <= 1 ? 'bg-danger/10 border border-danger/30' : 'bg-warning/10 border border-warning/30'}
        `}>
          <span className="text-2xl">
            {daysUntilRehearsal <= 1 ? '🚨' : '📢'}
          </span>
          <div className="flex-1">
            <p className={`font-semibold ${daysUntilRehearsal <= 1 ? 'text-danger' : 'text-warning-dark'}`}>
              Rehearsal {daysUntilRehearsal === 0 ? 'TODAY' : daysUntilRehearsal === 1 ? 'tomorrow' : `in ${daysUntilRehearsal} days`}!
            </p>
            <p className="text-sm text-gray-600">
              {new Date(nextRehearsal.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      )}


      {/* =================================================================
          TODAY'S PRACTICE TASKS
          Cards showing tasks to work on
          ================================================================= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Today's Practice</h2>
          <button
            onClick={() => navigate('/tasks')}
            className="text-sm text-primary font-medium"
          >
            View All →
          </button>
        </div>

        {activeTasks.length > 0 ? (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                rehearsal={task.rehearsal_id ? nextRehearsal : null}
              />
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <span className="text-4xl mb-2 block">🎉</span>
            <p className="text-gray-500">All tasks ready! Great work!</p>
            <button
              onClick={() => navigate('/tasks')}
              className="btn-secondary mt-4"
            >
              Add New Task
            </button>
          </div>
        )}
      </section>


      {/* =================================================================
          ACTIVE GROUP CHALLENGE
          Shows current challenge progress (students only, not teachers)
          ================================================================= */}
      {activeChallenge && user?.role !== 'teacher' && (
        <section className="card bg-gradient-to-r from-primary/5 to-purple-100">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Team Challenge</h3>
              <p className="text-sm text-gray-600 mt-1">{activeChallenge.title}</p>

              {/* Progress indicator */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {/* Show completed member avatars */}
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm
                        ${i < 2 ? 'bg-success text-white' : 'bg-gray-200 text-gray-400'}`}
                    >
                      {i < 2 ? '✓' : '?'}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-gray-500">3/5 completed</span>
              </div>
            </div>
          </div>
        </section>
      )}


      {/* =================================================================
          QUICK START PRACTICE BUTTON
          Big CTA to start practicing
          ================================================================= */}
      <button
        onClick={() => navigate('/practice')}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
      >
        <span className="text-xl">▶</span>
        Start Practice Session
      </button>


      {/* =================================================================
          METRONOME MASCOT ENCOURAGEMENT
          Friendly message at the bottom
          ================================================================= */}
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
          <span className="text-xl">🎵</span>
          <span className="text-sm text-gray-600 italic">
            {stats?.streak_count >= 7
              ? "Incredible streak! You're unstoppable!"
              : stats?.streak_count >= 3
                ? "Nice streak going! Keep the rhythm!"
                : "Don't miss a beat - practice today!"}
          </span>
        </div>
      </div>
    </div>
  )
}
