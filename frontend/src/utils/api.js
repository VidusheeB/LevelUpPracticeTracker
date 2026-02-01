/**
 * =============================================================================
 * API.JS - Backend API Client
 * =============================================================================
 * This file provides all the functions for communicating with our FastAPI backend.
 *
 * ARCHITECTURE:
 * - Base URL configured for local development
 * - All functions return Promises (use async/await)
 * - Errors are thrown for non-OK responses (handle with try/catch)
 *
 * USAGE:
 * import { api } from '../utils/api'
 * const user = await api.login('alex@demo.com')
 * const tasks = await api.getTasks(user.id)
 *
 * ORGANIZATION:
 * - Auth functions (login, register)
 * - User functions (profile, stats)
 * - Session functions (practice tracking)
 * - Task functions (CRUD)
 * - Rehearsal functions
 * - Ensemble functions
 * - Challenge functions
 * - Badge functions
 * =============================================================================
 */

// Backend URL - change this for production deployment
const API_BASE = 'http://localhost:8000/api'


// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Make a fetch request with JSON handling.
 * Automatically adds Content-Type header and parses JSON response.
 *
 * @param {string} endpoint - API endpoint (e.g., '/users/1')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<any>} - Parsed JSON response
 * @throws {Error} - If response is not OK
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  // Default headers for JSON
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Parse response
  const data = await response.json()

  // Throw error for non-OK responses
  if (!response.ok) {
    throw new Error(data.detail || 'API request failed')
  }

  return data
}


// =============================================================================
// AUTH API
// =============================================================================

