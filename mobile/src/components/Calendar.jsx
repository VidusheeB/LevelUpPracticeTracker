import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native'
import { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useApp } from '../contexts/AppContext'
import { db } from '../utils/supabase'
import { scheduleAllReminders, scheduleEventReminder, cancelEventReminder } from '../utils/notifications'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const EVENT_TYPES = [
  { value: 'rehearsal', label: 'Rehearsal', color: '#3b82f6', emoji: '🎼' },
  { value: 'performance', label: 'Performance', color: '#f59e0b', emoji: '🎤' },
  { value: 'lesson', label: 'Lesson', color: '#8b5cf6', emoji: '🎓' },
  { value: 'practice_reminder', label: 'Practice Reminder', color: '#10b981', emoji: '🎵' },
  { value: 'other', label: 'Other', color: '#6b7280', emoji: '📌' },
]

const TIME_OPTIONS = [
  { label: 'Morning', value: '09:00', display: '9:00 AM' },
  { label: 'Afternoon', value: '15:00', display: '3:00 PM' },
  { label: 'Evening', value: '19:00', display: '7:00 PM' },
]

function getTypeInfo(type) {
  return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[4]
}

function toDateStr(date) {
  return date.toISOString().split('T')[0]
}

function getMonthCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), current: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), current: false })
  }
  return cells
}

