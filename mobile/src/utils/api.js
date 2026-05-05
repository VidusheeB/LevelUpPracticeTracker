// Replace with your deployed backend URL before submitting to App Store
const API_BASE = 'http://localhost:8000/api'

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  let response
  try {
    response = await fetch(url, { ...options, headers })
  } catch {
    throw new Error('Network error — please check your connection')
  }

  let data
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await response.json()
  } else {
    const text = await response.text()
    if (!response.ok) {
      throw new Error(text || `Request failed with status ${response.status}`)
    }
    return text
  }

  if (!response.ok) {
    throw new Error(data.detail || `Request failed with status ${response.status}`)
  }

  return data
}

export const api = {
  async login(email) {
    const response = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    if (!response?.user) throw new Error('User not found')
    return response.user
  },

  async register(userData) {
    return fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  async getUser(userId) {
    return fetchAPI(`/users/${userId}`)
  },

  async updateUser(userId, updates) {
    return fetchAPI(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  async getUserStats(userId) {
    return fetchAPI(`/users/${userId}/stats`)
  },

  async createSession(sessionData) {
    return fetchAPI('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    })
  },

  async getSessions(userId, startDate = null, endDate = null, limit = 50) {
    let url = `/sessions?user_id=${userId}&limit=${limit}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    return fetchAPI(url)
  },

  async createTask(taskData) {
    return fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    })
  },

  async getTasks(userId, status = null) {
    let url = `/tasks?user_id=${userId}`
    if (status) url += `&status=${status}`
    return fetchAPI(url)
  },

  async updateTask(taskId, updates) {
    return fetchAPI(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  async deleteTask(taskId) {
    return fetchAPI(`/tasks/${taskId}`, { method: 'DELETE' })
  },

  async getUserBadges(userId) {
    return fetchAPI(`/badges/${userId}`)
  },

  async createCalendarEvent(eventData) {
    return fetchAPI('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    })
  },

  async getCalendarEvents(userId, startDate = null, endDate = null) {
    let url = `/events?user_id=${userId}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    return fetchAPI(url)
  },

  async deleteCalendarEvent(eventId) {
    return fetchAPI(`/events/${eventId}`, { method: 'DELETE' })
  },

  async getTeacherStudents(teacherId) {
    return fetchAPI(`/teachers/${teacherId}/students`)
  },

  async getStudentSummary(teacherId, studentId) {
    return fetchAPI(`/teachers/${teacherId}/students/${studentId}/summary`)
  },

  async getStudentActivityLog(teacherId, studentId, limit = 20) {
    return fetchAPI(`/teachers/${teacherId}/students/${studentId}/activity?limit=${limit}`)
  },

  async sendNote(senderId, recipientId, content) {
    return fetchAPI(`/notes?sender_id=${senderId}`, {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId, content }),
    })
  },

  async getNotesConversation(user1Id, user2Id, limit = 50) {
    return fetchAPI(`/notes/conversation/${user1Id}/${user2Id}?limit=${limit}`)
  },

  async getNotes(userId, teacherId) {
    if (!teacherId) return []
    return this.getNotesConversation(userId, teacherId)
  },

  async markAllNotesRead(userId, senderId) {
    return fetchAPI(`/notes/read-all?user_id=${userId}&sender_id=${senderId}`, {
      method: 'POST',
    })
  },
}

export default api
