import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { useState } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'

export default function AssignmentCreate() {
  const { createAssignment, setToast } = useApp()
  const navigation = useNavigation()
  const route = useRoute()
  const { ensemble } = route.params

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) { setToast('Title is required', 'error'); return }
    setSubmitting(true)
    try {
      await createAssignment({
        ensemble_id: ensemble.id,
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate || null,
      })
      navigation.goBack()
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 gap-4">
      <View>
        <Text className="text-2xl font-bold text-gray-900">New Assignment</Text>
        <Text className="text-gray-500">For {ensemble.name}</Text>
      </View>

      <View className="bg-white rounded-2xl p-4 shadow-sm gap-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Title</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Autumn Leaves – bars 32-48"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Description (optional)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3"
            value={description}
            onChangeText={setDescription}
            placeholder="Focus on intonation and dynamics"
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Due Date</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3"
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
          <Text className="text-xs text-gray-400 mt-1">
            A practice task will appear in each student's task list automatically.
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !title.trim()}
          className={`flex-1 py-3 rounded-xl items-center ${submitting || !title.trim() ? 'bg-indigo-300' : 'bg-indigo-500'}`}
        >
          <Text className="text-white font-semibold">{submitting ? 'Creating...' : 'Create Assignment'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} className="px-5 py-3 bg-gray-100 rounded-xl">
          <Text className="text-gray-700">Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
