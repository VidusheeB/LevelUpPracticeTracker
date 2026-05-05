import { createContext, useContext, useState, useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../utils/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToastState] = useState(null)
  const toastTimerRef = useRef(null)

  const loadUserData = useCallback(async (userId) => {
    setLoading(true)
    try {
      const [userData, statsData, tasksData] = await Promise.all([
        api.getUser(userId),
        api.getUserStats(userId),
        api.getTasks(userId),
      ])
      setUser(userData)
      setStats(statsData)
      setTasks(tasksData)
    } catch (error) {
      console.error('Failed to load user data:', error)
      setToastState({ message: 'Failed to load data', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email) => {
    setLoading(true)
    try {
      const userData = await api.login(email)
      await AsyncStorage.setItem('practicebeats_user_id', userData.id.toString())
      await loadUserData(userData.id)
      return userData
    } catch (error) {
      setToastState({ message: error.message, type: 'error' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [loadUserData])

  const register = useCallback(async (userData) => {
    setLoading(true)
    try {
      const newUser = await api.register(userData)
      await AsyncStorage.setItem('practicebeats_user_id', newUser.id.toString())
      await loadUserData(newUser.id)
      return newUser
    } catch (error) {
      setToastState({ message: error.message, type: 'error' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [loadUserData])

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('practicebeats_user_id')
    setUser(null)
    setStats(null)
    setTasks([])
  }, [])

  const refreshStats = useCallback(async () => {
    if (!user) return
    try {
      const [statsData, userData] = await Promise.all([
        api.getUserStats(user.id),
        api.getUser(user.id),
      ])
      setStats(statsData)
      setUser(userData)
    } catch (error) {
      console.error('Failed to refresh stats:', error)
    }
  }, [user])

  const refreshTasks = useCallback(async () => {
    if (!user) return
    try {
      const tasksData = await api.getTasks(user.id)
      setTasks(tasksData)
    } catch (error) {
      console.error('Failed to refresh tasks:', error)
    }
  }, [user])

  const createTask = useCallback(async (taskData) => {
    try {
      const newTask = await api.createTask({ ...taskData, user_id: user.id })
      setTasks(prev => [newTask, ...prev])
      setToast('Task created!', 'success')
      return newTask
    } catch (error) {
      setToast(error.message, 'error')
      throw error
    }
  }, [user])

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const updated = await api.updateTask(taskId, updates)
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t))
      return updated
    } catch (error) {
      setToast(error.message, 'error')
      throw error
    }
  }, [])

  const deleteTask = useCallback(async (taskId) => {
    try {
      await api.deleteTask(taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setToast('Task deleted', 'success')
    } catch (error) {
      setToast(error.message, 'error')
      throw error
    }
  }, [])

  const saveSession = useCallback(async (sessionData) => {
    try {
      const session = await api.createSession({ ...sessionData, user_id: user.id })
      await Promise.all([refreshStats(), refreshTasks()])
      setToast(`+${session.points_earned} XP earned!`, 'success')
      return session
    } catch (error) {
      setToast(error.message, 'error')
      throw error
    }
  }, [user, refreshStats, refreshTasks])

  const setToast = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastState({ message, type })
    toastTimerRef.current = setTimeout(() => {
      setToastState(null)
      toastTimerRef.current = null
    }, 3000)
  }, [])

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToastState(null)
  }, [])

  return (
    <AppContext.Provider value={{
      user, stats, tasks, loading, toast,
      login, register, logout, loadUserData,
      refreshStats, refreshTasks,
      createTask, updateTask, deleteTask,
      saveSession,
      setToast, clearToast,
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
