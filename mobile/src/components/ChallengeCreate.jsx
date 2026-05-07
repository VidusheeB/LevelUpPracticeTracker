import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'

export default function ChallengeCreate() {
  const { user, createChallenge, setToast } = useApp()
  const navigation = useNavigation()
  const route = useRoute()
  const presetEnsemble = route.params?.ensemble

  const [allEnsembles, setAllEnsembles] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set(presetEnsemble ? [presetEnsemble.id] : []))
  const [title, setTitle] = useState('')
  const [type, setType] = useState('xp_sprint')
  const [targetMinutes, setTargetMinutes] = useState('300')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    db.getTeacherEnsembles(user.id).then(data => setAllEnsembles(data.filter(e => !e.archived)))
  }, [user.id])

  const toggleEnsemble = (id) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setToast('Title is required', 'error'); return }
    if (selectedIds.size === 0) { setToast('Select at least one class', 'error'); return }
    if (!startDate || !endDate) { setToast('Set start and end dates', 'error'); return }
    if (new Date(endDate) <= new Date(startDate)) { setToast('End date must be after start', 'error'); return }

    setSubmitting(true)
    try {
      await createChallenge({
        title: title.trim(),
        type,
        target_minutes: type === 'practice_goal' ? parseInt(targetMinutes) || 0 : null,
        start_date: new Date(startDate + 'T00:00:00').toISOString(),
        end_date: new Date(endDate + 'T23:59:59').toISOString(),
      }, [...selectedIds])
      navigation.goBack()
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isClassVsClass = selectedIds.size > 1

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 gap-4">
      <View>
        <Text className="text-2xl font-bold text-gray-900">New Challenge</Text>
        <Text className="text-gray-500">Motivate your students with a sprint</Text>
      </View>

      <View className="bg-white rounded-2xl p-4 shadow-sm gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Title</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Concert Week Sprint"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-2">Challenge Type</Text>
          <View className="gap-2">
            <TouchableOpacity
              onPress={() => setType('xp_sprint')}
              className={`p-3 rounded-xl border-2 ${type === 'xp_sprint' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
            >
              <Text className="font-medium text-gray-900">⚡ XP Sprint</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Whoever earns the most XP wins. Streak + focus bonuses make it strategic.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setType('practice_goal')}
              className={`p-3 rounded-xl border-2 ${type === 'practice_goal' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
            >
              <Text className="font-medium text-gray-900">🎯 Practice Goal</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Hit a target minutes goal by the end date.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {type === 'practice_goal' && (
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Target (minutes)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3"
              value={targetMinutes}
              onChangeText={setTargetMinutes}
              keyboardType="number-pad"
              placeholder="300"
            />
          </View>
        )}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1">Starts</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-1">Ends</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      </View>

      <View className="bg-white rounded-2xl p-4 shadow-sm gap-3">
        <View>
          <Text className="font-semibold text-gray-900">Classes</Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {isClassVsClass
              ? `Class vs class — ranked by avg ${type === 'xp_sprint' ? 'XP' : 'minutes'} per member`
              : 'Individual leaderboard within the class'}
          </Text>
        </View>
        {allEnsembles.length === 0 ? (
          <Text className="text-sm text-gray-500">Create a class first.</Text>
        ) : (
          <View className="gap-2">
            {allEnsembles.map(e => (
              <TouchableOpacity
                key={e.id}
                onPress={() => toggleEnsemble(e.id)}
                className={`p-3 rounded-xl border-2 flex-row items-center justify-between ${
                  selectedIds.has(e.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
              >
                <Text className="font-medium text-gray-900">{e.name}</Text>
                <Text className={selectedIds.has(e.id) ? 'text-indigo-500' : 'text-gray-300'}>
                  {selectedIds.has(e.id) ? '✓' : '○'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !title.trim() || selectedIds.size === 0}
          className={`flex-1 py-3 rounded-xl items-center ${submitting || !title.trim() || selectedIds.size === 0 ? 'bg-indigo-300' : 'bg-indigo-500'}`}
        >
          <Text className="text-white font-semibold">{submitting ? 'Starting...' : 'Start Challenge'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} className="px-5 py-3 bg-gray-100 rounded-xl">
          <Text className="text-gray-700">Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
