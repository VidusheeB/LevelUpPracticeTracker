import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { useState } from 'react'
import { parseTask } from '../utils/ai'

const CATEGORIES = [
  { value: 'repertoire', label: 'Repertoire', icon: '🎵' },
  { value: 'technique', label: 'Technique', icon: '🎯' },
  { value: 'sight_reading', label: 'Sight Reading', icon: '👀' },
  { value: 'section_work', label: 'Section Work', icon: '👥' },
]

const EXAMPLES = [
  'Finish Autumn Leaves solo section by Wednesday, 30 min',
  'Work on major scales, 3 octaves — 20 min today',
  'Sight read the new chart for jazz band, this week',
  'Lock in the melody of Blue Bossa, 45 min by Friday',
]

export default function SmartTaskCreate({ visible, onClose, onSave }) {
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)

  const reset = () => {
    setInput('')
    setParsed(null)
    setError(null)
    setParsing(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleParse = async () => {
    if (!input.trim()) return
    setParsing(true)
    setError(null)
    setParsed(null)
    try {
      const result = await parseTask(input.trim())
      setParsed(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }

  const handleSave = () => {
    if (!parsed?.title?.trim()) return
    onSave({
      title: parsed.title,
      category: parsed.category || 'repertoire',
      difficulty: parsed.difficulty || 3,
      estimated_minutes: parsed.estimated_minutes || 30,
      due_date: parsed.due_date || null,
    })
    handleClose()
  }

  const formatDueDate = (ds) => {
    if (!ds) return null
    return new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-white">

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
          <View>
            <Text className="font-bold text-lg text-gray-900">✨ Smart Task</Text>
            <Text className="text-xs text-gray-400">AI-powered task creation</Text>
          </View>
          <TouchableOpacity onPress={handleClose} className="p-2">
            <Text className="text-gray-400 text-lg">✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">

          {/* Input */}
          <View className="bg-indigo-50 rounded-2xl p-4 mb-4">
            <Text className="text-sm font-medium text-indigo-700 mb-2">
              Describe your practice task naturally
            </Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 text-gray-900 text-base"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              value={input}
              onChangeText={setInput}
              placeholder="e.g. Finish Autumn Leaves solo by Wednesday, about 30 min"
              multiline
              autoFocus
            />
            <View className="flex-row items-center gap-1 mt-2">
              <Text className="text-xs text-indigo-500">🎤</Text>
              <Text className="text-xs text-indigo-400">Tap the mic on your keyboard to speak</Text>
            </View>
          </View>

          {/* Examples */}
          {!parsed && !parsing && (
            <View className="mb-4">
              <Text className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Examples</Text>
              <View className="gap-2">
                {EXAMPLES.map((ex, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setInput(ex)}
                    className="bg-gray-50 rounded-xl px-4 py-2.5 flex-row items-center gap-2"
                  >
                    <Text className="text-xs text-gray-500 flex-1">{ex}</Text>
                    <Text className="text-xs text-gray-300">↑</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Error */}
          {error && (
            <View className="bg-red-50 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
              {error.includes('API key') && (
                <Text className="text-red-400 text-xs mt-1">
                  Open mobile/src/utils/ai.js and paste your key at the top
                </Text>
              )}
            </View>
          )}

          {/* Parsed preview */}
          {parsed && (
            <View className="bg-white border border-indigo-100 rounded-2xl p-4 mb-4 gap-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">✨</Text>
                <Text className="font-semibold text-gray-900">AI Parsed — looks good?</Text>
              </View>

              {/* Title */}
              <View>
                <Text className="text-xs font-medium text-gray-400 mb-1">TITLE</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 font-medium"
                  value={parsed.title}
                  onChangeText={v => setParsed(p => ({ ...p, title: v }))}
                />
              </View>

              {/* Category */}
              <View>
                <Text className="text-xs font-medium text-gray-400 mb-2">CATEGORY</Text>
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => setParsed(p => ({ ...p, category: cat.value }))}
                      className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border ${parsed.category === cat.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                    >
                      <Text>{cat.icon}</Text>
                      <Text className={`text-sm ${parsed.category === cat.value ? 'text-indigo-700 font-medium' : 'text-gray-600'}`}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time + Difficulty row */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-400 mb-1">EST. MINUTES</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-center font-semibold"
                    value={String(parsed.estimated_minutes || 30)}
                    onChangeText={v => setParsed(p => ({ ...p, estimated_minutes: parseInt(v) || 30 }))}
                    keyboardType="number-pad"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-400 mb-1">DIFFICULTY</Text>
                  <View className="flex-row border border-gray-200 rounded-xl px-2 py-2 justify-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <TouchableOpacity key={n} onPress={() => setParsed(p => ({ ...p, difficulty: n }))}>
                        <Text className={n <= (parsed.difficulty || 3) ? 'text-amber-400 text-xl' : 'text-gray-200 text-xl'}>★</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Due date */}
              {parsed.due_date && (
                <View className="bg-orange-50 rounded-xl px-4 py-2.5 flex-row items-center gap-2">
                  <Text>📅</Text>
                  <Text className="text-orange-700 font-medium text-sm">Due {formatDueDate(parsed.due_date)}</Text>
                  <TouchableOpacity onPress={() => setParsed(p => ({ ...p, due_date: null }))} className="ml-auto">
                    <Text className="text-orange-300 text-xs">Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Actions */}
          <View className="gap-3 pb-8">
            {!parsed ? (
              <TouchableOpacity
                onPress={handleParse}
                disabled={parsing || !input.trim()}
                className={`py-4 rounded-2xl items-center flex-row justify-center gap-2 ${parsing || !input.trim() ? 'bg-indigo-300' : 'bg-indigo-500'}`}
              >
                {parsing
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text className="text-xl">✨</Text>
                }
                <Text className="text-white font-semibold text-base">
                  {parsing ? 'Parsing...' : 'Parse with AI'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleSave}
                  className="py-4 rounded-2xl bg-indigo-500 items-center"
                >
                  <Text className="text-white font-semibold text-base">Save Task</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setParsed(null); setError(null) }}
                  className="py-3 rounded-2xl bg-gray-100 items-center"
                >
                  <Text className="text-gray-600 font-medium">Edit Input</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}
