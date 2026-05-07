import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { auth, db } from '../utils/supabase'
import { registerPushToken } from '../utils/notifications'
import { fetchAndParseICS } from '../utils/ics'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)       // profile row
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToastState] = useState(null)
  const toastTimerRef = useRef(null)

  // Load full profile + stats + tasks for a given user id
  const loadUserData = useCallback(async (userId) => {
    setLoading(true)
    try {
      const [statsData, tasksData] = await Promise.all([
        db.getUserStats(userId),
        db.getTasks(userId),
      ])
      setUser(statsData)   // stats includes full profile
      setStats(statsData)
      setTasks(tasksData)
      // Register this device's push token so cross-device notifications work.
      // Fire-and-forget — fails silently in Expo Go before EAS is configured.
      registerPushToken(userId, db.savePushToken).catch(() => {})
    } catch (error) {
      console.error('Failed to load user data:', error)
      setToastFn('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------------------

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const authUser = await auth.signIn(email, password)
      await loadUserData(authUser.id)
    } catch (error) {
      setToastFn(error.message, 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }, [loadUserData])

  const register = useCallback(async (userData) => {
    setLoading(true)
    try {
      const authUser = await auth.signUp(userData.email, userData.password, userData)
      if (authUser) await loadUserData(authUser.id)
    } catch (error) {
      setToastFn(error.message, 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }, [loadUserData])

  const logout = useCallback(async () => {
    await auth.signOut()
    setUser(null)
    setStats(null)
    setTasks([])
  }, [])

  // ---------------------------------------------------------------------------
  // REFRESH
  // ---------------------------------------------------------------------------

  const refreshStats = useCallback(async () => {
    if (!user?.id) return
    try {
      const statsData = await db.getUserStats(user.id)
      setUser(statsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to refresh stats:', error)
    }
  }, [user])

  const refreshTasks = useCallback(async () => {
    if (!user?.id) return
    try {
      const tasksData = await db.getTasks(user.id)
      setTasks(tasksData)
    } catch (error) {
      console.error('Failed to refresh tasks:', error)
    }
  }, [user])

  // ---------------------------------------------------------------------------
  // TASKS
  // ---------------------------------------------------------------------------

  const createTask = useCallback(async (taskData) => {
    try {
      const newTask = await db.createTask({ ...taskData, user_id: user.id })
      setTasks(prev => [newTask, ...prev])
      setToastFn('Task created!', 'success')
      return newTask
    } catch (error) {
      setToastFn(error.message, 'error')
      throw error
    }
  }, [user])

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const updated = await db.updateTask(taskId, updates)
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t))
      return updated
    } catch (error) {
      setToastFn(error.message, 'error')
      throw error
    }
  }, [])

  const deleteTask = useCallback(async (taskId) => {
    try {
      await db.deleteTask(taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setToastFn('Task deleted', 'success')
    } catch (error) {
      setToastFn(error.message, 'error')
      throw error
    }
  }, [])

  // ---------------------------------------------------------------------------
  // ENSEMBLES & CHALLENGES
  // ---------------------------------------------------------------------------

  const createEnsemble = useCallback(async (name, description) => {
    const ensemble = await db.createEnsemble(user.id, name, description)
    setToastFn(`${name} created!`, 'success')
    return ensemble
  }, [user])

  const archiveEnsemble = useCallback(async (ensembleId, archived) => {
    await db.updateEnsemble(ensembleId, { archived })
    setToastFn(archived ? 'Class archived' : 'Class restored', 'success')
  }, [])

  const deleteEnsemble = useCallback(async (ensembleId) => {
    await db.deleteEnsemble(ensembleId)
    setToastFn('Class deleted', 'success')
  }, [])

  const createChallenge = useCallback(async (challengeData, ensembleIds) => {
    const challenge = await db.createChallenge({ ...challengeData, teacher_id: user.id }, ensembleIds)
    setToastFn('Challenge started!', 'success')
    return challenge
  }, [user])

  const createAssignment = useCallback(async (assignmentData) => {
    const assignment = await db.createAssignment({ ...assignmentData, teacher_id: user.id })
    setToastFn('Assignment created!', 'success')
    return assignment
  }, [user])

  const updateProfile = useCallback(async (updates) => {
    try {
      const updated = await db.updateProfile(user.id, updates)
      setUser(prev => ({ ...prev, ...updated }))
      return updated
    } catch (error) {
      setToastFn(error.message, 'error')
      throw error
    }
  }, [user])

  const syncCalendar = useCallback(async (icsUrl) => {
    const events = await fetchAndParseICS(icsUrl)
    const count = await db.syncICSEvents(user.id, icsUrl, events)
    // Refresh user so ics_last_synced shows in Profile
    setUser(prev => ({ ...prev, ics_url: icsUrl, ics_last_synced: new Date().toISOString() }))
    return count
  }, [user])

  const joinTeacher = useCallback(async (code) => {
    const teacher = await db.getTeacherByCode(code)
    if (!teacher) throw new Error('Teacher code not found. Double-check the code and try again.')
    await db.updateProfile(user.id, { teacher_id: teacher.id })
    await refreshStats()
    setToastFn(`Joined ${teacher.name}'s class!`, 'success')
  }, [user, refreshStats])

  // ---------------------------------------------------------------------------
  // SESSIONS
  // ---------------------------------------------------------------------------

  const saveSession = useCallback(async (sessionData) => {
    try {
      // Pass current profile so business logic (XP, streak) can run client-side
      const session = await db.createSession(sessionData, user)
      await Promise.all([refreshStats(), refreshTasks()])
      setToastFn(`+${session.points_earned} XP earned!`, 'success')
      return session
    } catch (error) {
      setToastFn(error.message, 'error')
      throw error
    }
  }, [user, refreshStats, refreshTasks])

  // ---------------------------------------------------------------------------
  // TOAST
  // ---------------------------------------------------------------------------

  const setToastFn = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastState({ message, type })
    toastTimerRef.current = setTimeout(() => {
      setToastState(null)
      toastTimerRef.current = null
    }, 3000)
  }, [])

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) { clearTimeout(toastTimerRef.current); toastTimerRef.current = null }
    setToastState(null)
  }, [])

  return (
    <AppContext.Provider value={{
      user, stats, tasks, loading, toast,
      login, register, logout, loadUserData,
      refreshStats, refreshTasks,
      updateProfile, syncCalendar,
      joinTeacher,
      createEnsemble, archiveEnsemble, deleteEnsemble,
      createChallenge, createAssignment,
      createTask, updateTask, deleteTask,
      saveSession,
      setToast: setToastFn, clearToast,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

export default AppContext
