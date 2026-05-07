import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'

const TAGS = [
  { key: 'reflection',    label: 'Reflection',    bg: '#f0fdf4', text: '#16a34a' },
  { key: 'lesson_note',   label: 'Lesson Note',   bg: '#eff6ff', text: '#2563eb' },
  { key: 'music_writing', label: 'Music Writing', bg: '#fdf4ff', text: '#9333ea' },
  { key: 'technique',     label: 'Technique',     bg: '#fff7ed', text: '#ea580c' },
  { key: 'repertoire',    label: 'Repertoire',    bg: '#f0f9ff', text: '#0284c7' },
  { key: 'general',       label: 'General',       bg: '#f9fafb', text: '#6b7280' },
]

export default function NotebookEditor() {
  const navigation = useNavigation()
  const route = useRoute()
  const { user, setToast } = useApp()

  const initialEntry = route.params?.entry
  const sessionId = route.params?.sessionId || null

  const [title, setTitle] = useState(initialEntry?.title || '')
  const [content, setContent] = useState(initialEntry?.content || '')
  const [tags, setTags] = useState(initialEntry?.tags || [])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  const entryIdRef = useRef(initialEntry?.id || null)
  const saveTimerRef = useRef(null)

  // Save to Supabase — creates if no ID yet, updates if exists
  const save = useCallback(async (t, c, tgs) => {
    setSaving(true)
    try {
      const payload = {
        title: t.trim() || 'Untitled',
        content: c,
        tags: tgs,
        updated_at: new Date().toISOString(),
      }
      if (entryIdRef.current) {
        await db.updateNotebookEntry(entryIdRef.current, payload)
      } else {
        const created = await db.createNotebookEntry(user.id, {
          ...payload,
          session_id: sessionId,
        })
        entryIdRef.current = created.id
      }
      setSavedAt(new Date())
    } catch {
      setToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }, [user.id, sessionId])

  // Debounce autosave — fires 1.5s after last keystroke
  const scheduleAutosave = useCallback((t, c, tgs) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => save(t, c, tgs), 1500)
  }, [save])

  // Flush save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const handleTitleChange = (v) => { setTitle(v); scheduleAutosave(v, content, tags) }
  const handleContentChange = (v) => { setContent(v); scheduleAutosave(title, v, tags) }

  const handleTagToggle = (key) => {
    const next = tags.includes(key) ? tags.filter(t => t !== key) : [key, ...tags.filter(t => t !== key)]
    setTags(next)
    scheduleAutosave(title, content, next)
  }

  const handleDone = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await save(title, content, tags)
    navigation.goBack()
  }

  const handleDelete = () => {
    Alert.alert('Delete Entry', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (entryIdRef.current) await db.deleteNotebookEntry(entryIdRef.current)
          navigation.goBack()
        },
      },
    ])
  }

  const savedLabel = () => {
    if (saving) return 'Saving...'
    if (!savedAt) return ''
    const secs = Math.round((Date.now() - savedAt) / 1000)
    if (secs < 5) return 'Saved'
    if (secs < 60) return `Saved ${secs}s ago`
    return `Saved ${Math.round(secs / 60)}m ago`
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Toolbar */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
        <TouchableOpacity onPress={handleDone} className="py-1 pr-3">
          <Text className="text-indigo-500 font-semibold text-base">‹ Done</Text>
        </TouchableOpacity>
        <Text className="text-xs text-gray-400">{savedLabel()}</Text>
        <TouchableOpacity onPress={handleDelete} className="py-1 pl-3">
          <Text className="text-red-400 text-sm font-medium">Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <TextInput
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Title"
          placeholderTextColor="#d1d5db"
          style={{ fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 12 }}
          multiline={false}
          returnKeyType="next"
        />

        {/* Tag chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 20, marginBottom: 20 }}
        >
          {TAGS.map(tag => {
            const active = tags.includes(tag.key)
            return (
              <TouchableOpacity
                key={tag.key}
                onPress={() => handleTagToggle(tag.key)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 999, borderWidth: 1,
                  backgroundColor: active ? tag.bg : 'white',
                  borderColor: active ? tag.text : '#e5e7eb',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: active ? tag.text : '#9ca3af' }}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Divider */}
        <View className="h-px bg-gray-100 mb-4" />

        {/* Body */}
        <TextInput
          value={content}
          onChangeText={handleContentChange}
          placeholder="Start writing..."
          placeholderTextColor="#d1d5db"
          style={{
            fontSize: 16,
            color: '#1f2937',
            lineHeight: 26,
            minHeight: 400,
            textAlignVertical: 'top',
          }}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