export const api = {
  /**
   * Login with email (MVP - no password).
   * Returns user object if email exists.
   */
  async login(email) {
    const response = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    return response.user
  },

  /**
   * Register a new user.
   * Returns the created user with default stats.
   */
  async register(userData) {
    return fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  /**
   * Get current user by ID.
   * In a real app, this would use a JWT token.
   */
  async getCurrentUser(userId) {
    return fetchAPI(`/auth/me?user_id=${userId}`)
  },


  // ===========================================================================
  // USER API
  // ===========================================================================

  /**
   * Get user profile by ID.
   */
  async getUser(userId) {
    return fetchAPI(`/users/${userId}`)
  },

  /**
   * Update user profile (name, instrument, weekly goal, etc.).
   */
  async updateUser(userId, updates) {
    return fetchAPI(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Get user stats for dashboard (streak, points, weekly progress).
   */
  async getUserStats(userId) {
    return fetchAPI(`/users/${userId}/stats`)
  },


  // ===========================================================================
  // PRACTICE SESSION API
  // ===========================================================================

  /**
   * Create a new practice session.
   * This is the main "end practice" call - includes duration, tasks, ratings.
   */
  async createSession(sessionData) {
    return fetchAPI('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    })
  },

  /**
   * Get practice sessions for a user.
   * Optional date filters for calendar view.
   */
  async getSessions(userId, startDate = null, endDate = null, limit = 50) {
    let url = `/sessions?user_id=${userId}&limit=${limit}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    return fetchAPI(url)
  },

  /**
   * Get a single session by ID.
   */
  async getSession(sessionId) {
    return fetchAPI(`/sessions/${sessionId}`)
  },

  /**
   * Update a session (typically to add quality ratings).
   */
  async updateSession(sessionId, updates) {
    return fetchAPI(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Delete a practice session.
   */
  async deleteSession(sessionId) {
    return fetchAPI(`/sessions/${sessionId}`, {
      method: 'DELETE',
    })
  },


  // ===========================================================================
  // PRACTICE TASK API
  // ===========================================================================

  /**
   * Create a new practice task.
   */
  async createTask(taskData) {
    return fetchAPI('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    })
  },

  /**
   * Get tasks for a user.
   * Optional filters: status ('not_started', 'in_progress', 'ready'), rehearsal_id
   */
  async getTasks(userId, status = null, rehearsalId = null) {
    let url = `/tasks?user_id=${userId}`
    if (status) url += `&status=${status}`
    if (rehearsalId) url += `&rehearsal_id=${rehearsalId}`
    return fetchAPI(url)
  },

  /**
   * Get a single task by ID.
   */
  async getTask(taskId) {
    return fetchAPI(`/tasks/${taskId}`)
  },

  /**
   * Update a task.
   */
  async updateTask(taskId, updates) {
    return fetchAPI(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Delete a task.
   */
  async deleteTask(taskId) {
    return fetchAPI(`/tasks/${taskId}`, {
      method: 'DELETE',
    })
  },

  /**
   * Get readiness score for a task.
   */
  async getTaskReadiness(taskId) {
    return fetchAPI(`/tasks/${taskId}/readiness`)
  },


  // ===========================================================================
  // REHEARSAL API
  // ===========================================================================

  /**
   * Create a new rehearsal.
   */
  async createRehearsal(rehearsalData) {
    return fetchAPI('/rehearsals', {
      method: 'POST',
      body: JSON.stringify(rehearsalData),
    })
  },

  /**
   * Get rehearsals for an ensemble.
   * Set upcoming=true to only get future rehearsals.
   */
  async getRehearsals(ensembleId, upcoming = false) {
    return fetchAPI(`/rehearsals?ensemble_id=${ensembleId}&upcoming=${upcoming}`)
  },

  /**
   * Get a single rehearsal by ID.
   */
  async getRehearsal(rehearsalId) {
    return fetchAPI(`/rehearsals/${rehearsalId}`)
  },

  /**
   * Update a rehearsal.
   */
  async updateRehearsal(rehearsalId, updates) {
    return fetchAPI(`/rehearsals/${rehearsalId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Delete a rehearsal.
   */
  async deleteRehearsal(rehearsalId) {
    return fetchAPI(`/rehearsals/${rehearsalId}`, {
      method: 'DELETE',
    })
  },


  // ===========================================================================
  // ENSEMBLE API
  // ===========================================================================

  /**
   * Create a new ensemble.
   */
  async createEnsemble(ensembleData) {
    return fetchAPI('/ensembles', {
      method: 'POST',
      body: JSON.stringify(ensembleData),
    })
  },

  /**
   * Get ensemble details.
   */
  async getEnsemble(ensembleId) {
    return fetchAPI(`/ensembles/${ensembleId}`)
  },

  /**
   * Get all members of an ensemble.
   */
  async getEnsembleMembers(ensembleId) {
    return fetchAPI(`/ensembles/${ensembleId}/members`)
  },

  /**
   * Join an ensemble.
   */
  async joinEnsemble(ensembleId, userId) {
    return fetchAPI(`/ensembles/${ensembleId}/join?user_id=${userId}`, {
      method: 'POST',
    })
  },

  /**
   * Join an ensemble using an 8-digit code.
   */
  async joinEnsembleByCode(ensembleCode, userId) {
    return fetchAPI(`/ensembles/join-by-code/${ensembleCode}?user_id=${userId}`, {
      method: 'POST',
    })
  },

  /**
   * Get weekly leaderboard for an ensemble.
   */
  async getLeaderboard(ensembleId) {
    return fetchAPI(`/ensembles/${ensembleId}/leaderboard`)
  },


  // ===========================================================================
  // CHALLENGE API
  // ===========================================================================

  /**
   * Create a new group challenge.
   */
  async createChallenge(challengeData) {
    return fetchAPI('/challenges', {
      method: 'POST',
      body: JSON.stringify(challengeData),
    })
  },

  /**
   * Get challenges for an ensemble.
   * Optional status filter: 'active', 'completed', 'expired'
   */
  async getChallenges(ensembleId, status = null) {
    let url = `/challenges?ensemble_id=${ensembleId}`
    if (status) url += `&status=${status}`
    return fetchAPI(url)
  },

  /**
   * Get a single challenge by ID.
   */
  async getChallenge(challengeId) {
    return fetchAPI(`/challenges/${challengeId}`)
  },

  /**
   * Mark challenge as completed by user.
   */
  async completeChallenge(challengeId, userId) {
    return fetchAPI(`/challenges/${challengeId}/complete?user_id=${userId}`, {
      method: 'POST',
    })
  },

  /**
   * Get challenge progress (who's completed, total count).
   */
  async getChallengeProgress(challengeId, userId) {
    return fetchAPI(`/challenges/${challengeId}/progress?user_id=${userId}`)
  },


  // ===========================================================================
  // BADGE API
  // ===========================================================================

  /**
   * Get all badges earned by a user.
   */
  async getUserBadges(userId) {
    return fetchAPI(`/badges/${userId}`)
  },


  // ===========================================================================
  // CALENDAR EVENT API
  // ===========================================================================

  /**
   * Create a new calendar event.
   * Event types: 'practice_reminder', 'lesson', 'performance', 'other'
   */
  async createCalendarEvent(eventData) {
    return fetchAPI('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    })
  },

  /**
   * Get calendar events for a user.
   * Optional filters: startDate, endDate, eventType
   */
  async getCalendarEvents(userId, startDate = null, endDate = null, eventType = null) {
    let url = `/events?user_id=${userId}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    if (eventType) url += `&event_type=${eventType}`
    return fetchAPI(url)
  },

  /**
   * Get a single calendar event by ID.
   */
  async getCalendarEvent(eventId) {
    return fetchAPI(`/events/${eventId}`)
  },

  /**
   * Update a calendar event.
   */
  async updateCalendarEvent(eventId, updates) {
    return fetchAPI(`/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  /**
   * Delete a calendar event.
   */
  async deleteCalendarEvent(eventId) {
    return fetchAPI(`/events/${eventId}`, {
      method: 'DELETE',
    })
  },


  // ===========================================================================
  // TEACHER-STUDENT API
  // ===========================================================================

  /**
   * Look up a teacher by their unique code.
   */
  async getTeacherByCode(teacherCode) {
    return fetchAPI(`/teachers/code/${teacherCode}`)
  },

  /**
   * Link a student to a teacher using the teacher's code.
   */
  async linkStudentToTeacher(studentId, teacherCode) {
    return fetchAPI(`/students/${studentId}/link-teacher?teacher_code=${teacherCode}`, {
      method: 'POST',
    })
  },

  /**
   * Get all students linked to a teacher.
   */
  async getTeacherStudents(teacherId) {
    return fetchAPI(`/teachers/${teacherId}/students`)
  },

  /**
   * Get a summary of a student's practice for the teacher dashboard.
   */
  async getStudentSummary(teacherId, studentId) {
    return fetchAPI(`/teachers/${teacherId}/students/${studentId}/summary`)
  },

  /**
   * Get the activity log for a student (for teacher to view).
   */
  async getStudentActivityLog(teacherId, studentId, limit = 20) {
    return fetchAPI(`/teachers/${teacherId}/students/${studentId}/activity?limit=${limit}`)
  },


  // ===========================================================================
  // TEACHER NOTE API
  // ===========================================================================

  /**
   * Send a note to another user (teacher<->student).
   */
  async sendNote(senderId, recipientId, content) {
    return fetchAPI(`/notes?sender_id=${senderId}`, {
      method: 'POST',
      body: JSON.stringify({ recipient_id: recipientId, content }),
    })
  },

  /**
   * Get conversation (notes) between two users.
   */
  async getNotesConversation(user1Id, user2Id, limit = 50) {
    return fetchAPI(`/notes/conversation/${user1Id}/${user2Id}?limit=${limit}`)
  },

  /**
   * Get unread notes for a user.
   */
  async getUnreadNotes(userId) {
    return fetchAPI(`/notes/unread/${userId}`)
  },

  /**
   * Mark a note as read.
   */
  async markNoteRead(noteId) {
    return fetchAPI(`/notes/${noteId}/read`, {
      method: 'POST',
    })
  },

  /**
   * Mark all notes from a sender as read.
   */
  async markAllNotesRead(userId, senderId) {
    return fetchAPI(`/notes/read-all?user_id=${userId}&sender_id=${senderId}`, {
      method: 'POST',
    })
  },
}


// Export the API object as default too for convenience
export default api
