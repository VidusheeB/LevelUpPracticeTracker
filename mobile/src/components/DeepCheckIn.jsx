import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'
import { getDeepCheckInQuestions } from '../utils/ai'

const EMOJI_SCALE = ['😴', '😟', '😐', '😊', '⚡']
const EMOJI_LABELS = ['Exhausted', 'Tough', 'Okay', 'Good', 'Energised']

// Weekly reflective questionnaire — Claude generates 5-6 targeted questions
// based on the user's actual tasks, notes, mood history, and calendar events.
export default function DeepCheckIn() {
  const navigation = useNavigation()
  const { user, tasks, setToast } = useApp()

  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const [moodLogs, events] = await Promise.all([
          db.getMoodLogs(user.id, 20),
          db.getCalendarEvents(user.id),
        ])
        const qs = await getDeepCheckInQuestions(tasks, moodLogs, events)
        setQuestions(qs)
      } catch (err) {
        setToast(
          err.message.includes('API key')
            ? 'Add your Claude API key to mobile/src/utils/ai.js'
            : 'Could not load questions — try again',
          'error'
        )
        navigation.goBack()
      } finally {
        setLoading(false)
      }
    }
    fetchQuestions()
  }, [])

  const setAnswer = (id, val) => setAnswers(prev => ({ ...prev, [id]: val }))

  const handleSave = async () => {
    const moodQ = questions.find(q => q.type === 'emoji_scale')
    const moodScore = moodQ ? (answers[moodQ.id] || 3) : 3
    const entries = questions.map(q => ({ id: q.id, q: q.question, a: answers[q.id] ?? '' }))

    setSaving(true)
    try {
      await db.saveMoodLog(user.id, { type: 'deep', mood_score: moodScore, entries })
      setToast('Weekly reflection saved ✨', 'success')
      navigation.goBack()
    } catch (err) {
      setToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center gap-4 px-8">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-gray-500 text-center text-sm leading-relaxed">
          Claude is personalising your questions based on your practice history and calendar...
        </Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 py-6 pb-24 gap-5">

      <View>
        <Text className="text-2xl font-bold text-gray-900">Weekly Reflection</Text>
        <Text className="text-gray-400 text-sm mt-1">
          Personalised to your practice — takes 3-5 min
        </Text>
      </View>

      {questions.map((q, i) => (
        <View key={q.id} className="bg-white rounded-2xl p-5 shadow-sm">
          <View className="flex-row items-start gap-3 mb-4">
            <View className="w-7 h-7 rounded-full bg-indigo-100 items-center justify-center mt-0.5 shrink-0">
              <Text className="text-xs font-bold text-indigo-600">{i + 1}</Text>
            </View>
            <Text className="flex-1 text-gray-900 font-medium leading-snug">{q.question}</Text>
          </View>

          {q.type === 'emoji_scale' ? (
            <View className="flex-row justify-between">
              {EMOJI_SCALE.map((e, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setAnswer(q.id, idx + 1)}
                  className={`items-center flex-1 mx-0.5 py-2 rounded-xl ${
                    answers[q.id] === idx + 1 ? 'bg-indigo-50 border border-indigo-200' : ''
                  }`}
                >
                  <Text className="text-2xl">{e}</Text>
                  <Text className={`text-xs mt-0.5 ${
                    answers[q.id] === idx + 1 ? 'text-indigo-600 font-medium' : 'text-gray-400'
                  }`}>
                    {EMOJI_LABELS[idx]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput
              className="border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              value={answers[q.id] || ''}
              onChangeText={v => setAnswer(q.id, v)}
              placeholder="Write your thoughts..."
              multiline
            />
          )}
        </View>
      ))}

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className={`rounded-2xl py-4 items-center ${saving ? 'bg-indigo-300' : 'bg-indigo-500'}`}
      >
        <Text className="text-white font-semibold text-base">
          {saving ? 'Saving...' : 'Save Reflection'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} className="items-center py-2">
        <Text className="text-gray-400 text-sm">Not now</Text>
      </TouchableOpacity>

    </ScrollView>
  )
}
