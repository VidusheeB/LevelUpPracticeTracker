/**
 * =============================================================================
 * APPCONTEXT.JSX - Global Application State
 * =============================================================================
 * This context provides global state that needs to be accessed across components.
 *
 * STATE INCLUDES:
 * - user: Current logged-in user (null if not logged in)
 * - stats: User's dashboard stats (streak, points, weekly progress)
 * - tasks: User's practice tasks
 * - rehearsals: Upcoming rehearsals (if user has an ensemble)
 * - ensemble: User's ensemble info
 * - challenges: Active group challenges
 * - loading: Global loading state
 * - toast: Toast notification state
 *
 * ACTIONS:
 * - login(email): Log in user and load their data
 * - logout(): Clear user session
 * - refreshStats(): Reload user stats
 * - refreshTasks(): Reload tasks list
 * - setToast(message, type): Show toast notification
 *
 * USAGE IN COMPONENTS:
 * const { user, stats, login, setToast } = useApp()
 * =============================================================================
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'


// Create the context
const AppContext = createContext(null)


// -----------------------------------------------------------------------------
// PROVIDER COMPONENT
// -----------------------------------------------------------------------------

export function AppProvider({ children }) {
  // ===========================================================================
  // STATE
  // ===========================================================================

  // User & Auth State
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)

  // Data State
  const [tasks, setTasks] = useState([])
  const [rehearsals, setRehearsals] = useState([])
  const [ensemble, setEnsemble] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [leaderboard, setLeaderboard] = useState(null)

  // UI State
  const [loading, setLoading] = useState(false)
  const [toast, setToastState] = useState(null) // { message, type }


  // ===========================================================================
  // AUTO-LOAD FROM LOCAL STORAGE - DISABLED FOR TESTING
  // ===========================================================================
  // Removed to require login on each page load for demo purposes
  // Enable this to restore "remember me" functionality:
  // useEffect(() => {
  //   const savedUserId = localStorage.getItem('practicebeats_user_id')
  //   if (savedUserId) {
  //     loadUserData(parseInt(savedUserId)).catch(() => {
  //       localStorage.removeItem('practicebeats_user_id')
  //     })
  //   }
  // }, [loadUserData])

  // ===========================================================================
  // DATA LOADING FUNCTIONS
  // ===========================================================================

  /**
   * Load all user data after login.
   * Fetches user profile, stats, tasks, and ensemble data.
   */
  const loadUserData = useCallback(async (userId) => {
    setLoading(true)
    try {
      // Fetch user profile
      const userData = await api.getUser(userId)
      setUser(userData)

      // Fetch stats
      const statsData = await api.getUserStats(userId)
      setStats(statsData)

      // Fetch tasks
      const tasksData = await api.getTasks(userId)
      setTasks(tasksData)

      // Ensemble features removed - skip ensemble/rehearsal/challenge loading

    } catch (error) {
      console.error('Failed to load user data:', error)
      setToastState({ message: 'Failed to load data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  // ===========================================================================
  // AUTH ACTIONS
  // ===========================================================================

  /**
   * Login with email.
   * Loads all user data and saves to localStorage.
   */
  const login = useCallback(async (email) => {
    setLoading(true)
    try {
      const userData = await api.login(email)
      localStorage.setItem('practicebeats_user_id', userData.id.toString())
      await loadUserData(userData.id)
      setToastState({ message: `Welcome back, ${userData.name}!`, type: 'success' })
      return userData
    } catch (error) {
      setToastState({ message: error.message, type: 'error' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [loadUserData])


  /**
   * Register a new user.
   */
  const register = useCallback(async (userData) => {
    setLoading(true)
    try {
      const newUser = await api.register(userData)
      localStorage.setItem('practicebeats_user_id', newUser.id.toString())
      await loadUserData(newUser.id)
      setToastState({ message: `Welcome to PracticeBeats, ${newUser.name}!`, type: 'success' })
      return newUser
    } catch (error) {
      setToastState({ message: error.message, type: 'error' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [loadUserData])


  /**
   * Logout and clear session.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('practicebeats_user_id')
    setUser(null)
    setStats(null)
    setTasks([])
    setRehearsals([])
    setEnsemble(null)
    setChallenges([])
    setLeaderboard(null)
    setToastState({ message: 'Logged out successfully', type: 'success' })
  }, [])


  // ===========================================================================
  // REFRESH ACTIONS
  // ===========================================================================

  /**
   * Refresh user stats (after practice session, etc.)
   */
  const refreshStats = useCallback(async () => {
    if (!user) return
    try {
      const statsData = await api.getUserStats(user.id)
      setStats(statsData)
      // Also refresh user for streak, points updates
      const userData = await api.getUser(user.id)
      setUser(userData)
    } catch (error) {
      console.error('Failed to refresh stats:', error)
    }
  }, [user])


  /**
   * Refresh tasks list.
   */
  const refreshTasks = useCallback(async () => {
    if (!user) return
    try {
      const tasksData = await api.getTasks(user.id)
      setTasks(tasksData)
    } catch (error) {
      console.error('Failed to refresh tasks:', error)
    }
  }, [user])


  /**
   * Refresh challenges.
   */
  const refreshChallenges = useCallback(async () => {
    if (!user?.ensemble_id) return
    try {
      const challengesData = await api.getChallenges(user.ensemble_id, 'active')
      setChallenges(challengesData)
    } catch (error) {
      console.error('Failed to refresh challenges:', error)
    }
  }, [user])


  /**
   * Refresh leaderboard.
   */
  const refreshLeaderboard = useCallback(async () => {
    if (!user?.ensemble_id) return
    try {
      const leaderboardData = await api.getLeaderboard(user.ensemble_id)
      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error('Failed to refresh leaderboard:', error)
    }
  }, [user])


  /**
   * Refresh rehearsals list.
   */
  const refreshRehearsals = useCallback(async () => {
    if (!user?.ensemble_id) return
    try {
      const rehearsalsData = await api.getRehearsals(user.ensemble_id, true)
      setRehearsals(rehearsalsData)
    } catch (error) {
      console.error('Failed to refresh rehearsals:', error)
    }
  }, [user])


  // ===========================================================================
  // TOAST NOTIFICATION
  // ===========================================================================

  /**
   * Show a toast notification.
   * Auto-hides after 3 seconds.
   */
  const setToast = useCallback((message, type = 'info') => {
    setToastState({ message, type })
    setTimeout(() => setToastState(null), 3000)
  }, [])


  /**
   * Clear toast manually.
   */
  const clearToast = useCallback(() => {
    setToastState(null)
  }, [])


  // ===========================================================================
  // TASK ACTIONS
  // ===========================================================================

  /**
   * Create a new task.
   */
  const createTask = useCallback(async (taskData) => {
    try {
      const newTask = await api.createTask({
        ...taskData,
        user_id: user.id,
        ensemble_id: user.ensemble_id,
      })
      setTasks(prev => [newTask, ...prev])
      setToast('Task created!', 'success')
      return newTask
    } catch (error) {
      setToast(error.message, 'error')
      throw error
    }
  }, [user, setToast])


  /**
   * Update a task.
   */
  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const updatedTask = await api.updateTask(taskId, updates)
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t))
      return updatedTask
    } catch (error) {
      setToast(error.message, 'error')
      throw error
    }
  }, [setToast])


  /**
   * Delete a task.
   */
  const deleteTask = useCallback(async (taskId) => {
    try {
      await api.deleteTask(taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setToast('Task deleted', 'success')
    } catch (error) {
      setToast(error.message, 'error')
      throw error
    }
  }, [setToast])


  // ===========================================================================
  // SESSION ACTIONS
  // ===========================================================================

  /**
   * Save a practice session and refresh stats.
   */
  const saveSession = useCallback(async (sessionData) => {
    try {
      const session = await api.createSession({
        ...sessionData,
        user_id: user.id,
      })

      // Refresh stats and tasks after session
      await refreshStats()
      await refreshTasks()

      setToast(`+${session.points_earned} XP earned!`, 'success')
      return session
    } catch (error) {
      setToast(error.message, 'error')
      throw error
    }
  }, [user, refreshStats, refreshTasks, setToast])


  // ===========================================================================
  // CONTEXT VALUE
  // ===========================================================================

  const value = {
    // State
    user,
    stats,
    tasks,
    rehearsals,
    ensemble,
    challenges,
    leaderboard,
    loading,
    toast,

    // Auth Actions
    login,
    register,
    logout,
    loadUserData,

    // Refresh Actions
    refreshStats,
    refreshTasks,
    refreshChallenges,
    refreshLeaderboard,
    refreshRehearsals,

    // Task Actions
    createTask,
    updateTask,
    deleteTask,

    // Session Actions
    saveSession,

    // Toast Actions
    setToast,
    clearToast,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}


// -----------------------------------------------------------------------------
// CUSTOM HOOK
// -----------------------------------------------------------------------------

/**
 * Hook to access app context.
 * Must be used within AppProvider.
 */
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}


export default AppContext
