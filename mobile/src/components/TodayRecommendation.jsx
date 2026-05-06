import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'
import { getPracticeRecommendation } from '../utils/ai'

// Dashboard card: Claude's research-backed practice recommendation for today.
// User taps Generate on first load — avoids auto-calling the API on every visit.
export default function TodayRecommendation() {
  const { user, tasks } = useApp()
  const [rec, setRec] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const METHOD_COLORS = {
    'Deliberate practice': '#6366f1',
    'Interleaved practice': '#8b5cf6',
    'Spaced retrieval': '#10b981',
    'Blocked repetition': '#f59e0b',
    'Cognitive load reduction': '#ef4444',
    'Mental practice': '#06b6d4',
    'Pomodoro': '#f97316',
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const [moodLogs, calendarEvents, sessions] = await Promise.all([
        db.getMoodLogs(user.id, 7),
        db.getCalendarEvents(user.id),
        db.getSessions(user.id, weekAgo),
      ])
      const result = await getPracticeRecommendation(
        tasks, moodLogs, calendarEvents, sessions.slice(0, 7)
      )
      setRec(result)
    } catch (err) {
      setError(
        err.message.includes('API key')
          ? 'Add your Claude API key to use AI features'
          : 'Could not generate — try again'
      )
    } finally {
      setLoading(false)
    }
  }

  const methodColor = rec ? (METHOD_COLORS[rec.method] || '#6366f1') : '#6366f1'

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm">

      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">🧠</Text>
          <Text className="font-semibold text-gray-900">Today's Practice Plan</Text>
        </View>
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={loading}
          className={`px-3 py-1.5 rounded-xl ${
            loading ? 'bg-gray-100' : rec ? 'bg-gray-100' : 'bg-indigo-500'
          }`}
        >
          {loading
            ? <ActivityIndicator size="small" color="#9ca3af" />
            : <Text className={`text-sm font-medium ${rec ? 'text-gray-600' : 'text-white'}`}>
                {rec ? 'Refresh' : 'Generate'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      {error && (
        <View className="bg-red-50 rounded-xl p-3">
          <Text className="text-red-600 text-sm">{error}</Text>
        </View>
      )}

      {!rec && !loading && !error && (
        <View className="bg-gray-50 rounded-xl p-4 items-center">
          <Text className="text-gray-400 text-sm text-center leading-relaxed">
            Tap Generate — Claude reads your tasks, mood, and upcoming events to build a
            specific, research-backed plan for today.
          </Text>
        </View>
      )}

      {loading && (
        <View className="bg-gray-50 rounded-xl p-5 items-center gap-2">
          <ActivityIndicator color="#6366f1" />
          <Text className="text-gray-400 text-sm">Analysing your tasks and history...</Text>
        </View>
      )}

      {rec && (
        <View className="gap-3">

          {/* Headline + full tip */}
          <View className="bg-indigo-50 rounded-xl p-4">
            <Text className="font-semibold text-indigo-900 mb-1">{rec.headline}</Text>
            <Text className="text-indigo-700 text-sm leading-relaxed">{rec.full_tip}</Text>
          </View>

          {/* Method badge + rationale */}
          <View className="flex-row items-start gap-2 flex-wrap">
            <View
              className="px-3 py-1 rounded-full shrink-0"
              style={{ backgroundColor: methodColor + '20' }}
            >
              <Text className="text-xs font-semibold" style={{ color: methodColor }}>
                {rec.method}
              </Text>
            </View>
            <Text className="text-xs text-gray-400 flex-1 leading-snug pt-0.5">{rec.method_reason}</Text>
          </View>

          {/* Focus + structure */}
          <View className="border border-gray-100 rounded-xl p-3 gap-2">
            <View className="flex-row items-start gap-2">
              <Text className="text-sm">🎯</Text>
              <Text className="text-sm font-medium text-gray-800 flex-1">{rec.task_focus}</Text>
            </View>
            <View className="flex-row items-start gap-2">
              <Text className="text-sm">⏱</Text>
              <Text className="text-sm text-gray-600 flex-1">
                {rec.duration_minutes} min — {rec.structure}
              </Text>
            </View>
          </View>

        </View>
      )}

    </View>
  )
}
