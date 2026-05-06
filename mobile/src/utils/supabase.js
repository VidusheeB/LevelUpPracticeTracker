import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yqcwvpwzykawwndbyakw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxY3d2cHd6eWthd3duZGJ5YWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDg2ODcsImV4cCI6MjA5MzU4NDY4N30.Bw7OG0xfaLCu450CZUpGqXsWNMSTORGaZCD3DsRKqNI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // required for React Native
  },
})

// ---------------------------------------------------------------------------
// BUSINESS LOGIC (previously in Python backend)
// ---------------------------------------------------------------------------

function calculatePoints(durationMinutes, focusRating, streakCount) {
  let points = durationMinutes
  if (streakCount >= 30) points *= 2
  else if (streakCount >= 7) points *= 1.5
  else if (streakCount >= 3) points *= 1.2
  if (focusRating >= 4) points *= 1.2
  return Math.round(points)
}

function calculateNewStreak(lastPracticeDate, currentStreak) {
  if (!lastPracticeDate) return 1
  const last = new Date(lastPracticeDate)
  const today = new Date()
  last.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return currentStreak  // already practiced today
  if (diffDays === 1) return currentStreak + 1  // consecutive day
  return 1  // missed day(s) — reset
}

function calculateReadiness(task, minutesAdded, focusRating) {
  const total = (task.total_time_practiced || 0) + minutesAdded
  const timeScore = Math.min(total / (task.estimated_minutes || 30), 1) * 100
  const qualityScore = focusRating ? (focusRating / 5) * 100 : 0
  const readiness = Math.min(Math.round(timeScore * 0.7 + qualityScore * 0.3), 100)
  const status = total === 0 ? 'not_started' : readiness >= 80 ? 'ready' : 'in_progress'
  return { readiness_score: readiness, status }
}

function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

async function checkAndAwardBadges(userId, updatedProfile, session) {
  const { data: existing } = await supabase
    .from('badges').select('badge_type').eq('user_id', userId)
  const earned = new Set((existing || []).map(b => b.badge_type))
  const toAward = []

  if (!earned.has('first_session')) toAward.push('first_session')
  if (!earned.has('streak_3') && updatedProfile.streak_count >= 3) toAward.push('streak_3')
  if (!earned.has('streak_7') && updatedProfile.streak_count >= 7) toAward.push('streak_7')
  if (!earned.has('streak_30') && updatedProfile.streak_count >= 30) toAward.push('streak_30')
  if (!earned.has('marathon') && session.duration_minutes >= 60) toAward.push('marathon')
  if (!earned.has('perfect_focus') && session.focus_rating === 5) toAward.push('perfect_focus')
  const hour = new Date(session.start_time).getHours()
  if (!earned.has('early_bird') && hour < 8) toAward.push('early_bird')
  if (!earned.has('night_owl') && hour >= 22) toAward.push('night_owl')

  if (toAward.length > 0) {
    await supabase.from('badges').insert(
      toAward.map(badge_type => ({ user_id: userId, badge_type }))
    )
  }
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export const auth = {
  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: userData.name } },
    })
    if (error) throw new Error(error.message)

    if (data.user) {
      const teacherCode = userData.role === 'teacher'
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : null

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name: userData.name,
        instrument: userData.instrument || null,
        section: userData.section || 'brass',
        role: userData.role || 'personal',
        teacher_code: teacherCode,
      })
      if (profileError) throw new Error(profileError.message)

      // Link student to teacher if code provided
      if (userData.role === 'student' && userData.teacher_code_to_join) {
        const { data: teacher } = await supabase
          .from('profiles')
          .select('id')
          .eq('teacher_code', userData.teacher_code_to_join)
          .single()
        if (teacher) {
          await supabase.from('profiles')
            .update({ teacher_id: teacher.id })
            .eq('id', data.user.id)
        }
      }
    }

    return data.user
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data.user
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },
}

// ---------------------------------------------------------------------------
// DATABASE OPERATIONS
// ---------------------------------------------------------------------------

