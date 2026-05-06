import { View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'
import { getQuickFollowUp } from '../utils/ai'

const EMOJI = ['😴', '😟', '😐', '😊', '⚡']
const LABELS = ['Drained', 'Tough', 'Okay', 'Good', 'Energised']

// Post-session bottom sheet: mood rating + one Claude-generated targeted question.
// Props: session (result from saveSession), onDismiss (callback)
export default function MindfulCheckIn({ session, onDismiss }) {
  const { user, tasks } = useApp()
  const [mood, setMood] = useState(0)
  const [question, setQuestion] = useState(null)
  const [loadingQ, setLoadingQ] = useState(true)
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchQ = async () => {
      try {
        const recentLogs = await db.getMoodLogs(user.id, 10)
        const q = await getQuickFollowUp(session, tasks, recentLogs)
        setQuestion(q)
      } catch {
        setQuestion('What was one small win from today\'s practice?')
      } finally {
        setLoadingQ(false)
      }
    }
    fetchQ()
  }, [])

  const handleSave = async () => {
    if (!mood) return
    setSaving(true)
    try {
      await db.saveMoodLog(user.id, {
        type: 'quick',
        mood_score: mood,
        entries: question ? [{ id: 'followup', q: question, a: answer }] : [],
        session_id: session?.id ?? null,
      })
    } catch {}
    onDismiss()
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10">

          <View className="w-12 h-1 bg-gray-200 rounded-full self-center mb-5" />

          <Text className="text-xl font-bold text-gray-900 mb-0.5">Quick Reflection</Text>
          <Text className="text-sm text-gray-400 mb-5">30 seconds · stays private on your device</Text>

          {/* Mood scale */}
          <Text className="text-sm font-medium text-gray-700 mb-3">How are you feeling right now?</Text>
          <View className="flex-row justify-between mb-1">
            {EMOJI.map((e, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setMood(i + 1)}
                className={`items-center px-1 py-2 rounded-xl flex-1 mx-0.5 ${mood === i + 1 ? 'bg-indigo-50 border border-indigo-300' : ''}`}
              >
                <Text className="text-2xl">{e}</Text>
                <Text className={`text-xs mt-0.5 ${mood === i + 1 ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                  {LABELS[i]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Claude-generated follow-up question */}
          <View className="mt-5">
            {loadingQ ? (
              <View className="flex-row items-center gap-2 py-3">
                <ActivityIndicator size="small" color="#6366f1" />
                <Text className="text-sm text-gray-400">Claude is reading your notes...</Text>
              </View>
            ) : (
              <>
                <Text className="text-sm font-medium text-gray-800 mb-2 leading-snug">{question}</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50"
                  style={{ minHeight: 72, textAlignVertical: 'top' }}
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="Type your reflection..."
                  multiline
                />
              </>
            )}
          </View>

          {/* Actions */}
          <View className="flex-row gap-3 mt-5">
            <TouchableOpacity onPress={onDismiss} className="py-3 px-5 rounded-xl bg-gray-100 items-center">
              <Text className="text-gray-500 font-medium">Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!mood || saving}
              className={`flex-1 py-3 rounded-xl items-center ${!mood || saving ? 'bg-indigo-200' : 'bg-indigo-500'}`}
            >
              <Text className="text-white font-semibold">{saving ? 'Saving...' : 'Save Reflection'}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  )
}
