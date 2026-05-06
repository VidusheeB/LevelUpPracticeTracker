import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useState, useCallback } from 'react'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'

export default function ChallengeLeaderboard() {
  const { user } = useApp()
  const navigation = useNavigation()
  const route = useRoute()
  const { challenge } = route.params

  const [board, setBoard] = useState([])
  const [expandedEnsemble, setExpandedEnsemble] = useState(null)

  const load = useCallback(async () => {
    const data = await db.getChallengeLeaderboard(challenge.id)
    setBoard(data)
  }, [challenge.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const isClassVsClass = board.length > 0 && board[0].members
  const isXP = challenge.type === 'xp_sprint'
  const metricLabel = isXP ? 'XP' : 'min'
  const metricKey = isXP ? 'xp_earned' : 'minutes_practiced'

  const today = new Date()
  const isActive = new Date(challenge.end_date) >= today
  const daysLeft = Math.ceil((new Date(challenge.end_date) - today) / (1000 * 60 * 60 * 24))

  const isTeacher = challenge.teacher_id === user.id

  const handleDelete = () => {
    Alert.alert('Delete Challenge', `Permanently delete "${challenge.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await db.deleteChallenge(challenge.id)
        navigation.goBack()
      }},
    ])
  }

  const medalFor = (rank) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 gap-4">
      <View className="bg-white rounded-2xl p-5 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900">
          {isXP ? '⚡' : '🎯'} {challenge.title}
        </Text>
        <View className="flex-row items-center gap-2 mt-2">
          {isActive ? (
            <Text className="text-sm text-green-600 font-medium">
              Active · {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
            </Text>
          ) : (
            <Text className="text-sm text-gray-500">Ended</Text>
          )}
          <Text className="text-sm text-gray-400">
            · {new Date(challenge.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(challenge.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        {challenge.target_minutes && (
          <Text className="text-xs text-gray-500 mt-1">Target: {challenge.target_minutes} minutes</Text>
        )}
      </View>

      {board.length === 0 ? (
        <View className="bg-white rounded-2xl py-12 items-center">
          <Text className="text-4xl mb-2">📊</Text>
          <Text className="text-gray-500">No data yet</Text>
          <Text className="text-xs text-gray-400 mt-1">Practice sessions will populate this</Text>
        </View>
      ) : isClassVsClass ? (
        // Class vs class
        <View className="gap-3">
          <Text className="text-lg font-semibold text-gray-900">Class Standings</Text>
          {board.map(ensemble => (
            <View key={ensemble.ensemble_id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <TouchableOpacity
                onPress={() => setExpandedEnsemble(expandedEnsemble === ensemble.ensemble_id ? null : ensemble.ensemble_id)}
                className="p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1">
                    <Text className="text-2xl">{medalFor(ensemble.rank)}</Text>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900">{ensemble.ensemble_name}</Text>
                      <Text className="text-xs text-gray-500">{ensemble.count} student{ensemble.count !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-bold text-indigo-500">{ensemble.avg}</Text>
                    <Text className="text-xs text-gray-500">avg {metricLabel}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {expandedEnsemble === ensemble.ensemble_id && (
                <View className="border-t border-gray-100 px-4 py-3 gap-2">
                  {ensemble.members.map(m => (
                    <View key={m.id} className="flex-row items-center justify-between py-1">
                      <View className="flex-row items-center gap-3 flex-1">
                        <Text className="text-sm text-gray-500 w-6">{m.rank}.</Text>
                        <Text className="text-sm text-gray-900 flex-1">{m.name}</Text>
                      </View>
                      <Text className="text-sm font-medium text-gray-700">{m[metricKey]} {metricLabel}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        // Individual leaderboard
        <View className="gap-2">
          <Text className="text-lg font-semibold text-gray-900 mb-1">Leaderboard</Text>
          {board.map(s => {
            const isMe = s.id === user.id
            return (
              <View
                key={s.id}
                className={`rounded-xl p-4 shadow-sm flex-row items-center gap-3 ${isMe ? 'bg-indigo-50 border-2 border-indigo-500' : 'bg-white'}`}
              >
                <Text className="text-2xl w-10 text-center">{medalFor(s.rank)}</Text>
                <View className="flex-1">
                  <Text className="font-medium text-gray-900">{s.name} {isMe && <Text className="text-indigo-500 text-xs">· you</Text>}</Text>
                  <Text className="text-xs text-gray-500">{s.instrument || '—'}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-lg font-bold text-indigo-500">{s[metricKey]}</Text>
                  <Text className="text-xs text-gray-500">{metricLabel}</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {isTeacher && (
        <TouchableOpacity onPress={handleDelete} className="bg-red-50 rounded-2xl p-3 items-center mt-4">
          <Text className="text-red-500 font-medium text-sm">Delete Challenge</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}
