import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar() {
  const { user, setToast } = useApp()

  const [sessions, setSessions] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', event_type: 'practice_reminder', date: '', location: '', notes: '' })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const today = new Date()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)

        const [sessionsData, eventsData] = await Promise.all([
          api.getSessions(user.id, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]),
          api.getCalendarEvents(user.id),
        ])
        if (!cancelled) { setSessions(sessionsData); setCalendarEvents(eventsData) }
      } catch (error) {
        if (!cancelled) console.error('Failed to load data:', error)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user.id])

  const getWeekDays = () => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }

  const weekDays = getWeekDays()

  const dayHasPractice = (day) =>
    sessions.some(s => new Date(s.start_time).toDateString() === day.toDateString())

  const dayHasEvent = (day) =>
    calendarEvents.some(e => {
      if (!e.date) return false
      const d = new Date(e.date)
      return !isNaN(d.getTime()) && d.toDateString() === day.toDateString()
    })

  const getEventTypeInfo = (type) => {
    switch (type) {
      case 'practice_reminder': return { label: 'Practice', color: 'bg-green-500' }
      case 'lesson': return { label: 'Lesson', color: 'bg-purple-500' }
      case 'performance': return { label: 'Performance', color: 'bg-amber-400' }
      case 'rehearsal': return { label: 'Rehearsal', color: 'bg-blue-500' }
      default: return { label: 'Event', color: 'bg-gray-400' }
    }
  }

  const upcomingEvents = calendarEvents
    .filter(e => { if (!e.date) return false; const d = new Date(e.date); return !isNaN(d.getTime()) && d >= new Date() })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) { setToast('Title and date are required', 'error'); return }
    try {
      const created = await api.createCalendarEvent({
        user_id: user.id,
        title: newEvent.title,
        event_type: newEvent.event_type,
        date: `${newEvent.date}T17:00`,
        location: newEvent.location || null,
        notes: newEvent.notes || null,
      })
      setCalendarEvents([...calendarEvents, created])
      setToast('Event created!', 'success')
      setShowAddEvent(false)
      setNewEvent({ title: '', event_type: 'practice_reminder', date: '', location: '', notes: '' })
    } catch (error) {
      setToast(error.message, 'error')
    }
  }

  const handleDeleteEvent = async (eventId) => {
    try {
      await api.deleteCalendarEvent(eventId)
      setCalendarEvents(calendarEvents.filter(e => e.id !== eventId))
      setToast('Event deleted', 'success')
    } catch (error) {
      setToast(error.message, 'error')
    }
  }

  const eventTypeOptions = [
    { value: 'practice_reminder', label: 'Practice Reminder' },
    { value: 'lesson', label: 'Lesson' },
    { value: 'performance', label: 'Performance' },
    { value: 'rehearsal', label: 'Rehearsal' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pt-4 pb-24">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Calendar</Text>
          <Text className="text-gray-500">Your practice & events</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddEvent(!showAddEvent)}
          className="bg-indigo-500 px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold text-sm">+ Add Event</Text>
        </TouchableOpacity>
      </View>

      {/* Week View */}
      <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <View className="flex-row justify-between">
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString()
            const hasPractice = dayHasPractice(day)
            const hasEvent = dayHasEvent(day)
            return (
              <View key={i} className={`flex-1 items-center py-2 rounded-lg ${isToday ? 'bg-indigo-50' : ''}`}>
                <Text className="text-xs text-gray-500 mb-1">{DAY_NAMES[i]}</Text>
                <Text className={`text-lg font-semibold ${isToday ? 'text-indigo-500' : 'text-gray-700'}`}>
                  {day.getDate()}
                </Text>
                <View className="flex-row gap-0.5 mt-1">
                  {hasPractice && <View className="w-2 h-2 rounded-full bg-green-500" />}
                  {hasEvent && <View className="w-2 h-2 rounded-full bg-purple-500" />}
                </View>
              </View>
            )
          })}
        </View>
        <View className="flex-row justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full bg-green-500" />
            <Text className="text-xs text-gray-500">Practiced</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full bg-purple-500" />
            <Text className="text-xs text-gray-500">Event</Text>
          </View>
        </View>
      </View>

      {/* Add Event Form */}
      {showAddEvent && (
        <View className="bg-white rounded-2xl p-4 mb-4 gap-4 shadow-sm">
          <Text className="font-semibold">New Event</Text>

          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3"
            value={newEvent.title}
            onChangeText={v => setNewEvent({ ...newEvent, title: v })}
            placeholder="e.g., Piano lesson, Practice scales..."
          />

          <View className="gap-2">
            {eventTypeOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setNewEvent({ ...newEvent, event_type: opt.value })}
                className={`px-4 py-2 rounded-xl border ${
                  newEvent.event_type === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                }`}
              >
                <Text className={newEvent.event_type === opt.value ? 'text-indigo-600' : 'text-gray-600'}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3"
            value={newEvent.date}
            onChangeText={v => setNewEvent({ ...newEvent, date: v })}
            placeholder="Date (YYYY-MM-DD)"
            keyboardType="numbers-and-punctuation"
          />

          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3"
            value={newEvent.location}
            onChangeText={v => setNewEvent({ ...newEvent, location: v })}
            placeholder="Location (optional)"
          />

          <View className="flex-row gap-2">
            <TouchableOpacity onPress={handleCreateEvent} className="flex-1 bg-indigo-500 rounded-xl py-3 items-center">
              <Text className="text-white font-semibold">Create Event</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddEvent(false)} className="px-4 py-3 bg-gray-100 rounded-xl">
              <Text className="text-gray-700">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upcoming Events */}
      <Text className="text-lg font-semibold text-gray-900 mb-3">Upcoming Events</Text>
      {upcomingEvents.length > 0 ? (
        <View className="gap-3">
          {upcomingEvents.map(event => {
            const eventDate = new Date(event.date)
            const typeInfo = getEventTypeInfo(event.event_type)
            return (
              <View key={event.id} className="bg-white rounded-2xl p-4 shadow-sm flex-row items-start justify-between">
                <View className="flex-row items-start gap-3 flex-1">
                  <View className={`w-3 h-3 rounded-full ${typeInfo.color} mt-1.5`} />
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900">{event.title}</Text>
                    <Text className="text-sm text-gray-500">
                      {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {event.location ? ` • ${event.location}` : ''}
                    </Text>
                    <Text className="text-xs text-gray-400">{typeInfo.label}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDeleteEvent(event.id)} className="p-1">
                  <Text className="text-gray-400">✕</Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      ) : (
        <View className="bg-white rounded-2xl py-6 items-center">
          <Text className="text-gray-500">No upcoming events</Text>
          <TouchableOpacity onPress={() => setShowAddEvent(true)} className="mt-3 px-4 py-2 bg-gray-100 rounded-xl">
            <Text className="text-gray-700">Add an Event</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}
