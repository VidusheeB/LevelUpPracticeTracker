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
  const { user, stats, tasks, logout, setToast, loadUserData } = useApp()

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

  // ---------------------------------------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------------------------------------

  // Get tasks that need attention (not ready status)
  const activeTasks = tasks.filter(t => t.status !== 'ready').slice(0, 4)


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
                rehearsal={null}
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
