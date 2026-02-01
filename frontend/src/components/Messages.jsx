/**
 * =============================================================================
 * MESSAGES.JSX - Student Messaging with Teacher
 * =============================================================================
 * Conversation view for students to communicate with their teacher.
 * 
 * FEATURES:
 * - View all messages from teacher
 * - Send replies to teacher
 * - Shows message timestamps
 * - Real-time message loading
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'


export default function Messages() {
  const { user, setToast, loadUserData } = useApp()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  // Load messages on mount
  useEffect(() => {
    loadMessages()
  }, [])

  // Load all notes/messages for this user
  const loadMessages = async () => {
    setLoading(true)
    try {
      const data = await api.getNotes(user.id)
      setMessages(data)
    } catch (error) {
      console.error('Failed to load messages:', error)
      setToast('Failed to load messages', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Send a reply to teacher
  const handleSendReply = async () => {
    if (!replyText.trim()) return

    setSending(true)
    try {
      // Find the teacher (the user who has teacher_id set to null or is the instructor)
      const teacher = user.teacher_id ? { id: user.teacher_id } : null
      
      if (!teacher) {
        setToast('You are not linked to a teacher', 'error')
        setSending(false)
        return
      }

      // Send note to teacher
      await api.sendNote({
        sender_id: user.id,
        recipient_id: teacher.id,
        message: replyText
      })

      setToast('Message sent! ✉️', 'success')
      setReplyText('')
      await loadMessages()
    } catch (error) {
      setToast('Failed to send message', 'error')
    } finally {
      setSending(false)
    }
  }

  // Format timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // No teacher linked
  if (user.role === 'personal' || !user.teacher_id) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-6xl mb-4">💬</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Teacher Yet</h2>
        <p className="text-gray-600 mb-6">
          {user.role === 'personal' 
            ? 'Join an ensemble or link with a teacher to start messaging'
            : 'You are not linked to a teacher'}
        </p>
        <div className="text-sm text-gray-500">
          {user.role !== 'personal' && user.teacher_code && (
            <>Ask your teacher for their code or have them add you</>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xl">👨‍🏫</span>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Your Teacher</h2>
          <p className="text-xs text-gray-500">Messages</p>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-600">No messages yet</p>
            <p className="text-sm text-gray-500">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-2xl ${
                  msg.sender_id === user.id
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                }`}
              >
                <p className="text-sm break-words">{msg.message}</p>
                <p
                  className={`text-xs mt-2 ${
                    msg.sender_id === user.id ? 'text-primary/70' : 'text-gray-500'
                  }`}
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
            placeholder="Type a message..."
            className="input flex-1"
            disabled={sending}
          />
          <button
            onClick={handleSendReply}
            disabled={!replyText.trim() || sending}
            className="btn-primary px-4"
          >
            {sending ? '...' : '✉️'}
          </button>
        </div>
      </div>
    </div>
  )
}
