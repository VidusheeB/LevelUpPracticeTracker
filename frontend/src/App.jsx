/**
 * =============================================================================
 * APP.JSX - Main Application Component
 * =============================================================================
 * This is the root component that handles:
 * - Route definitions (what pages exist)
 * - Layout structure (navbar, content area)
 * - Login screen for unauthenticated users
 * - Toast notifications
 *
 * ROUTES:
 * - /         → Dashboard (home page)
 * - /practice → Practice session timer
 * - /calendar → Calendar view of rehearsals & practice
 * - /team     → Ensemble dashboard (leaderboard, challenges)
 * - /tasks    → All tasks list
 *
 * The app uses a mobile-first layout with bottom navigation,
 * similar to popular mobile apps like Duolingo.
 * =============================================================================
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './contexts/AppContext'

// Page Components
import Dashboard from './components/Dashboard'
import PracticeSession from './components/PracticeSession'
import Calendar from './components/Calendar'
import EnsembleDashboard from './components/EnsembleDashboard'
import TaskList from './components/TaskList'
import Messages from './components/Messages'
import TeacherDashboard from './components/TeacherDashboard'
import Achievements from './components/Achievements'
import Navbar from './components/Navbar'
import Login from './components/Login'
import Toast from './components/Toast'


// -----------------------------------------------------------------------------
// MAIN APP COMPONENT
// -----------------------------------------------------------------------------

export default function App() {
  const { user, loading, toast, clearToast } = useApp()

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  // Show loading spinner while checking for saved session
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {/* Metronome mascot loading animation */}
          <div className="text-6xl mb-4 animate-bounce-slow">🎵</div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // LOGIN SCREEN
  // ---------------------------------------------------------------------------
  // If no user is logged in, show the login screen
  if (!user) {
    return (
      <>
        <Login />
        {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      </>
    )
  }

  // ---------------------------------------------------------------------------
  // MAIN APP LAYOUT
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content Area */}
      <main className="max-w-lg mx-auto px-4 pt-4 safe-top">
        <Routes>
          {/* Dashboard - Home screen with stats and today's tasks */}
          <Route path="/" element={<Dashboard />} />

          {/* Practice Session - Timer and task selection */}
          <Route path="/practice" element={<PracticeSession />} />

          {/* Calendar - View rehearsals and practice history */}
          <Route path="/calendar" element={<Calendar />} />

          {/* Team - Ensemble dashboard with leaderboard */}
          <Route path="/team" element={<EnsembleDashboard />} />

          {/* Messages - Student messaging with teacher */}
          <Route path="/messages" element={<Messages />} />

          {/* Tasks - Full task list with filters */}
          <Route path="/tasks" element={<TaskList />} />

          {/* Students - Teacher dashboard for managing students */}
          <Route path="/students" element={<TeacherDashboard />} />

          {/* Achievements - Badges and XP guide */}
          <Route path="/achievements" element={<Achievements />} />

          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Bottom Navigation Bar */}
      <Navbar />

      {/* Toast Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
