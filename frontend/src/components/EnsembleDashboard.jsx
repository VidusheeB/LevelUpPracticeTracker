/**
 * ENSEMBLEDASHBOARD.JSX - Team / Messages View (simplified - ensemble features removed)
 * For students: Shows teacher messaging
 * For others: Simple placeholder
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'

export default function EnsembleDashboard() {
  const { user, setToast, loadUserData } = useApp()
  const navigate = useNavigate()

  const [teacher, setTeacher] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [updatingShare, setUpdatingShare] = useState(false)

  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'

  const loadTeacherMessages = async () => {
    if (!isStudent || !user?.teacher_id) return
    try {
      const data = await api.getNotes(user.id, user.teacher_id)
      setMessages(data.reverse())
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleToggleSharePractice = async () => {
    if (!user?.teacher_id) return
    setUpdatingShare(true)
    try {
      const newValue = !user.share_practice_with_teacher
      await api.updateUser(user.id, { share_practice_with_teacher: newValue })
      await loadUserData(user.id)
      setToast(newValue ? 'Practice log sharing enabled' : 'Practice log sharing disabled', 'success')
    } catch (error) {
      setToast(error.message || 'Failed to update', 'error')
    } finally {
      setUpdatingShare(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !user?.teacher_id) return
    setSendingMessage(true)
    try {
      await api.sendNote(user.id, user.teacher_id, replyText.trim())
      setToast('Message sent! 📨', 'success')
      setReplyText('')
      await loadTeacherMessages()
    } catch (error) {
      setToast(error.message || 'Failed to send message', 'error')
    } finally {
      setSendingMessage(false)
    }
  }

  useEffect(() => {
    if (isStudent && user?.teacher_id) {
      const load = async () => {
        try {
          const [teacherData] = await Promise.all([
            api.getUser(user.teacher_id),
            loadTeacherMessages()
          ])
          setTeacher(teacherData)
        } catch {
          loadTeacherMessages()
        }
      }
      load()
    } else {
      setTeacher(null)
    }
  }, [user?.id, user?.teacher_id])

  // Teachers go to Students instead
  if (isTeacher) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500">Manage your students</p>
        </header>
        <div className="card text-center py-12">
          <span className="text-6xl mb-4 block">📚</span>
          <p className="text-gray-600 mb-4">View and message your students</p>
          <button onClick={() => navigate('/students')} className="btn-primary">
            Go to Students
          </button>
        </div>
      </div>
    )
  }

  // Student with teacher - show messaging
  if (isStudent && user?.teacher_id) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">
            {teacher?.name ? `Messages with ${teacher.name}` : 'Messages'}
          </h1>
          <p className="text-gray-500">Chat with your teacher</p>
        </header>

        {/* Share practice log toggle */}
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">Share practice log</p>
            <p className="text-sm text-gray-500">
              Allow your teacher to see your practice sessions when they view your profile
            </p>
          </div>
          <button
            onClick={handleToggleSharePractice}
            disabled={updatingShare}
            className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${
              user.share_practice_with_teacher ? 'bg-primary' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={user.share_practice_with_teacher}
          >
            <span
              className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                user.share_practice_with_teacher ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div className="card space-y-4">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.sender_id === user.id ? 'bg-primary/10 ml-8' : 'bg-gray-100 mr-8'
                  }`}
                >
                  <p className="text-sm text-gray-900">{msg.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No messages yet. Send one to start!</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a message..."
              className="input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
            />
            <button
              onClick={handleSendReply}
              disabled={sendingMessage || !replyText.trim()}
              className="btn-primary px-4"
            >
              {sendingMessage ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Student without teacher or personal - placeholder
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500">Connect with your teacher</p>
      </header>
      <div className="card text-center py-12">
        <span className="text-6xl mb-4 block">💬</span>
        <p className="text-gray-600">
          {isStudent
            ? 'Link with a teacher using their code when you register to message them.'
            : 'Create an account and link with a teacher to get started.'}
        </p>
      </div>
    </div>
  )
}
