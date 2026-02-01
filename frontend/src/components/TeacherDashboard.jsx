/**
 * =============================================================================
 * TEACHERDASHBOARD.JSX - Teacher's Student Overview
 * =============================================================================
 * Dashboard for teachers to view their students' progress and send notes.
 *
 * SECTIONS:
 * 1. Teacher Code Display: Share code with students
 * 2. Students List: Overview cards for each student
 * 3. Student Detail Modal: Activity log and notes
 *
 * FEATURES:
 * - View all linked students
 * - See each student's weekly stats and streak
 * - View shared activity log (recent practice sessions)
 * - Send notes/feedback to students
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'


export default function TeacherDashboard() {
  const { user, setToast } = useApp()

  // State
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentSummary, setStudentSummary] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingNote, setSendingNote] = useState(false)


  // ---------------------------------------------------------------------------
  // LOAD STUDENTS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadStudents()
  }, [user?.id])

  const loadStudents = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await api.getTeacherStudents(user.id)
      setStudents(data)
    } catch (error) {
      console.error('Failed to load students:', error)
    } finally {
      setLoading(false)
    }
  }


  // ---------------------------------------------------------------------------
  // LOAD STUDENT DETAILS
  // ---------------------------------------------------------------------------
  const selectStudent = async (student) => {
    setSelectedStudent(student)
    setStudentSummary(null)
    setActivityLog([])
    setNotes([])

    try {
      // Load summary, activity, and notes in parallel
      const [summary, activity, conversation] = await Promise.all([
        api.getStudentSummary(user.id, student.id),
        api.getStudentActivityLog(user.id, student.id),
        api.getNotesConversation(user.id, student.id),
      ])
      setStudentSummary(summary)
      setActivityLog(activity)
      setNotes(conversation.reverse()) // Show oldest first

      // Mark notes as read
      await api.markAllNotesRead(user.id, student.id)
    } catch (error) {
      console.error('Failed to load student details:', error)
    }
  }


  // ---------------------------------------------------------------------------
  // SEND NOTE
  // ---------------------------------------------------------------------------
  const handleSendNote = async () => {
    if (!newNote.trim() || !selectedStudent) return

    setSendingNote(true)
    try {
      const note = await api.sendNote(user.id, selectedStudent.id, newNote.trim())
      setNotes([...notes, note])
      setNewNote('')
      setToast('Note sent!', 'success')
    } catch (error) {
      setToast(error.message, 'error')
    } finally {
      setSendingNote(false)
    }
  }


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-4">

      {/* =================================================================
          HEADER
          ================================================================= */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-500">Manage your students</p>
      </header>


      {/* =================================================================
          TEACHER CODE CARD
          ================================================================= */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-4">
          <div className="text-4xl">👩‍🏫</div>
          <div className="flex-1">
            <p className="text-sm text-gray-600">Your Teacher Code</p>
            <p className="text-3xl font-mono font-bold text-primary tracking-widest">
              {user?.teacher_code || '------'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Share this code with students to connect
            </p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(user?.teacher_code || '')
              setToast('Code copied!', 'success')
            }}
            className="btn-secondary text-sm"
          >
            Copy
          </button>
        </div>
      </div>


      {/* =================================================================
          STUDENTS LIST
          ================================================================= */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Your Students ({students.length})
        </h2>

        {loading ? (
          <div className="card text-center py-8 text-gray-500">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="card text-center py-8">
            <span className="text-4xl mb-2 block">📚</span>
            <p className="text-gray-500">No students yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Share your teacher code to connect with students
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => selectStudent(student)}
                className={`card w-full text-left hover:shadow-md transition-shadow ${
                  selectedStudent?.id === student.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">
                      {student.instrument || 'No instrument set'}
                    </p>
                  </div>
                  <div className="text-right">
                    {student.streak_count > 0 && (
                      <span className="text-sm text-orange-500">
                        🔥 {student.streak_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>


      {/* =================================================================
          STUDENT DETAIL MODAL
          ================================================================= */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">

            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{selectedStudent.name}</h3>
                <p className="text-sm text-gray-500">{selectedStudent.instrument}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Stats Summary */}
            {studentSummary && (
              <div className="p-4 bg-gray-50 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {studentSummary.weekly_minutes}
                  </p>
                  <p className="text-xs text-gray-500">min this week</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-500">
                    {studentSummary.streak_count}
                  </p>
                  <p className="text-xs text-gray-500">day streak</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">
                    {studentSummary.total_sessions_this_week}
                  </p>
                  <p className="text-xs text-gray-500">sessions</p>
                </div>
              </div>
            )}

            {/* Content Tabs */}
            <div className="flex-1 overflow-y-auto">

              {/* Activity Log */}
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                {activityLog.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No practice sessions yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activityLog.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-lg">🎵</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {session.duration_minutes} min practice
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.start_time).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {session.focus_rating && (
                            <span className="text-sm">{'⭐'.repeat(session.focus_rating)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div className="p-4 border-t">
                <h4 className="font-medium text-gray-900 mb-3">Notes</h4>

                {/* Note History */}
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No notes yet - send one below!
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-2 rounded-lg text-sm ${
                          note.sender_id === user.id
                            ? 'bg-primary/10 text-primary ml-8'
                            : 'bg-gray-100 text-gray-700 mr-8'
                        }`}
                      >
                        <p>{note.content}</p>
                        <p className="text-xs opacity-60 mt-1">
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* New Note Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a note..."
                    className="input flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendNote()}
                  />
                  <button
                    onClick={handleSendNote}
                    disabled={sendingNote || !newNote.trim()}
                    className="btn-primary px-4"
                  >
                    {sendingNote ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
