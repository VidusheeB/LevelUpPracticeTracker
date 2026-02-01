/**
 * =============================================================================
 * CALENDAR.JSX - Calendar View
 * =============================================================================
 * Google Calendar-inspired view showing:
 * - Practice sessions (auto-logged)
 * - Custom events (practice reminders, lessons, performances)
 * - Upcoming rehearsals (if in an ensemble)
 * - Week view with activity indicators
 *
 * EVENT TYPES:
 * - practice_reminder: Scheduled practice time
 * - lesson: Music lesson
 * - performance: Concert, recital, gig
 * - other: Custom event
 * - rehearsal: Ensemble rehearsal (requires ensemble membership)
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'


export default function Calendar() {
  const { user, setToast } = useApp()

  // Practice sessions for the current week (to show activity dots)
  const [sessions, setSessions] = useState([])
  // Calendar events (user-created)
  const [calendarEvents, setCalendarEvents] = useState([])

  // Form states
  const [showAddEvent, setShowAddEvent] = useState(false)

  // New event form
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'practice_reminder',
    date: '',
    time: '17:00',
    location: '',
    notes: ''
  })

  // ---------------------------------------------------------------------------
  // LOAD DATA
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date()
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay()) // Sunday

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)

        // Load practice sessions
        const sessionsData = await api.getSessions(
          user.id,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0]
        )
        setSessions(sessionsData)

        // Load calendar events
        const eventsData = await api.getCalendarEvents(user.id)
        setCalendarEvents(eventsData)
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }

    loadData()
  }, [user.id])


  // ---------------------------------------------------------------------------
  // GENERATE WEEK DAYS
  // ---------------------------------------------------------------------------
  const getWeekDays = () => {
    const today = new Date()
    const week = []

    // Start from Sunday
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }

    return week
  }

  const weekDays = getWeekDays()
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']


  // ---------------------------------------------------------------------------
  // CHECK IF DAY HAS ACTIVITIES
  // ---------------------------------------------------------------------------
  const dayHasPractice = (day) => {
    return sessions.some(session => {
      const sessionDate = new Date(session.start_time)
      return sessionDate.toDateString() === day.toDateString()
    })
  }

  const dayHasEvent = (day) => {
    return calendarEvents.some(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === day.toDateString()
    })
  }


  // ---------------------------------------------------------------------------
  // CREATE NEW EVENT
  // ---------------------------------------------------------------------------
  const handleCreateEvent = async (e) => {
    e.preventDefault()

    try {
      // Use date + time as entered (no UTC conversion) to preserve correct display
      const dateStr = `${newEvent.date}T${newEvent.time}`

      const eventData = {
        user_id: user.id,
        title: newEvent.title,
        event_type: newEvent.event_type,
        date: dateStr,
        location: newEvent.location || null,
        notes: newEvent.notes || null
      }

      const created = await api.createCalendarEvent(eventData)
      setCalendarEvents([...calendarEvents, created])
      setToast('Event created!', 'success')
      setShowAddEvent(false)
      setNewEvent({
        title: '',
        event_type: 'practice_reminder',
        date: '',
        time: '17:00',
        location: '',
        notes: ''
      })
    } catch (error) {
      setToast(error.message, 'error')
    }
  }


  // ---------------------------------------------------------------------------
  // DELETE EVENT
  // ---------------------------------------------------------------------------
  const handleDeleteEvent = async (eventId) => {
    try {
      await api.deleteCalendarEvent(eventId)
      setCalendarEvents(calendarEvents.filter(e => e.id !== eventId))
      setToast('Event deleted', 'success')
    } catch (error) {
      setToast(error.message, 'error')
    }
  }


  // ---------------------------------------------------------------------------
  // GET EVENT TYPE LABEL & COLOR
  // ---------------------------------------------------------------------------
  const getEventTypeInfo = (type) => {
    switch (type) {
      case 'practice_reminder':
        return { label: 'Practice', color: 'bg-success', textColor: 'text-success' }
      case 'lesson':
        return { label: 'Lesson', color: 'bg-purple-500', textColor: 'text-purple-600' }
      case 'performance':
        return { label: 'Performance', color: 'bg-warning', textColor: 'text-warning-dark' }
      case 'rehearsal':
        return { label: 'Rehearsal', color: 'bg-blue-500', textColor: 'text-blue-600' }
      default:
        return { label: 'Event', color: 'bg-gray-500', textColor: 'text-gray-600' }
    }
  }


  // ---------------------------------------------------------------------------
  // GET UPCOMING EVENTS (3 most recent, within next 7 days)
  // ---------------------------------------------------------------------------
  const getUpcomingEvents = () => {
    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)

    return calendarEvents
      .filter(event => {
        const eventDate = new Date(event.date)
        return eventDate >= now && eventDate <= nextWeek
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3)  // Only show 3 most recent (soonest) upcoming events
  }


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500">Your practice & events</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddEvent(!showAddEvent)}
            className="btn-primary text-sm"
          >
            + Add Event
          </button>
        </div>
      </header>


      {/* =================================================================
          WEEK VIEW
          Shows current week with activity indicators
          ================================================================= */}
      <div className="card">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString()
            const hasPractice = dayHasPractice(day)
            const hasEvent = dayHasEvent(day)

            return (
              <div
                key={index}
                className={`text-center py-2 rounded-lg transition-colors
                  ${isToday ? 'bg-primary/10' : ''}`}
              >
                {/* Day name */}
                <p className="text-xs text-gray-500 mb-1">{dayNames[index]}</p>

                {/* Day number */}
                <p className={`text-lg font-semibold
                  ${isToday ? 'text-primary' : 'text-gray-700'}`}>
                  {day.getDate()}
                </p>

                {/* Activity indicators */}
                <div className="flex justify-center gap-1 mt-1">
                  {hasPractice && (
                    <div className="w-2 h-2 rounded-full bg-success" title="Practiced" />
                  )}
                  {hasEvent && (
                    <div className="w-2 h-2 rounded-full bg-purple-500" title="Event" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-success" />
            Practiced
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            Event
          </span>
        </div>
      </div>


      {/* =================================================================
          ADD EVENT FORM
          ================================================================= */}
      {showAddEvent && (
        <form onSubmit={handleCreateEvent} className="card space-y-4">
          <h3 className="font-semibold">New Event</h3>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="e.g., Practice scales, Piano lesson..."
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Event Type</label>
            <select
              value={newEvent.event_type}
              onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
              className="input"
            >
              <option value="practice_reminder">Practice Reminder</option>
              <option value="lesson">Lesson</option>
              <option value="performance">Performance</option>
              <option value="rehearsal">Rehearsal</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Time</label>
              <input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Location (optional)</label>
            <input
              type="text"
              value={newEvent.location}
              onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              placeholder="e.g., Music room, Teacher's studio..."
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={newEvent.notes}
              onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
              placeholder="Any additional notes..."
              className="input"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              Create Event
            </button>
            <button
              type="button"
              onClick={() => setShowAddEvent(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}


      {/* =================================================================
          UPCOMING EVENTS
          ================================================================= */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Events</h2>

        {getUpcomingEvents().length > 0 ? (
          <div className="space-y-3">
            {getUpcomingEvents().map((event) => {
              const eventDate = new Date(event.date)
              const typeInfo = getEventTypeInfo(event.event_type)

              return (
                <div key={event.id} className="card flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full ${typeInfo.color} mt-1.5`} />
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {eventDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })} at {eventDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                        {event.location && ` • ${event.location}`}
                      </p>
                      <span className={`text-xs ${typeInfo.textColor}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="text-gray-400 hover:text-danger text-sm"
                    title="Delete event"
                  >
                    x
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-6">
            <p className="text-gray-500">No upcoming events</p>
            <button
              onClick={() => setShowAddEvent(true)}
              className="btn-secondary mt-3"
            >
              Add an Event
            </button>
          </div>
        )}
      </section>


    </div>
  )
}
