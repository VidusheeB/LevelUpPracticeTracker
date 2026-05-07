import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native'
import { useState, useCallback } from 'react'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'

export default function AssignmentDetail() {
  const { setToast } = useApp()
  const navigation = useNavigation()
  const route = useRoute()
  const { assignment, ensemble } = route.params

  const [submissions, setSubmissions] = useState([])
  const [editing, setEditing] = useState(null)
  const [grade, setGrade] = useState(0)
  const [feedback, setFeedback] = useState('')

  const load = useCallback(async () => {
    const data = await db.getAssignmentSubmissions(assignment.id)
    setSubmissions(data)
  }, [assignment.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const openGrade = (sub) => {
    setEditing(sub)
    setGrade(sub.teacher_grade || 0)
    setFeedback(sub.teacher_feedback || '')
  }

  const saveGrade = async () => {
    try {
      await db.gradeSubmission(editing.id, grade || null, feedback || null)
      setToast('Grade saved', 'success')
      setEditing(null)
      await load()
    } catch (err) {
      setToast(err.message, 'error')
    }
  }

  const handleDelete = () => {
    Alert.alert('Delete Assignment', `Permanently delete "${assignment.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await db.deleteAssignment(assignment.id)
        navigation.goBack()
      }},
    ])
  }

  const sorted = [...submissions].sort((a, b) => (b.readiness_score ?? 0) - (a.readiness_score ?? 0))

  const StatusBadge = ({ status }) => {
    const colors = {
      ready: 'bg-green-50 text-green-600',
      in_progress: 'bg-amber-50 text-amber-600',
      not_started: 'bg-gray-100 text-gray-500',
    }
    const labels = { ready: 'Ready', in_progress: 'In Progress', not_started: 'Not Started' }
    return (
      <View className={`px-2 py-0.5 rounded-md ${colors[status]?.split(' ')[0]}`}>
        <Text className={`text-xs ${colors[status]?.split(' ')[1]}`}>{labels[status]}</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 gap-4">
      <View className="bg-white rounded-2xl p-5 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900">📚 {assignment.title}</Text>
        {!!assignment.description && (
          <Text className="text-gray-600 mt-2">{assignment.description}</Text>
        )}
        <View className="flex-row items-center gap-2 mt-3">
          <Text className="text-xs text-gray-500">{ensemble.name}</Text>
          {assignment.due_date && (
            <Text className="text-xs text-gray-500">
              · Due {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
      </View>

      <View>
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Student Progress ({submissions.length})
        </Text>
        {submissions.length === 0 ? (
          <View className="bg-white rounded-2xl py-8 items-center">
            <Text className="text-gray-500">No students yet</Text>
          </View>
        ) : (
          <View className="gap-2">
            {sorted.map(sub => (
              <TouchableOpacity
                key={sub.id}
                onPress={() => openGrade(sub)}
                className="bg-white rounded-xl p-4 shadow-sm gap-2"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium text-gray-900">{sub.student?.name}</Text>
                  <StatusBadge status={sub.status} />
                </View>
                <View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-gray-500">Readiness</Text>
                    <Text className="text-xs text-gray-700 font-medium">{sub.readiness_score}%</Text>
                  </View>
                  <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className={`h-1.5 rounded-full ${sub.readiness_score >= 80 ? 'bg-green-500' : sub.readiness_score >= 40 ? 'bg-amber-400' : 'bg-gray-300'}`}
                      style={{ width: `${sub.readiness_score}%` }}
                    />
                  </View>
                </View>
                <View className="flex-row items-center justify-between pt-1">
                  <Text className="text-xs text-gray-500">{sub.total_time_practiced} min practiced</Text>
                  {sub.teacher_grade ? (
                    <Text className="text-xs text-amber-500">{'⭐'.repeat(sub.teacher_grade)}</Text>
                  ) : (
                    <Text className="text-xs text-indigo-500">Tap to grade</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity onPress={handleDelete} className="bg-red-50 rounded-2xl p-3 items-center">
        <Text className="text-red-500 font-medium text-sm">Delete Assignment</Text>
      </TouchableOpacity>

      {/* Grade modal */}
      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <ScrollView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <View>
              <Text className="font-semibold text-lg">Grade {editing?.student?.name}</Text>
              <Text className="text-xs text-gray-500">{editing?.readiness_score}% ready · {editing?.total_time_practiced} min</Text>
            </View>
            <TouchableOpacity onPress={() => setEditing(null)} className="p-2">
              <Text className="text-gray-400 text-lg">✕</Text>
            </TouchableOpacity>
          </View>

          <View className="px-4 py-6 gap-5">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Performance Grade</Text>
              <View className="flex-row gap-2 justify-center">
                {[1,2,3,4,5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setGrade(star)} className="p-2">
                    <Text style={{ fontSize: 38 }}>{star <= grade ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-xs text-gray-500 text-center mt-1">
                {grade === 0 ? 'Tap a star' : `${grade}/5`}
              </Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Feedback (optional)</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3"
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Great intonation! Work on the bridge..."
                multiline
                numberOfLines={4}
                style={{ minHeight: 100, textAlignVertical: 'top' }}
              />
            </View>

            <TouchableOpacity onPress={saveGrade} className="bg-indigo-500 rounded-xl py-3 items-center">
              <Text className="text-white font-semibold">Save Grade</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </ScrollView>
  )
}
