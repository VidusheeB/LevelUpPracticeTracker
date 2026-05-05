import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'

export default function Messages() {
  const { user, setToast } = useApp()
  const [teacher, setTeacher] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const sortMessages = (msgs) =>
    [...msgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  useEffect(() => {
    if (!user?.teacher_id) { setLoading(false); return }
    const load = async () => {
      try {
        const [teacherData, notesData] = await Promise.all([
          api.getUser(user.teacher_id),
          api.getNotes(user.id, user.teacher_id),
        ])
        setTeacher(teacherData)
        setMessages(sortMessages(notesData))
      } catch {
        setToast('Failed to load messages', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, user?.teacher_id])

  const loadMessages = async () => {
    if (!user?.teacher_id) return
    try {
      const data = await api.getNotes(user.id, user.teacher_id)
      setMessages(sortMessages(data))
    } catch {
      setToast('Failed to refresh messages', 'error')
    }
  }

  const handleSend = async () => {
    if (!replyText.trim() || !user?.teacher_id) return
    setSending(true)
    try {
      await api.sendNote(user.id, user.teacher_id, replyText.trim())
      setReplyText('')
      await loadMessages()
    } catch {
      setToast('Failed to send message', 'error')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!user?.teacher_id) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-gray-50">
        <Text className="text-6xl mb-4">💬</Text>
        <Text className="text-2xl font-bold text-gray-900 mb-2">No Teacher Yet</Text>
        <Text className="text-gray-600 text-center">
          {user?.role === 'personal'
            ? 'Link with a teacher to start messaging'
            : 'Ask your teacher for their code when you registered'}
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center">
          <Text className="text-xl">👨‍🏫</Text>
        </View>
        <View>
          <Text className="font-semibold text-gray-900">{teacher?.name || 'Your Teacher'}</Text>
          <Text className="text-xs text-gray-500">Messages</Text>
        </View>
      </View>

      {/* Message List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={m => String(m.id)}
          contentContainerClassName="px-4 py-4 gap-4"
          ListEmptyComponent={
            <View className="items-center py-8">
              <Text className="text-4xl mb-2">📭</Text>
              <Text className="text-gray-600">No messages yet</Text>
            </View>
          }
          renderItem={({ item: msg }) => (
            <View className={`flex-row ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
              <View className={`max-w-xs px-4 py-3 rounded-2xl ${
                msg.sender_id === user.id
                  ? 'bg-indigo-500 rounded-br-sm'
                  : 'bg-white rounded-bl-sm shadow-sm'
              }`}>
                <Text className={`text-sm ${msg.sender_id === user.id ? 'text-white' : 'text-gray-900'}`}>
                  {msg.content}
                </Text>
                <Text className={`text-xs mt-2 ${msg.sender_id === user.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {formatTime(msg.created_at)}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Input */}
      <View className="flex-row gap-2 px-4 py-3 bg-white border-t border-gray-200">
        <TextInput
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3"
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Type a message..."
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!sending}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!replyText.trim() || sending}
          className={`px-4 py-3 rounded-xl items-center justify-center ${!replyText.trim() || sending ? 'bg-indigo-300' : 'bg-indigo-500'}`}
        >
          <Text className="text-white">{sending ? '...' : '✉️'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
