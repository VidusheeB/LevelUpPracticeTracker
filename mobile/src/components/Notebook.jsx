import { View, Text, ScrollView, FlatList, TouchableOpacity, TextInput, Switch, Modal, ActivityIndicator } from 'react-native'
import { useState, useCallback } from 'react'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'
import { getNotebookTableOfContents } from '../utils/ai'

const TAG_COLORS = {
  reflection:    { bg: '#f0fdf4', text: '#16a34a', label: 'Reflection' },
  lesson_note:   { bg: '#eff6ff', text: '#2563eb', label: 'Lesson Note' },
  music_writing: { bg: '#fdf4ff', text: '#9333ea', label: 'Music Writing' },
  technique:     { bg: '#fff7ed', text: '#ea580c', label: 'Technique' },
  repertoire:    { bg: '#f0f9ff', text: '#0284c7', label: 'Repertoire' },
  general:       { bg: '#f9fafb', text: '#6b7280', label: 'General' },
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const diffDays = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Notebook() {
  const navigation = useNavigation()
  const { user, updateProfile, setToast } = useApp()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [aiReadEnabled, setAIReadEnabled] = useState(user?.ai_read_notebook || false)
  const [tocLoading, setTocLoading] = useState(false)
  const [tocText, setTocText] = useState(null)
  const [showToc, setShowToc] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await db.getNotebookEntries(user.id)
      setEntries(data)
    } catch {
      setToast('Failed to load notebook', 'error')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleNewEntry = async () => {
    try {
      const entry = await db.createNotebookEntry(user.id, { title: '', content: '', tags: [] })
      navigation.navigate('NotebookEditor', { entry })
    } catch {
      setToast('Failed to create entry', 'error')
    }
  }

  const handleToggleAIRead = async (value) => {
    const previousValue = aiReadEnabled
    setAIReadEnabled(value)
    try {
      await updateProfile({ ai_read_notebook: value })
      setToast(
        value ? 'Claude will now read your notebook for coaching context' : 'Notebook hidden from Claude',
        'success'
      )
    } catch (err) {
      setAIReadEnabled(previousValue)
      setToast(err.message || 'Failed to update notebook privacy', 'error')
    }
  }

  const handleGenerateTOC = async () => {
    if (entries.length === 0) { setToast('Add some entries first', 'error'); return }
    setTocLoading(true)
    try {
      const toc = await getNotebookTableOfContents(entries)
      setTocText(toc)
      setShowToc(true)
    } catch (err) {
      setToast(
        err.message.includes('API key') ? 'Add your Claude API key to use AI features' : 'Failed to generate — try again',
        'error'
      )
    } finally {
      setTocLoading(false)
    }
  }

  const filtered = entries.filter(e =>
    !search ||
    (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.content || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <View className="flex-1 bg-gray-50">

      {/* Header */}
      <View className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Notebook</Text>
            <Text className="text-gray-400 text-sm">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
          </View>
          <TouchableOpacity
            onPress={handleNewEntry}
            className="bg-indigo-500 w-10 h-10 rounded-full items-center justify-center shadow-sm"
            style={{ elevation: 3 }}
          >
            <Text className="text-white text-2xl" style={{ lineHeight: 28, marginTop: -1 }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TextInput
          className="bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 mb-3"
          value={search}
          onChangeText={setSearch}
          placeholder="Search entries..."
          placeholderTextColor="#9ca3af"
        />

        {/* AI read toggle */}
        <View className="flex-row items-center justify-between py-1.5 mb-2">
          <View>
            <Text className="text-sm font-medium text-gray-800">Let Claude read this notebook</Text>
            <Text className="text-xs text-gray-400">Uses it as extra context for coaching + recommendations</Text>
          </View>
          <Switch
            value={aiReadEnabled}
            onValueChange={handleToggleAIRead}
            trackColor={{ false: '#e5e7eb', true: '#6366f1' }}
            thumbColor="white"
          />
        </View>

        {/* Table of contents button */}
        <TouchableOpacity
          onPress={handleGenerateTOC}
          disabled={tocLoading || entries.length === 0}
          className={`flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${
            tocLoading || entries.length === 0 ? 'bg-gray-100' : 'bg-purple-50 border border-purple-100'
          }`}
        >
          {tocLoading
            ? <ActivityIndicator size="small" color="#9ca3af" />
            : <Text className="text-base">📋</Text>
          }
          <Text className={`text-sm font-medium ${tocLoading || entries.length === 0 ? 'text-gray-400' : 'text-purple-700'}`}>
            {tocLoading ? 'Generating...' : 'AI Table of Contents'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Entry list */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text style={{ fontSize: 52 }}>📓</Text>
          {search ? (
            <Text className="text-gray-400 text-center">No entries matching "{search}"</Text>
          ) : (
            <>
              <Text className="text-lg font-semibold text-gray-700 text-center">Your notebook is empty</Text>
              <Text className="text-gray-400 text-center text-sm leading-relaxed">
                Keep session reflections, lesson notes, music writing ideas, or anything else. Claude can read it to coach you better.
              </Text>
              <TouchableOpacity onPress={handleNewEntry} className="bg-indigo-500 px-6 py-3 rounded-xl">
                <Text className="text-white font-semibold">Write First Entry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const tagKey = item.tags?.[0]
            const tagStyle = TAG_COLORS[tagKey] || TAG_COLORS.general
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('NotebookEditor', { entry: item })}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <View className="flex-row items-start justify-between gap-2 mb-1">
                  <Text className="font-semibold text-gray-900 flex-1 text-base" numberOfLines={1}>
                    {item.title || 'Untitled'}
                  </Text>
                  <Text className="text-xs text-gray-400 shrink-0 mt-0.5">{formatDate(item.updated_at)}</Text>
                </View>
                {!!item.content && (
                  <Text className="text-sm text-gray-500 leading-relaxed mb-2" numberOfLines={2}>
                    {item.content}
                  </Text>
                )}
                <View className="flex-row gap-1.5 flex-wrap">
                  {tagKey && (
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: tagStyle.bg }}>
                      <Text className="text-xs font-medium" style={{ color: tagStyle.text }}>{tagStyle.label}</Text>
                    </View>
                  )}
                  {item.session_id && (
                    <View className="px-2 py-0.5 rounded-full bg-indigo-50">
                      <Text className="text-xs font-medium text-indigo-500">Post-session</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}

      {/* TOC bottom sheet */}
      <Modal visible={showToc} animationType="slide" transparent onRequestClose={() => setShowToc(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10" style={{ maxHeight: '80%' }}>
            <View className="w-12 h-1 bg-gray-200 rounded-full self-center mb-4" />
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Table of Contents</Text>
              <TouchableOpacity onPress={() => setShowToc(false)} className="p-2">
                <Text className="text-gray-400 text-lg">✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-700 leading-7 text-sm">{tocText}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  )
}
