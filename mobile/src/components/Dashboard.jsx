import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'
import TaskCard from './TaskCard'

export default function Dashboard() {
  const navigation = useNavigation()
  const { user, stats, tasks, logout, setToast, loadUserData } = useApp()

  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)

  const handleEditGoal = () => {
    setEditingGoal(stats?.weekly_goal_minutes || 0)
    setShowGoalEditor(true)
  }

  const handleSaveGoal = async () => {
    const goalValue = parseInt(editingGoal, 10)
    if (isNaN(goalValue) || goalValue < 0) {
      setToast('Please enter a valid number', 'error')
      return
    }
    try {
      await api.updateUser(user.id, { weekly_goal_minutes: goalValue })
      setToast('Weekly goal updated! 🎯', 'success')
      setShowGoalEditor(false)
      await loadUserData(user.id)
    } catch (error) {
      setToast(error.message || 'Failed to update goal', 'error')
    }
  }

  const activeTasks = tasks.filter(t => t.status !== 'ready').slice(0, 4)
  const progressPercent = Math.min(stats?.weekly_progress_percent ?? 0, 100)

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 space-y-6">

      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">
            Hey, {user?.name?.split(' ')[0] || 'there'}!
          </Text>
          <Text className="text-gray-500">Ready to practice?</Text>
        </View>
        {stats && stats.streak_count > 0 && (
          <View className="flex-row items-center gap-2 bg-orange-100 px-4 py-2 rounded-full">
            <Text className="text-2xl">🔥</Text>
            <Text className="font-bold text-orange-600">{stats.streak_count}</Text>
          </View>
        )}
        <TouchableOpacity onPress={logout} className="p-2">
          <Text className="text-2xl">⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Goal Editor Modal */}
      {showGoalEditor && (
        <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center p-4" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <View className="bg-white rounded-3xl w-full max-w-sm p-6">
            <Text className="text-xl font-bold mb-2">Set Your Weekly Goal</Text>
            <Text className="text-gray-600 text-sm mb-6">How many minutes per week?</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-center text-3xl font-bold mb-4"
              value={String(editingGoal ?? 0)}
              onChangeText={v => setEditingGoal(Math.max(0, parseInt(v) || 0))}
              keyboardType="number-pad"
              autoFocus
            />
            <View className="grid grid-cols-2 gap-2 mb-6 flex-row flex-wrap">
              {[60, 180, 300, 600].map(v => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setEditingGoal(v)}
                  className="flex-1 py-2 px-3 bg-gray-100 rounded-lg items-center m-1"
                >
                  <Text className="text-sm">{v / 60}h</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setShowGoalEditor(false)} className="flex-1 py-3 bg-gray-100 rounded-xl items-center">
                <Text className="font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveGoal} className="flex-1 py-3 bg-indigo-500 rounded-xl items-center">
                <Text className="font-semibold text-white">Save Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Weekly Progress */}
      {stats && (
        <TouchableOpacity
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          onPress={handleEditGoal}
        >
          <View className="flex-row items-center gap-6">
            {/* Progress Circle via border trick */}
            <View className="w-24 h-24 items-center justify-center">
              <View className="w-24 h-24 rounded-full border-8 border-gray-200 items-center justify-center absolute" />
              <View className="w-24 h-24 rounded-full items-center justify-center">
                <Text className="text-xl font-bold text-indigo-500">{Math.round(progressPercent)}%</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">Weekly Goal</Text>
              <Text className="text-gray-500">{stats.weekly_minutes} / {stats.weekly_goal_minutes || 0} min</Text>
              <Text className="text-xs text-gray-400 mt-1">Tap to edit</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Achievements')}
                className="mt-2 flex-row items-center gap-4"
              >
                <Text className="text-sm text-indigo-500">⭐ Level {stats.level}</Text>
                <Text className="text-sm text-amber-500">💎 {stats.total_points} XP</Text>
                <Text className="text-gray-400 text-xs">→</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text className="mt-4 text-sm text-center text-gray-500 italic">
            {stats.weekly_goal_minutes === 0
              ? '🎯 Set a weekly goal to get started!'
              : progressPercent >= 100 ? '🎉 Goal crushed! You\'re on fire!'
              : progressPercent >= 50 ? '💪 Halfway there! Keep it up!'
              : '🎵 Every minute counts. Let\'s practice!'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Today's Tasks */}
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-gray-900">Today's Practice</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
            <Text className="text-sm text-indigo-500 font-medium">View All →</Text>
          </TouchableOpacity>
        </View>

        {activeTasks.length > 0 ? (
          <View className="gap-3">
            {activeTasks.map(task => (
              <TaskCard key={task.id} task={task} rehearsal={null} />
            ))}
          </View>
        ) : (
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
            <Text className="text-4xl mb-2">🎉</Text>
            <Text className="text-gray-500">All tasks ready! Great work!</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tasks')} className="mt-4 px-4 py-2 bg-gray-100 rounded-xl">
              <Text className="font-medium text-gray-700">Add New Task</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Start Practice CTA */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Practice')}
        className="bg-indigo-500 rounded-2xl py-4 items-center flex-row justify-center gap-2"
      >
        <Text className="text-white text-xl">▶</Text>
        <Text className="text-white font-semibold text-lg">Start Practice Session</Text>
      </TouchableOpacity>

      {/* Mascot */}
      <View className="items-center py-4">
        <View className="flex-row items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
          <Text className="text-xl">🎵</Text>
          <Text className="text-sm text-gray-600 italic">
            {(stats?.streak_count ?? 0) >= 7 ? "Incredible streak! You're unstoppable!"
              : (stats?.streak_count ?? 0) >= 3 ? 'Nice streak going! Keep the rhythm!'
              : "Don't miss a beat - practice today!"}
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}
