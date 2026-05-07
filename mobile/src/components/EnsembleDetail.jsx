import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'

export default function EnsembleDetail() {
  const { user, setToast } = useApp()
  const navigation = useNavigation()
  const route = useRoute()
  const { ensemble } = route.params

  const [members, setMembers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [challenges, setChallenges] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [showAddMember, setShowAddMember] = useState(false)

  const load = useCallback(async () => {
    const [membersData, assignmentsData, challengesData, studentsData] = await Promise.all([
      db.getEnsembleMembers(ensemble.id),
      db.getEnsembleAssignments(ensemble.id),
      db.getTeacherChallenges(user.id),
      db.getTeacherStudents(user.id),
    ])
    setMembers(membersData)
    setAssignments(assignmentsData)
    setChallenges(challengesData.filter(c =>
      c.challenge_ensembles?.some(ce => ce.ensemble_id === ensemble.id)
    ))
    setAllStudents(studentsData)
  }, [ensemble.id, user.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const memberIds = new Set(members.map(m => m.id))
  const availableStudents = allStudents.filter(s => !memberIds.has(s.id))

  const handleAddMember = async (studentId) => {
    try {
      await db.addMemberToEnsemble(ensemble.id, studentId)
      setToast('Student added', 'success')
      await load()
    } catch (err) {
      setToast(err.message, 'error')
    }
  }

  const handleRemoveMember = (member) => {
    Alert.alert(
      'Remove Student',
      `Remove ${member.name} from ${ensemble.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          await db.removeMemberFromEnsemble(ensemble.id, member.id)
          await load()
        }},
      ]
    )
  }

  const today = new Date()
  const activeChallenges = challenges.filter(c => new Date(c.end_date) >= today)
  const pastChallenges = challenges.filter(c => new Date(c.end_date) < today)

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24 gap-5">
      {/* Header */}
      <View className="bg-white rounded-2xl p-5 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900">{ensemble.name}</Text>
        {!!ensemble.description && (
          <Text className="text-gray-500 mt-1">{ensemble.description}</Text>
        )}
        <Text className="text-sm text-gray-400 mt-2">{members.length} student{members.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Members */}
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-gray-900">Students</Text>
          <TouchableOpacity
            onPress={() => setShowAddMember(true)}
            className="bg-indigo-500 px-3 py-1.5 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">+ Add</Text>
          </TouchableOpacity>
        </View>
        {members.length === 0 ? (
          <View className="bg-white rounded-2xl py-8 items-center">
            <Text className="text-gray-500">No students yet</Text>
            <Text className="text-xs text-gray-400 mt-1">Add students from your roster</Text>
          </View>
        ) : (
          <View className="gap-2">
            {members.map(m => (
              <View key={m.id} className="bg-white rounded-xl p-3 shadow-sm flex-row items-center gap-3">
                <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center">
                  <Text className="text-base font-medium">{m.name?.charAt(0) || '?'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-900">{m.name}</Text>
                  <Text className="text-xs text-gray-500">{m.instrument || '—'}</Text>
                </View>
                {m.streak_count > 0 && (
                  <Text className="text-xs text-orange-500 mr-2">🔥 {m.streak_count}</Text>
                )}
                <TouchableOpacity onPress={() => handleRemoveMember(m)} className="p-2">
                  <Text className="text-red-400">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Assignments */}
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-gray-900">Assignments</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AssignmentCreate', { ensemble })}
            className="bg-indigo-500 px-3 py-1.5 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">+ New</Text>
          </TouchableOpacity>
        </View>
        {assignments.length === 0 ? (
          <View className="bg-white rounded-2xl py-8 items-center">
            <Text className="text-gray-500">No assignments yet</Text>
          </View>
        ) : (
          <View className="gap-2">
            {assignments.map(a => (
              <TouchableOpacity
                key={a.id}
                onPress={() => navigation.navigate('AssignmentDetail', { assignment: a, ensemble })}
                className="bg-white rounded-xl p-4 shadow-sm flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-900">📚 {a.title}</Text>
                  {a.due_date && (
                    <Text className="text-xs text-gray-500 mt-1">
                      Due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>
                <Text className="text-gray-400">›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Challenges */}
      <View>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-gray-900">Challenges</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChallengeCreate', { ensemble })}
            className="bg-indigo-500 px-3 py-1.5 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">+ New</Text>
          </TouchableOpacity>
        </View>
        {activeChallenges.length === 0 && pastChallenges.length === 0 ? (
          <View className="bg-white rounded-2xl py-8 items-center">
            <Text className="text-gray-500">No challenges yet</Text>
            <Text className="text-xs text-gray-400 mt-1">Start a sprint to motivate your class</Text>
          </View>
        ) : (
          <View className="gap-2">
            {activeChallenges.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => navigation.navigate('ChallengeLeaderboard', { challenge: c })}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900">
                      {c.type === 'xp_sprint' ? '⚡' : '🎯'} {c.title}
                    </Text>
                    <Text className="text-xs text-green-600 mt-1">
                      Active · ends {new Date(c.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text className="text-gray-400">›</Text>
                </View>
              </TouchableOpacity>
            ))}
            {pastChallenges.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => navigation.navigate('ChallengeLeaderboard', { challenge: c })}
                className="bg-white rounded-xl p-4 shadow-sm opacity-60"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-medium text-gray-700">
                      {c.type === 'xp_sprint' ? '⚡' : '🎯'} {c.title}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      Ended {new Date(c.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text className="text-gray-400">›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Add member modal */}
      <Modal
        visible={showAddMember}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddMember(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="font-semibold text-lg">Add Students</Text>
            <TouchableOpacity onPress={() => setShowAddMember(false)} className="p-2">
              <Text className="text-gray-400 text-lg">✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-4 py-4">
            {availableStudents.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-gray-500">No students available</Text>
                <Text className="text-xs text-gray-400 mt-1">
                  Students need to join with your teacher code first
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {availableStudents.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => handleAddMember(s.id)}
                    className="bg-gray-50 rounded-xl p-3 flex-row items-center gap-3"
                  >
                    <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center">
                      <Text>{s.name?.charAt(0) || '?'}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900">{s.name}</Text>
                      <Text className="text-xs text-gray-500">{s.instrument || '—'}</Text>
                    </View>
                    <Text className="text-indigo-500 font-medium">+ Add</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  )
}
