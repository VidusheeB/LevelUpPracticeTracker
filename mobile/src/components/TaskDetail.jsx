import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useState, useCallback } from 'react'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'
import { getCoachingTip, getSmartReminderData } from '../utils/ai'

const CATEGORY_ICONS = {
  repertoire: '🎵',
  technique: '🎯',
  sight_reading: '👀',
  section_work: '👥',
}

export default function TaskDetail() {
  const navigation = useNavigation()
  const route = useRoute()
  const { user, deleteTask, setToast } = useApp()
  const { task: initialTask } = route.params

  const [task, setTask] = useState(initialTask)
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [tip, setTip] = useState(null)
  const [loadingTip, setLoadingTip] = useState(false)

  const load = useCallback(async () => {
    const [notesData] = await Promise.all([
      db.getTaskNotes(task.id),
    ])
    setNotes(notesData)
  }, [task.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const note = await db.addTaskNote(task.id, user.id, newNote.trim())
      const updatedNotes = [note, ...notes]
      setNotes(updatedNotes)
      setNewNote('')
      setTip(null) // invalidate so next "Get Tip" is fresh

      // Fire-and-forget: ask Claude for the best reminder time + message,
      // then reschedule the notification silently in the background
      rescheduleSmartReminder(updatedNotes)
    } catch (err) {
      setToast(err.message, 'error')
    } finally {
      setSavingNote(false)
    }
  }

  const rescheduleSmartReminder = async (currentNotes) => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const sessions = await db.getSessions(user.id, thirtyDaysAgo.toISOString().split('T')[0])
      const sessionTimes = sessions.slice(0, 10).map(s =>
        new Date(s.start_time).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      )

      const { remind_at, message } = await getSmartReminderData(task, currentNotes, sessionTimes)

      // Store in Supabase — the edge function delivers it to ALL the user's
      // devices at the Claude-chosen time, not just the device they're on now.
      await db.scheduleNotification(user.id, task.id, 'PracticeBeats 🎵', message, remind_at)
    } catch {
      // Silent — notifications are best-effort
    }
  }

  const handleDeleteNote = (noteId) => {
    Alert.alert('Delete Note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await db.deleteTaskNote(noteId)
        setNotes(prev => prev.filter(n => n.id !== noteId))
        setTip(null)
      }},
    ])
  }

  const handleGetTip = async () => {
    setLoadingTip(true)
    setTip(null)
    try {
      const result = await getCoachingTip(
        task.title,
        task.total_time_practiced || 0,
        notes
      )
      setTip(result)
    } catch (err) {
      setToast(err.message.includes('API key')
        ? 'Add your Claude API key to mobile/src/utils/ai.js'
        : err.message, 'error')
    } finally {
      setLoadingTip(false)
    }
  }

  const handleDelete = () => {
    Alert.alert('Delete Task', `Delete "${task.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteTask(task.id)
        navigation.goBack()
      }},
    ])
  }

  const readiness = task.readiness_score ?? 0
  const readinessColor = readiness >= 80 ? '#10b981' : readiness >= 50 ? '#f59e0b' : '#ef4444'
  const readinessLabel = readiness >= 80 ? 'Ready!' : readiness >= 50 ? 'Getting there' : 'Needs work'

  const formatDate = (ds) => {
    if (!ds) return null
    return new Date(ds).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatNote = (createdAt) => {
    return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="pb-24">

      {/* Hero card */}
      <View className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <View className="flex-row items-start gap-3">
          <View className="w-12 h-12 bg-indigo-50 rounded-xl items-center justify-center">
            <Text className="text-2xl">{CATEGORY_ICONS[task.category] || '🎵'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">{task.title}</Text>
            <Text className="text-sm text-gray-400 capitalize mt-0.5">{task.category?.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Readiness bar */}
        <View className="mt-4">
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-sm text-gray-600">{Math.round(readiness)}% ready</Text>
            <Text className="text-sm font-medium" style={{ color: readinessColor }}>{readinessLabel}</Text>
          </View>
          <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <View className="h-3 rounded-full" style={{ width: `${Math.min(readiness, 100)}%`, backgroundColor: readinessColor }} />
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row mt-4 pt-4 border-t border-gray-100 gap-4">
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-gray-900">{task.total_time_practiced || 0}</Text>
            <Text className="text-xs text-gray-400">min logged</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-gray-900">{task.estimated_minutes || 30}</Text>
            <Text className="text-xs text-gray-400">min goal</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-gray-900">{[...Array(5)].map((_, i) => i < (task.difficulty || 3) ? '★' : '☆').join('')}</Text>
            <Text className="text-xs text-gray-400">difficulty</Text>
          </View>
        </View>

        {task.due_date && (
          <View className="mt-3 flex-row items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
            <Text>📅</Text>
            <Text className="text-orange-700 text-sm font-medium">Due {formatDate(task.due_date)}</Text>
          </View>
        )}
      </View>

      {/* AI Coaching */}
      <View className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg">✨</Text>
            <Text className="font-semibold text-gray-900">AI Coach</Text>
          </View>
          <TouchableOpacity
            onPress={handleGetTip}
            disabled={loadingTip}
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl ${loadingTip ? 'bg-gray-100' : 'bg-indigo-500'}`}
          >
            {loadingTip
              ? <ActivityIndicator size="small" color="#9ca3af" />
              : <Text className="text-white text-sm font-medium">Get Tip</Text>
            }
          </TouchableOpacity>
        </View>

        {tip ? (
          <View className="bg-indigo-50 rounded-xl p-4">
            <Text className="text-indigo-900 text-sm leading-relaxed">{tip}</Text>
          </View>
        ) : (
          <View className="bg-gray-50 rounded-xl p-4 items-center">
            <Text className="text-gray-400 text-sm text-center">
              {notes.length > 0
                ? 'Tap "Get Tip" — AI will read your notes and tell you what to focus on next'
                : 'Add practice notes below, then tap "Get Tip" for personalised coaching'}
            </Text>
          </View>
        )}
      </View>

      {/* Practice Notes */}
      <View className="mx-4 mt-4">
        <Text className="text-base font-semibold text-gray-900 mb-3">Practice Notes</Text>
        <Text className="text-xs text-gray-400 mb-3">
          Jot down what you worked on, what clicked, what's still tricky. AI remembers these.
        </Text>

        {/* Add note input */}
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-3">
          <TextInput
            className="text-gray-900 text-sm"
            style={{ minHeight: 70, textAlignVertical: 'top' }}
            value={newNote}
            onChangeText={setNewNote}
            placeholder="e.g. Nailed the melody today. Still stumbling on the Dm7-G7 turnaround at bar 8..."
            multiline
          />
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <View className="flex-row items-center gap-1">
              <Text className="text-xs text-gray-400">🎤 Speak via keyboard mic</Text>
            </View>
            <TouchableOpacity
              onPress={handleAddNote}
              disabled={savingNote || !newNote.trim()}
              className={`px-4 py-2 rounded-xl ${savingNote || !newNote.trim() ? 'bg-gray-100' : 'bg-indigo-500'}`}
            >
              <Text className={`text-sm font-medium ${savingNote || !newNote.trim() ? 'text-gray-400' : 'text-white'}`}>
                {savingNote ? 'Saving...' : 'Save Note'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes list */}
        {notes.length > 0 ? (
          <View className="gap-2">
            {notes.map(note => (
              <View key={note.id} className="bg-white rounded-xl px-4 py-3 shadow-sm">
                <Text className="text-gray-800 text-sm leading-relaxed">{note.content}</Text>
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-xs text-gray-400">{formatNote(note.created_at)}</Text>
                  <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                    <Text className="text-xs text-gray-300">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="bg-white rounded-xl py-5 items-center">
            <Text className="text-gray-400 text-sm">No notes yet — add one above</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View className="mx-4 mt-6 gap-3">
        <TouchableOpacity
          onPress={() => navigation.navigate('Practice', { selectedTask: task.id })}
          className="bg-indigo-500 rounded-2xl py-4 items-center flex-row justify-center gap-2"
        >
          <Text className="text-white text-lg">▶</Text>
          <Text className="text-white font-semibold text-base">Start Practice</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDelete} className="py-3 items-center">
          <Text className="text-red-400 text-sm">Delete Task</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  )
}
