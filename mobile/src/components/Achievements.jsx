import { View, Text, ScrollView } from 'react-native'
import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'

const ALL_BADGES = [
  { type: 'first_session', name: 'First Steps', icon: '🎵', description: 'Complete your first practice session' },
  { type: 'streak_3', name: 'On a Roll', icon: '🔥', description: 'Maintain a 3-day practice streak' },
  { type: 'streak_7', name: 'Week Warrior', icon: '⚡', description: 'Maintain a 7-day practice streak' },
  { type: 'streak_30', name: 'Unstoppable', icon: '🏆', description: 'Maintain a 30-day practice streak' },
  { type: 'marathon', name: 'Marathon', icon: '🏃', description: 'Complete a 60+ minute practice session' },
  { type: 'perfect_focus', name: 'Laser Focus', icon: '🎯', description: 'Rate your focus 5 stars in a session' },
  { type: 'early_bird', name: 'Early Bird', icon: '🌅', description: 'Practice before 8am' },
  { type: 'night_owl', name: 'Night Owl', icon: '🦉', description: 'Practice after 10pm' },
]

export default function Achievements() {
  const { user } = useApp()
  const [earnedBadges, setEarnedBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    api.getUserBadges(user.id)
      .then(badges => setEarnedBadges(badges.map(b => b.badge_type).filter(Boolean)))
      .catch(err => console.error('Failed to load badges:', err))
      .finally(() => setLoading(false))
  }, [user?.id])

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 gap-6">
      <View>
        <Text className="text-2xl font-bold text-gray-900">Achievements</Text>
        <Text className="text-gray-500">Earn badges and level up!</Text>
      </View>

      {/* XP System */}
      <View className="bg-white rounded-2xl p-4 shadow-sm gap-4">
        <Text className="text-lg font-semibold text-gray-900">💎 How XP Works</Text>
        <View className="flex-row items-start gap-3">
          <View className="w-8 h-8 bg-indigo-50 rounded-full items-center justify-center">
            <Text className="text-indigo-500 font-bold text-sm">1</Text>
          </View>
          <View>
            <Text className="font-medium text-gray-900">Base XP</Text>
            <Text className="text-gray-500 text-sm">1 XP per minute of practice</Text>
          </View>
        </View>
        <View className="flex-row items-start gap-3">
          <View className="w-8 h-8 bg-orange-50 rounded-full items-center justify-center">
            <Text>🔥</Text>
          </View>
          <View>
            <Text className="font-medium text-gray-900">Streak Bonus</Text>
            <Text className="text-gray-500 text-sm">3+ days: 1.2x · 7+ days: 1.5x · 30+ days: 2x</Text>
          </View>
        </View>
        <View className="flex-row items-start gap-3">
          <View className="w-8 h-8 bg-yellow-50 rounded-full items-center justify-center">
            <Text>⭐</Text>
          </View>
          <View>
            <Text className="font-medium text-gray-900">Focus Bonus</Text>
            <Text className="text-gray-500 text-sm">Rate focus 4-5 stars: +20% XP</Text>
          </View>
        </View>
        <View className="bg-gray-50 rounded-xl p-3">
          <Text className="text-xs text-gray-500 mb-1">Example:</Text>
          <Text className="text-sm text-gray-700">30 min + 7-day streak + high focus = <Text className="font-bold text-indigo-500">54 XP</Text></Text>
          <Text className="text-xs text-gray-400 mt-1">30 × 1.5 × 1.2 = 54</Text>
        </View>
      </View>

      {/* Levels */}
      <View className="bg-white rounded-2xl p-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-900 mb-2">⭐ Levels</Text>
        <Text className="text-sm text-gray-500 mb-4">Every <Text className="font-medium text-indigo-500">100 XP</Text> = 1 level up!</Text>
        <View className="flex-row flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 10, 15, 20, 25, 50].map(level => (
            <View
              key={level}
              className={`px-3 py-2 rounded-lg items-center ${
                (user?.level ?? 0) >= level ? 'bg-indigo-50' : 'bg-gray-100'
              }`}
              style={{ minWidth: 60 }}
            >
              <Text className={`font-bold text-sm ${(user?.level ?? 0) >= level ? 'text-indigo-500' : 'text-gray-400'}`}>
                Lv {level}
              </Text>
              <Text className={`text-xs ${(user?.level ?? 0) >= level ? 'text-indigo-400' : 'text-gray-400'}`}>
                {(level - 1) * 100} XP
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Badges */}
      <View>
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          🏅 Badges <Text className="text-sm font-normal text-gray-500">({earnedBadges.length}/{ALL_BADGES.length})</Text>
        </Text>
        {loading ? (
          <View className="bg-white rounded-2xl py-8 items-center">
            <Text className="text-gray-500">Loading...</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {ALL_BADGES.map(badge => {
              const earned = earnedBadges.includes(badge.type)
              return (
                <View
                  key={badge.type}
                  className={`bg-white rounded-2xl p-4 shadow-sm flex-row items-center gap-3 ${earned ? '' : 'opacity-50'}`}
                  style={{ width: '47%' }}
                >
                  <Text className="text-3xl">{badge.icon}</Text>
                  <View className="flex-1">
                    <Text className={`font-medium text-sm ${earned ? 'text-gray-900' : 'text-gray-500'}`}>{badge.name}</Text>
                    <Text className="text-xs text-gray-400">{badge.description}</Text>
                    {earned && <Text className="text-xs text-green-600 font-medium mt-1">✓ Earned!</Text>}
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
