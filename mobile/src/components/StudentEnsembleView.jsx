import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useState, useCallback } from 'react'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'

export default function StudentEnsembleView() {
  const { user } = useApp()
  const navigation = useNavigation()

  const [ensembles, setEnsembles] = useState([])
  const [challenges, setChallenges] = useState([])
  const [assignments, setAssignments] = useState([])

  const load = useCallback(async () => {
    if (!user?.id) return
    const [ens, chl, asn] = await Promise.all([
      db.getStudentEnsembles(user.id),
      db.getStudentChallenges(user.id),
      db.getStudentAssignments(user.id),
    ])
    setEnsembles(ens)
    setChallenges(chl)
    setAssignments(asn)
  }, [user?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const today = new Date()
  const activeChallenges = challenges.filter(c => new Date(c.end_date) >= today)
  const openAssignments = assignments.filter(a => !a.assignments?.due_date || new Date(a.assignments.due_date) >= today)

  if (ensembles.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-4">
        <Text className="text-6xl mb-4">🎺</Text>
        <Text className="text-xl font-bold text-gray-900 mb-2">No Classes Yet</Text>
        <Text className="text-gray-500 text-center">
          Your teacher will add you to a class. Make sure you've joined a teacher in Profile first.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          className="bg-indigo-500 px-5 py-3 rounded-xl mt-6"
        >
          <Text className="text-white font-semibold">Go to Profile</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 gap-5">
      <View>
        <Text className="text-2xl font-bold text-gray-900">My Classes</Text>
      </View>

      {/* Classes */}
      <View className="gap-2">
        {ensembles.map(e => (
          <View key={e.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="font-semibold text-gray-900">🎵 {e.name}</Text>
            {!!e.description && (
              <Text className="text-sm text-gray-500 mt-1">{e.description}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Active challenges */}
      {activeChallenges.length > 0 && (
        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">⚡ Active Challenges</Text>
          <View className="gap-2">
            {activeChallenges.map(c => {
              const daysLeft = Math.ceil((new Date(c.end_date) - today) / (1000 * 60 * 60 * 24))
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => navigation.navigate('ChallengeLeaderboard', { challenge: c })}
                  className="bg-white rounded-2xl p-4 shadow-sm flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900">
                      {c.type === 'xp_sprint' ? '⚡' : '🎯'} {c.title}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {c.ensemble_name} · {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                    </Text>
                  </View>
                  <Text className="text-indigo-500 text-sm font-medium">View ›</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* Open assignments */}
      {openAssignments.length > 0 && (
        <View>
          <Text className="text-lg font-semibold text-gray-900 mb-3">📚 Assignments</Text>
          <View className="gap-2">
            {openAssignments.map(sub => {
              const a = sub.assignments
              const readiness = sub.practice_tasks?.readiness_score ?? 0
              return (
                <View key={sub.id} className="bg-white rounded-2xl p-4 shadow-sm gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-medium text-gray-900 flex-1">{a?.title}</Text>
                    {sub.teacher_grade && (
                      <Text className="text-amber-500 text-sm">{'⭐'.repeat(sub.teacher_grade)}</Text>
                    )}
                  </View>
                  <Text className="text-xs text-gray-500">
                    {a?.ensembles?.name}
                    {a?.due_date && ` · Due ${new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </Text>
                  <View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-gray-500">Your readiness</Text>
                      <Text className="text-xs text-gray-700 font-medium">{readiness}%</Text>
                    </View>
                    <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className={`h-1.5 rounded-full ${readiness >= 80 ? 'bg-green-500' : readiness >= 40 ? 'bg-amber-400' : 'bg-gray-300'}`}
                        style={{ width: `${readiness}%` }}
                      />
                    </View>
                  </View>
                  {!!sub.teacher_feedback && (
                    <View className="bg-indigo-50 rounded-lg p-2 mt-1">
                      <Text className="text-xs text-indigo-700">Teacher: {sub.teacher_feedback}</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>
      )}
    </ScrollView>
  )
}