export const db = {
  // Profile
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    if (error) throw new Error(error.message)
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', userId).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  async getUserStats(userId) {
    const weekStart = getWeekStart().toISOString()
    const [{ data: profile, error }, { data: sessions }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('practice_sessions')
        .select('duration_minutes')
        .eq('user_id', userId)
        .gte('start_time', weekStart),
    ])
    if (error) throw new Error(error.message)
    const weeklyMinutes = (sessions || []).reduce((s, r) => s + r.duration_minutes, 0)
    const weeklyGoal = profile.weekly_goal_minutes || 120
    return {
      ...profile,
      weekly_minutes: weeklyMinutes,
      weekly_goal_minutes: weeklyGoal,
      weekly_progress_percent: weeklyGoal > 0 ? (weeklyMinutes / weeklyGoal) * 100 : 0,
    }
  },

  // Tasks
  async getTasks(userId) {
    const { data, error } = await supabase
      .from('practice_tasks').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  },

  async createTask(taskData) {
    const { data, error } = await supabase
      .from('practice_tasks').insert(taskData).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  async updateTask(taskId, updates) {
    const { data, error } = await supabase
      .from('practice_tasks').update(updates).eq('id', taskId).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  async deleteTask(taskId) {
    const { error } = await supabase.from('practice_tasks').delete().eq('id', taskId)
    if (error) throw new Error(error.message)
  },

  // Sessions
  async createSession(sessionData, profile) {
    const { tasks, ...fields } = sessionData
    const pointsEarned = calculatePoints(
      fields.duration_minutes, fields.focus_rating, profile.streak_count
    )

    const { data: session, error } = await supabase
      .from('practice_sessions')
      .insert({ ...fields, points_earned: pointsEarned })
      .select().single()
    if (error) throw new Error(error.message)

    // Save session-task breakdown + update each task
    if (tasks?.length) {
      await supabase.from('session_tasks').insert(
        tasks.map(t => ({ session_id: session.id, task_id: t.task_id, minutes_spent: t.minutes_spent }))
      )
      for (const t of tasks) {
        const { data: task } = await supabase
          .from('practice_tasks').select('*').eq('id', t.task_id).single()
        if (task) {
          const updates = calculateReadiness(task, t.minutes_spent, fields.focus_rating)
          await supabase.from('practice_tasks').update({
            ...updates,
            total_time_practiced: (task.total_time_practiced || 0) + t.minutes_spent,
            last_practiced_date: new Date().toISOString(),
          }).eq('id', t.task_id)
        }
      }
    }

    // Update profile: streak, points, level
    const newStreak = calculateNewStreak(profile.last_practice_date, profile.streak_count)
    const newPoints = (profile.total_points || 0) + pointsEarned
    const newLevel = Math.floor(newPoints / 100) + 1
    const updatedProfile = { ...profile, streak_count: newStreak, total_points: newPoints, level: newLevel }

    await supabase.from('profiles').update({
      streak_count: newStreak,
      total_points: newPoints,
      level: newLevel,
      last_practice_date: new Date().toISOString(),
    }).eq('id', profile.id)

    await checkAndAwardBadges(profile.id, updatedProfile, session)

    return { ...session, points_earned: pointsEarned }
  },

  async getSessions(userId, startDate, endDate) {
    let query = supabase.from('practice_sessions').select('*').eq('user_id', userId)
    if (startDate) query = query.gte('start_time', startDate)
    if (endDate) query = query.lte('start_time', endDate)
    const { data, error } = await query.order('start_time', { ascending: false })
    if (error) throw new Error(error.message)
    return data || []
  },

  // Badges
  async getUserBadges(userId) {
    const { data, error } = await supabase.from('badges').select('*').eq('user_id', userId)
    if (error) throw new Error(error.message)
    return data || []
  },

  // Calendar Events
  async getCalendarEvents(userId) {
    const { data, error } = await supabase
      .from('calendar_events').select('*').eq('user_id', userId).order('date')
    if (error) throw new Error(error.message)
    return data || []
  },

  async createCalendarEvent(eventData) {
    const { data, error } = await supabase
      .from('calendar_events').insert(eventData).select().single()
    if (error) throw new Error(error.message)
    return data
  },

  async deleteCalendarEvent(eventId) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
    if (error) throw new Error(error.message)
  },

  // Notes / Messaging
  async getNotesConversation(user1Id, user2Id) {
    const { data, error } = await supabase
      .from('notes').select('*')
      .or(`and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`)
      .order('created_at')
    if (error) throw new Error(error.message)
    return data || []
  },

  async getNotes(userId, teacherId) {
    if (!teacherId) return []
    return this.getNotesConversation(userId, teacherId)
  },

  async sendNote(senderId, recipientId, content) {
    const { data, error } = await supabase
      .from('notes')
      .insert({ sender_id: senderId, recipient_id: recipientId, content })
      .select().single()
    if (error) throw new Error(error.message)
    return data
  },

  async markAllNotesRead(recipientId, senderId) {
    await supabase.from('notes')
      .update({ is_read: true })
      .eq('recipient_id', recipientId)
      .eq('sender_id', senderId)
  },

  async getTeacherByCode(code) {
    const { data } = await supabase
      .from('profiles').select('id, name, instrument')
      .eq('teacher_code', code).eq('role', 'teacher').single()
    return data || null
  },

  // Teacher-student
  async getTeacherStudents(teacherId) {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('teacher_id', teacherId)
    if (error) throw new Error(error.message)
    return data || []
  },

  async getStudentSummary(teacherId, studentId) {
    const weekStart = getWeekStart().toISOString()
    const [{ data: profile }, { data: sessions }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', studentId).single(),
      supabase.from('practice_sessions').select('duration_minutes')
        .eq('user_id', studentId).gte('start_time', weekStart),
    ])
    return {
      weekly_minutes: (sessions || []).reduce((s, r) => s + r.duration_minutes, 0),
      streak_count: profile?.streak_count || 0,
      total_sessions_this_week: (sessions || []).length,
    }
  },

  async getStudentActivityLog(teacherId, studentId) {
    const { data, error } = await supabase
      .from('practice_sessions').select('*').eq('user_id', studentId)
      .order('start_time', { ascending: false }).limit(20)
    if (error) throw new Error(error.message)
    return data || []
  },
}
