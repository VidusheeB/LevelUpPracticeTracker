import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useState, useRef, useEffect, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'
import { getChatResponse } from '../utils/ai'

const STARTER_PROMPTS = [
  "What should I focus on this week?",
  "Recommend pieces similar to what I'm working on",
  "How can I improve faster?",
]

export default function AIChat() {
  const navigation = useNavigation()
  const { user, tasks, stats } = useApp()
  const scrollRef = useRef(null)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [context, setContext] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    Promise.all([
      db.getMoodLogs(user.id, 14),
      db.getSessions(user.id, sevenDaysAgo.toISOString()),
      db.getCalendarEvents(user.id),
      user.ai_read_notebook ? db.getNotebookEntries(user.id) : Promise.resolve([]),
    ]).then(([moodLogs, sessions, calendarEvents, notebookEntries]) => {
      setContext({
        tasks,
        moodLogs,
        sessions,
        calendarEvents,
        notebookEntries: user.ai_read_notebook ? notebookEntries : null,
        stats,
      })
    }).catch(console.error)
  }, [user?.id])

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || isTyping) return

    const userMsg = { id: String(Date.now()), role: 'user', text: trimmed }
    setMessages(prev => {
      const next = [...prev, userMsg]
      return next
    })
    setInput('')
    setIsTyping(true)

    try {
      const reply = await getChatResponse(
        trimmed,
        messages,
        context || { tasks, stats }
      )
      setMessages(prev => [
        ...prev,
        { id: String(Date.now() + 1), role: 'assistant', text: reply },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          text: "Sorry, I couldn't connect right now. Check your API key in .env and try again.",
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }, [input, isTyping, messages, context, tasks, stats])

  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages, isTyping])

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1">
          <Text className="text-indigo-500 text-base font-medium">← Back</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">Practice Coach</Text>
          <Text className="text-xs text-gray-400">Knows your practice history</Text>
        </View>
        <Text className="text-2xl">🎵</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8, gap: 10 }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View className="gap-4">
            <View className="items-center py-8">
              <Text className="text-5xl mb-3">🎼</Text>
              <Text className="text-lg font-semibold text-gray-900 text-center">
                Ask your practice coach
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-1">
                I know your tasks, mood, and practice history.
              </Text>
            </View>
            <View className="gap-2">
              {STARTER_PROMPTS.map(prompt => (
                <TouchableOpacity
                  key={prompt}
                  onPress={() => sendMessage(prompt)}
                  className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3"
                >
                  <Text className="text-indigo-700 text-sm font-medium">{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map(msg => (
          <View
            key={msg.id}
            style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}
          >
            <View
              className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-500 rounded-tr-sm'
                  : 'bg-gray-100 rounded-tl-sm'
              }`}
            >
              <Text
                className={msg.role === 'user' ? 'text-white' : 'text-gray-800'}
                style={{ lineHeight: 20 }}
              >
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={{ alignSelf: 'flex-start' }}>
            <View className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <View className="flex-row gap-1 items-center" style={{ height: 16 }}>
                <View className="w-2 h-2 rounded-full bg-gray-400" style={{ opacity: 0.4 }} />
                <View className="w-2 h-2 rounded-full bg-gray-400" style={{ opacity: 0.7 }} />
                <View className="w-2 h-2 rounded-full bg-gray-400" />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View className="flex-row items-end px-4 py-3 border-t border-gray-100 gap-2">
          <TextInput
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-gray-900"
            style={{ maxHeight: 120, fontSize: 15 }}
            placeholder="Ask your coach..."
            placeholderTextColor="#9ca3af"
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              input.trim() && !isTyping ? 'bg-indigo-500' : 'bg-gray-200'
            }`}
          >
            {isTyping
              ? <ActivityIndicator size="small" color="#9ca3af" />
              : <Text style={{ color: input.trim() ? 'white' : '#9ca3af', fontSize: 18, fontWeight: 'bold' }}>↑</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