export default function Calendar() {
  const { user, tasks } = useApp()
  const isTeacher = user?.role === 'teacher'

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(toDateStr(now))
  const [events, setEvents] = useState([])
  const [sessions, setSessions] = useState([])
  const [ensembles, setEnsembles] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'rehearsal',
    event_time: '09:00',
    ensemble_id: null,
  })

  const load = useCallback(async () => {
    try {
      const monthStart = new Date(year, month, 1).toISOString().split('T')[0]
      const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0]

      const [eventsData, sessionsData] = await Promise.all([
        db.getCalendarEvents(user.id),
        db.getSessions(user.id, monthStart, monthEnd),
      ])

      let ensemblesData = []
      if (isTeacher) {
        ensemblesData = await db.getTeacherEnsembles(user.id)
        ensemblesData = ensemblesData.filter(e => !e.archived)
      }

      setEvents(eventsData)
      setSessions(sessionsData)
      setEnsembles(ensemblesData)

      // Schedule notifications for upcoming events + tasks with due dates
      const upcomingTasks = (tasks || []).filter(t => t.due_date)
      scheduleAllReminders(eventsData, upcomingTasks).catch(() => {})
    } catch (err) {
      console.error('Calendar load error:', err)
    }
  }, [user.id, year, month, isTeacher, tasks])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const cells = getMonthCells(year, month)
  const todayStr = toDateStr(now)

  // Build a map of dateStr → event data for dots
  const eventsByDate = {}
  for (const e of events) {
    if (!e.date) continue
    const ds = e.date.split('T')[0]
    if (!eventsByDate[ds]) eventsByDate[ds] = []
    eventsByDate[ds].push(e)
  }

  // Practice session dots
  const practiceByDate = {}
  for (const s of sessions) {
    const ds = new Date(s.start_time).toISOString().split('T')[0]
    practiceByDate[ds] = true
  }

  // Assignment due dates (from tasks with due_date)
  const tasksByDate = {}
  for (const t of (tasks || [])) {
    if (!t.due_date) continue
    const ds = t.due_date.split('T')[0]
    if (!tasksByDate[ds]) tasksByDate[ds] = []
    tasksByDate[ds].push(t)
  }

  const dotsForDate = (ds) => {
    const dots = []
    if (practiceByDate[ds]) dots.push('#10b981')
    if (tasksByDate[ds]?.length) dots.push('#f97316')
    const dayEvents = eventsByDate[ds] || []
    for (const e of dayEvents.slice(0, 2)) {
      const color = getTypeInfo(e.event_type).color
      if (!dots.includes(color)) dots.push(color)
    }
    return dots.slice(0, 4)
  }

  // Events for selected day
  const selectedEvents = (eventsByDate[selectedDate] || [])
    .sort((a, b) => (a.event_time || '').localeCompare(b.event_time || ''))
  const selectedPracticed = practiceByDate[selectedDate]
  const selectedTasks = tasksByDate[selectedDate] || []

  const openForm = () => {
    setNewEvent({ title: '', event_type: 'rehearsal', event_time: '09:00', ensemble_id: null })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!newEvent.title.trim()) return
    setSaving(true)
    try {
      const payload = isTeacher && newEvent.ensemble_id
        ? { created_by: user.id, ensemble_id: newEvent.ensemble_id, title: newEvent.title.trim(), event_type: newEvent.event_type, event_time: newEvent.event_time, date: `${selectedDate}T${newEvent.event_time}:00` }
        : { user_id: user.id, title: newEvent.title.trim(), event_type: newEvent.event_type, event_time: newEvent.event_time, date: `${selectedDate}T${newEvent.event_time}:00` }

      const created = await db.createCalendarEvent(payload)
      setEvents(prev => [...prev, created])
      await scheduleEventReminder(created.id, created.title, created.date, created.event_time)
      setShowForm(false)
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (event) => {
    Alert.alert('Remove Event', `Remove "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await db.deleteCalendarEvent(event.id)
        await cancelEventReminder(event.id)
        setEvents(prev => prev.filter(e => e.id !== event.id))
      }},
    ])
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const opt = TIME_OPTIONS.find(t => t.value === timeStr)
    if (opt) return opt.display
    const [h, m] = timeStr.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  }

  const selectedDateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="pb-24">

      {/* Header */}
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Calendar</Text>
          <Text className="text-gray-500 text-sm">Practice schedule & class events</Text>
        </View>
        <TouchableOpacity onPress={openForm} className="bg-indigo-500 px-4 py-2 rounded-xl">
          <Text className="text-white font-semibold text-sm">+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Month navigation */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={prevMonth} className="p-2">
          <Text className="text-2xl text-gray-500">‹</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} className="p-2">
          <Text className="text-2xl text-gray-500">›</Text>
        </TouchableOpacity>
      </View>

      {/* Month grid */}
      <View className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Day headers */}
        <View className="flex-row border-b border-gray-100">
          {DAYS.map(d => (
            <View key={d} className="flex-1 items-center py-2">
              <Text className="text-xs font-medium text-gray-400">{d}</Text>
            </View>
          ))}
        </View>

        {/* Cells */}
        <View className="flex-row flex-wrap">
          {cells.map((cell, i) => {
            const ds = toDateStr(cell.date)
            const isToday = ds === todayStr
            const isSelected = ds === selectedDate
            const dots = dotsForDate(ds)

            return (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedDate(ds)}
                className="items-center justify-start py-1.5"
                style={{ width: '14.285714%' }}
              >
                <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected ? 'bg-indigo-500' : isToday ? 'bg-indigo-50' : ''}`}>
                  <Text className={`text-sm font-medium ${isSelected ? 'text-white' : isToday ? 'text-indigo-600' : cell.current ? 'text-gray-800' : 'text-gray-300'}`}>
                    {cell.date.getDate()}
                  </Text>
                </View>
                <View className="flex-row gap-0.5 mt-0.5 h-2 items-center">
                  {dots.map((color, j) => (
                    <View key={j} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
                  ))}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Legend */}
        <View className="flex-row flex-wrap gap-3 px-4 py-3 border-t border-gray-100">
          <View className="flex-row items-center gap-1">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
            <Text className="text-xs text-gray-500">Practiced</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' }} />
            <Text className="text-xs text-gray-500">Task due</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' }} />
            <Text className="text-xs text-gray-500">Rehearsal</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />
            <Text className="text-xs text-gray-500">Performance</Text>
          </View>
        </View>
      </View>

      {/* Selected day events */}
      <View className="px-4 mt-5">
        <Text className="text-base font-semibold text-gray-900 mb-3">{selectedDateLabel}</Text>

        {selectedPracticed && (
          <View className="flex-row items-center gap-2 bg-green-50 rounded-xl px-4 py-3 mb-2">
            <Text>🎵</Text>
            <Text className="text-green-700 font-medium text-sm">You practiced on this day</Text>
          </View>
        )}

        {selectedTasks.map(task => (
          <View key={task.id} className="bg-orange-50 rounded-xl px-4 py-3 mb-2 flex-row items-center gap-2">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' }} />
            <View className="flex-1">
              <Text className="text-orange-800 font-medium text-sm">{task.title}</Text>
              <Text className="text-orange-500 text-xs">Task due today</Text>
            </View>
          </View>
        ))}

        {selectedEvents.map(event => {
          const type = getTypeInfo(event.event_type)
          return (
            <View key={event.id} className="bg-white rounded-xl px-4 py-3 mb-2 shadow-sm flex-row items-center gap-3">
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: type.color, marginTop: 2 }} />
              <View className="flex-1">
                <Text className="font-medium text-gray-900">{event.title}</Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text className="text-xs text-gray-400">{type.label}</Text>
                  {event.event_time && (
                    <Text className="text-xs text-gray-400">· {formatTime(event.event_time)}</Text>
                  )}
                  {event.ensemble_name && (
                    <View className="bg-indigo-50 px-2 py-0.5 rounded-full">
                      <Text className="text-xs text-indigo-600">{event.ensemble_name}</Text>
                    </View>
                  )}
                  {!event.ensemble_name && event.is_own && (
                    <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                      <Text className="text-xs text-gray-500">Personal</Text>
                    </View>
                  )}
                </View>
              </View>
              {event.is_own && (
                <TouchableOpacity onPress={() => handleDelete(event)} className="p-2">
                  <Text className="text-gray-300">✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}

        {!selectedPracticed && selectedEvents.length === 0 && selectedTasks.length === 0 && (
          <View className="bg-white rounded-xl py-6 items-center">
            <Text className="text-gray-400 text-sm">No events on this day</Text>
            <TouchableOpacity onPress={openForm} className="mt-2 px-4 py-1.5 bg-gray-100 rounded-lg">
              <Text className="text-gray-600 text-sm">+ Add event</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Event Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="font-semibold text-lg">New Event</Text>
            <TouchableOpacity onPress={() => setShowForm(false)} className="p-2">
              <Text className="text-gray-400 text-lg">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
            <View className="gap-4">

              {/* Date display */}
              <View className="bg-indigo-50 rounded-xl px-4 py-3">
                <Text className="text-indigo-700 font-medium">{selectedDateLabel}</Text>
              </View>

              {/* Title */}
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3"
                value={newEvent.title}
                onChangeText={v => setNewEvent(e => ({ ...e, title: v }))}
                placeholder="Event title (e.g. Jazz Band Rehearsal)"
                autoFocus
              />

              {/* Event type */}
              <View>
                <Text className="text-sm font-medium text-gray-600 mb-2">Type</Text>
                <View className="flex-row flex-wrap gap-2">
                  {EVENT_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setNewEvent(e => ({ ...e, event_type: t.value }))}
                      className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${newEvent.event_type === t.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                    >
                      <Text>{t.emoji}</Text>
                      <Text className={`text-sm ${newEvent.event_type === t.value ? 'text-indigo-700 font-medium' : 'text-gray-600'}`}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time */}
              <View>
                <Text className="text-sm font-medium text-gray-600 mb-2">Time</Text>
                <View className="flex-row gap-2">
                  {TIME_OPTIONS.map(t => (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => setNewEvent(e => ({ ...e, event_time: t.value }))}
                      className={`flex-1 py-2.5 rounded-xl border items-center ${newEvent.event_time === t.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                    >
                      <Text className={`text-sm font-medium ${newEvent.event_time === t.value ? 'text-indigo-700' : 'text-gray-600'}`}>{t.label}</Text>
                      <Text className="text-xs text-gray-400">{t.display}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Class picker (teachers only) */}
              {isTeacher && ensembles.length > 0 && (
                <View>
                  <Text className="text-sm font-medium text-gray-600 mb-2">Add to a class (optional)</Text>
                  <View className="gap-2">
                    <TouchableOpacity
                      onPress={() => setNewEvent(e => ({ ...e, ensemble_id: null }))}
                      className={`px-4 py-2.5 rounded-xl border flex-row items-center gap-2 ${!newEvent.ensemble_id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                    >
                      <Text className="text-lg">👤</Text>
                      <Text className={`text-sm ${!newEvent.ensemble_id ? 'text-indigo-700 font-medium' : 'text-gray-600'}`}>Personal only</Text>
                    </TouchableOpacity>
                    {ensembles.map(ens => (
                      <TouchableOpacity
                        key={ens.id}
                        onPress={() => setNewEvent(e => ({ ...e, ensemble_id: ens.id }))}
                        className={`px-4 py-2.5 rounded-xl border flex-row items-center gap-2 ${newEvent.ensemble_id === ens.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                      >
                        <Text className="text-lg">🎼</Text>
                        <View className="flex-1">
                          <Text className={`text-sm ${newEvent.ensemble_id === ens.id ? 'text-indigo-700 font-medium' : 'text-gray-600'}`}>{ens.name}</Text>
                          <Text className="text-xs text-gray-400">Visible to all students in this class</Text>
                        </View>
                        {newEvent.ensemble_id === ens.id && <Text className="text-indigo-500">✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Notification note */}
              <View className="flex-row items-start gap-2 bg-gray-50 rounded-xl px-4 py-3">
                <Text>🔔</Text>
                <Text className="text-xs text-gray-500 flex-1">
                  You'll get a reminder the morning before this event.
                  {isTeacher && newEvent.ensemble_id ? ' Students in the class will see it on their calendars.' : ''}
                </Text>
              </View>

              {/* Save */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !newEvent.title.trim()}
                className={`py-4 rounded-2xl items-center ${saving || !newEvent.title.trim() ? 'bg-indigo-300' : 'bg-indigo-500'}`}
              >
                <Text className="text-white font-semibold text-base">
                  {saving ? 'Saving...' : 'Add to Calendar'}
                </Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
  )
}
