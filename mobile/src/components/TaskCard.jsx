import { View, Text, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'

const categoryIcons = {
  repertoire: '🎵',
  technique: '🎯',
  sight_reading: '👀',
  section_work: '👥',
}

export default function TaskCard({ task, rehearsal, showActions = true }) {
  const navigation = useNavigation()
  const readiness = task.readiness_score ?? 0

  const getReadinessColor = (score) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 50) return 'bg-amber-400'
    return 'bg-red-500'
  }

  const getReadinessText = (score) => {
    if (score >= 80) return 'Ready!'
    if (score >= 50) return 'Getting there'
    return 'Needs work'
  }

  const rehearsalDate = rehearsal?.date ? new Date(rehearsal.date) : null
  const daysUntil = (rehearsalDate && !isNaN(rehearsalDate.getTime()))
    ? Math.ceil((rehearsalDate - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
      onPress={() => navigation.navigate('TaskDetail', { task })}
    >
      <View className="flex-row items-start gap-3">
        <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center">
          <Text className="text-lg">{categoryIcons[task.category] || '🎵'}</Text>
        </View>

        <View className="flex-1 min-w-0">
          <Text className="font-semibold text-gray-900" numberOfLines={1}>{task.title}</Text>

          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-gray-500 text-sm">{Math.round(readiness)}% ready</Text>
              <Text className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                readiness >= 80 ? 'bg-green-100 text-green-700' :
                readiness >= 50 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-600'
              }`}>
                {getReadinessText(readiness)}
              </Text>
            </View>
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <View
                className={`h-full ${getReadinessColor(readiness)} rounded-full`}
                style={{ width: `${Math.min(readiness, 100)}%` }}
              />
            </View>
          </View>

          <View className="mt-2 flex-row items-center gap-3">
            <Text className="text-gray-500 text-xs">⏱ {task.total_time_practiced}/{task.estimated_minutes} min</Text>
            <Text className="text-xs">
              {[...Array(5)].map((_, i) => (
                <Text key={i} className={i < task.difficulty ? 'text-amber-400' : 'text-gray-300'}>★</Text>
              ))}
            </Text>
          </View>

          {rehearsal && daysUntil !== null && (
            <Text className={`mt-2 text-xs ${
              daysUntil <= 1 ? 'text-red-500 font-medium' :
              daysUntil <= 3 ? 'text-amber-600' : 'text-gray-500'
            }`}>
              📅 {daysUntil === 0 ? 'Rehearsal TODAY' :
                  daysUntil === 1 ? 'Rehearsal tomorrow' :
                  `Rehearsal in ${daysUntil} days`}
            </Text>
          )}
        </View>

        {showActions && (
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-indigo-500 items-center justify-center shadow"
            onPress={() => navigation.navigate('Main', {
              screen: 'Practice',
              params: { selectedTask: task.id },
            })}
          >
            <Text className="text-white">▶</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}
