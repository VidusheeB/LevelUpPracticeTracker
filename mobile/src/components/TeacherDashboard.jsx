import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native'
import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'

export default function TeacherDashboard() {
  const { user, setToast } = useApp()

  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentSummary, setStudentSummary] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingNote, setSendingNote] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.getTeacherStudents(user.id)
        setStudents(data)
      } catch (error) {
        console.error('Failed to load students:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const selectStudent = async (student) => {
    setSelectedStudent(student)
    setStudentSummary(null)
    setActivityLog([])
    setNotes([])
    try {
      const [summary, activity, conversation] = await Promise.all([
        api.getStudentSummary(user.id, student.id),
        api.getStudentActivityLog(user.id, student.id),
        api.getNotesConversation(user.id, student.id),
      ])
      setStudentSummary(summary)
      setActivityLog(activity)
      setNotes([...conversation].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      await api.markAllNotesRead(user.id, student.id)
    } catch (error) {
      console.error('Failed to load student details:', error)
    }
  }

  const handleSendNote = async () => {
    if (!newNote.trim() || !selectedStudent) return
    setSendingNote(true)
    try {
      const note = await api.sendNote(user.id, selectedStudent.id, newNote.trim())
      setNotes([...notes, note])
      setNewNote('')
      setToast('Note sent!', 'success')
    } catch (error) {
      setToast(error.message, 'error')
    } finally {
      setSendingNote(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 gap-6">
      <View>
        <Text className="text-2xl font-bold text-gray-900">Teacher Dashboard</Text>
        <Text className="text-gray-500">Manage your students</Text>
      </View>

      {/* Teacher Code */}
      <View className="bg-blue-50 rounded-2xl p-4 flex-row items-center gap-4">
        <Text className="text-4xl">👩‍🏫</Text>
        <View className="flex-1">
          <Text className="text-sm text-gray-600">Your Teacher Code</Text>
          <Text className="text-3xl font-mono font-bold text-indigo-500 tracking-widest">
            {user?.teacher_code || '------'}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">Share with students to connect</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            // Clipboard.setStringAsync(user?.teacher_code || '')
            setToast('Code copied!', 'success')
          }}
          className="bg-white px-3 py-2 rounded-lg shadow-sm"
        >
          <Text className="font-medium text-gray-700">Copy</Text>
        </TouchableOpacity>
      </View>

      {/* Students List */}
      <View>
        <Text className="text-lg font-semibold text-gray-900 mb-3">Your Students ({students.length})</Text>
        {loading ? (
          <View className="bg-white rounded-2xl py-8 items-center">
            <Text className="text-gray-500">Loading students...</Text>
          </View>
        ) : students.length === 0 ? (
          <View className="bg-white rounded-2xl py-8 items-center">
            <Text className="text-4xl mb-2">📚</Text>
            <Text className="text-gray-500">No students yet</Text>
            <Text className="text-sm text-gray-400 mt-1">Share your teacher code to connect</Text>
          </View>
        ) : (
          <View className="gap-3">
            {students.map(student => (
              <TouchableOpacity
                key={student.id}
                onPress={() => selectStudent(student)}
                className={`bg-white rounded-2xl p-4 shadow-sm flex-row items-center gap-4 ${
                  selectedStudent?.id === student.id ? 'border-2 border-indigo-500' : ''
                }`}
              >
                <View className="w-12 h-12 bg-indigo-50 rounded-full items-center justify-center">
                  <Text className="text-xl">{student.name?.charAt(0) || '?'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-900">{student.name}</Text>
                  <Text className="text-sm text-gray-500">{student.instrument || 'No instrument set'}</Text>
                </View>
                {student.streak_count > 0 && (
                  <Text className="text-sm text-orange-500">🔥 {student.streak_count}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Student Detail Modal */}
      <Modal
        visible={!!selectedStudent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedStudent(null)}
      >
        <View className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <View>
              <Text className="font-semibold text-lg">{selectedStudent?.name}</Text>
              <Text className="text-sm text-gray-500">{selectedStudent?.instrument}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedStudent(null)} className="p-2">
              <Text className="text-gray-400 text-lg">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1">
            {/* Stats */}
            {studentSummary && (
              <View className="px-4 py-4 bg-gray-50 flex-row justify-around">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-indigo-500">{studentSummary.weekly_minutes}</Text>
                  <Text className="text-xs text-gray-500">min this week</Text>
                </View>
                <View className="items-center">
                  <Text className="text-2xl font-bold text-orange-500">{studentSummary.streak_count}</Text>
                  <Text className="text-xs text-gray-500">day streak</Text>
                </View>
                <View className="items-center">
                  <Text className="text-2xl font-bold text-green-500">{studentSummary.total_sessions_this_week}</Text>
                  <Text className="text-xs text-gray-500">sessions</Text>
                </View>
              </View>
            )}

            {/* Activity Log */}
            <View className="px-4 py-4">
              <Text className="font-medium text-gray-900 mb-3">Recent Activity</Text>
              {activityLog.length === 0 ? (
                <Text className="text-sm text-gray-500 text-center py-4">No practice sessions yet</Text>
              ) : (
                <View className="gap-2">
                  {activityLog.slice(0, 5).map(session => (
                    <View key={session.id} className="flex-row items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <Text className="text-lg">🎵</Text>
                      <View className="flex-1">
                        <Text className="text-sm font-medium">{session.duration_minutes} min practice</Text>
                        <Text className="text-xs text-gray-500">
                          {new Date(session.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      {session.focus_rating && (
                        <Text className="text-sm">{'⭐'.repeat(session.focus_rating)}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Notes */}
            <View className="px-4 py-4 border-t border-gray-100">
              <Text className="font-medium text-gray-900 mb-3">Notes</Text>
              <ScrollView className="max-h-40 mb-4">
                {notes.length === 0 ? (
                  <Text className="text-sm text-gray-500 text-center py-2">No notes yet</Text>
                ) : (
                  <View className="gap-2">
                    {notes.map(note => (
                      <View
                        key={note.id}
                        className={`p-2 rounded-lg text-sm ${
                          note.sender_id === user.id ? 'bg-indigo-50 ml-8' : 'bg-gray-100 mr-8'
                        }`}
                      >
                        <Text className="text-gray-900">{note.content}</Text>
                        <Text className="text-xs text-gray-400 mt-1 opacity-60">
                          {new Date(note.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3"
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="Write a note..."
                  onSubmitEditing={handleSendNote}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  onPress={handleSendNote}
                  disabled={sendingNote || !newNote.trim()}
                  className={`px-4 py-3 rounded-xl ${sendingNote || !newNote.trim() ? 'bg-indigo-300' : 'bg-indigo-500'}`}
                >
                  <Text className="text-white">{sendingNote ? '...' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  )
}
