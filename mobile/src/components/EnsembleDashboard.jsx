import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native'
import { useState, useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'

export default function EnsembleDashboard() {
  const { user, setToast, loadUserData } = useApp()
  const navigation = useNavigation()

  const [teacher, setTeacher] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingShare, setUpdatingShare] = useState(false)

  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'

  useEffect(() => {
    if (!isStudent || !user?.teacher_id) { setTeacher(null); return }
    const load = async () => {
      try {
        const [teacherData, notesData] = await Promise.all([
          db.getProfile(user.teacher_id),
          db.getNotes(user.id, user.teacher_id),
        ])
        setTeacher(teacherData)
        setMessages([...notesData].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      } catch (error) {
        console.error('Failed to load teacher data:', error)
      }
    }
    load()
  }, [user?.id, user?.teacher_id])

  const handleSend = async () => {
    if (!replyText.trim() || !user?.teacher_id) return
    setSending(true)
    try {
      await db.sendNote(user.id, user.teacher_id, replyText.trim())
      setToast('Message sent! 📨', 'success')
      setReplyText('')
      const data = await db.getNotes(user.id, user.teacher_id)
      setMessages([...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
    } catch (error) {
      setToast(error.message || 'Failed to send', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleToggleShare = async () => {
    if (!user?.teacher_id) return
    setUpdatingShare(true)
    try {
      const newVal = !user.share_practice_with_teacher
      await db.updateProfile(user.id, { share_practice_with_teacher: newVal })
      await loadUserData(user.id)
      setToast(newVal ? 'Sharing enabled' : 'Sharing disabled', 'success')
    } catch (error) {
      setToast(error.message || 'Failed to update', 'error')
    } finally {
      setUpdatingShare(false)
    }
  }

  if (isTeacher) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-4">
        <Text className="text-6xl mb-4">📚</Text>
        <Text className="text-gray-600 mb-6 text-center">View and message your students</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Students')} className="bg-indigo-500 px-6 py-3 rounded-xl">
          <Text className="text-white font-semibold">Go to Students</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (isStudent && user?.teacher_id) {
    return (
      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 gap-6">
        <View>
          <Text className="text-2xl font-bold text-gray-900">
            {teacher?.name ? `Messages with ${teacher.name}` : 'Messages'}
          </Text>
          <Text className="text-gray-500">Chat with your teacher</Text>
        </View>

        {/* Share toggle */}
        <View className="bg-white rounded-2xl p-4 shadow-sm flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text className="font-medium text-gray-900">Share practice log</Text>
            <Text className="text-sm text-gray-500">Allow your teacher to see your sessions</Text>
          </View>
          <Switch
            value={!!user.share_practice_with_teacher}
            onValueChange={handleToggleShare}
            disabled={updatingShare}
            trackColor={{ false: '#d1d5db', true: '#6366f1' }}
            thumbColor="white"
          />
        </View>

        {/* Messages */}
        <View className="bg-white rounded-2xl p-4 shadow-sm gap-4">
          <ScrollView className="max-h-64">
            {messages.length > 0 ? (
              <View className="gap-3">
                {messages.map(msg => (
                  <View
                    key={msg.id}
                    className={`p-3 rounded-lg ${msg.sender_id === user.id ? 'bg-indigo-50 ml-8' : 'bg-gray-100 mr-8'}`}
                  >
                    <Text className="text-sm text-gray-900">{msg.content}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{new Date(msg.created_at).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-center text-gray-500 py-4">No messages yet. Send one to start!</Text>
            )}
          </ScrollView>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3"
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Type a message..."
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending || !replyText.trim()}
              className={`px-4 py-3 rounded-xl ${sending || !replyText.trim() ? 'bg-indigo-300' : 'bg-indigo-500'}`}
            >
              <Text className="text-white">{sending ? '...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    )
  }

  return (
    <View className="flex-1 bg-gray-50 items-center justify-center px-4">
      <Text className="text-6xl mb-4">💬</Text>
      <Text className="text-gray-600 text-center">
        {isStudent
          ? 'Link with a teacher using their code when you register.'
          : 'Create an account and link with a teacher to get started.'}
      </Text>
    </View>
  )
}
