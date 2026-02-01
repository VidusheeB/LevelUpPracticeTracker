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
  const { user, rehearsals, tasks, setToast, refreshRehearsals } = useApp()

  // Practice sessions for the current week (to show activity dots)
  const [sessions, setSessions] = useState([])
  // Calendar events (user-created)
  const [calendarEvents, setCalendarEvents] = useState([])

  // Form states
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showAddRehearsal, setShowAddRehearsal] = useState(false)
  const [showCreateEnsemble, setShowCreateEnsemble] = useState(false)

  // New event form
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'practice_reminder',
    date: '',
    time: '17:00',
    location: '',
    notes: ''
  })

  // New rehearsal form
  const [newRehearsal, setNewRehearsal] = useState({
    date: '',
    time: '19:00',
    location: ''
  })

  // New ensemble form
  const [newEnsemble, setNewEnsemble] = useState({
    name: '',
    type: ''
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

  const dayHasRehearsal = (day) => {
    return rehearsals.some(rehearsal => {
      const rehearsalDate = new Date(rehearsal.date)
      return rehearsalDate.toDateString() === day.toDateString()
    })
  }

  const dayHasEvent = (day) => {
    return calendarEvents.some(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === day.toDateString()
    })
  }


  // ---------------------------------------------------------------------------
  // GET TASKS FOR REHEARSAL
  // ---------------------------------------------------------------------------
  const getTasksForRehearsal = (rehearsalId) => {
    return tasks.filter(task => task.rehearsal_id === rehearsalId)
  }


  // ---------------------------------------------------------------------------
  // CREATE NEW EVENT
  // ---------------------------------------------------------------------------
  const handleCreateEvent = async (e) => {
    e.preventDefault()

    try {
      const dateTime = new Date(`${newEvent.date}T${newEvent.time}`)

      const eventData = {
        user_id: user.id,
        title: newEvent.title,
        event_type: newEvent.event_type,
        date: dateTime.toISOString(),
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
  // CREATE NEW REHEARSAL
  // ---------------------------------------------------------------------------
  const handleCreateRehearsal = async (e) => {
    e.preventDefault()

    try {
      const dateTime = new Date(`${newRehearsal.date}T${newRehearsal.time}`)

      await api.createRehearsal({
        ensemble_id: user.ensemble_id,
        date: dateTime.toISOString(),
        location: newRehearsal.location || null
      })

      setToast('Rehearsal created!', 'success')
      setShowAddRehearsal(false)
      setNewRehearsal({ date: '', time: '19:00', location: '' })
      
      // Refresh rehearsals to show the newly created one
      await refreshRehearsals()
    } catch (error) {
      setToast(error.message, 'error')
    }
  }


  // ---------------------------------------------------------------------------
  // CREATE NEW ENSEMBLE
  // ---------------------------------------------------------------------------
  const handleCreateEnsemble = async (e) => {
    e.preventDefault()

    try {
      // Create ensemble
      const ensemble = await api.createEnsemble({
        name: newEnsemble.name,
        type: newEnsemble.type || null
      })

      // Join the ensemble
      await api.joinEnsemble(ensemble.id, user.id)

      setToast(`Created and joined "${ensemble.name}"!`, 'success')
      setShowCreateEnsemble(false)
      setNewEnsemble({ name: '', type: '' })
      // Reload the page to refresh user data
      window.location.reload()
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
      default:
        return { label: 'Event', color: 'bg-gray-500', textColor: 'text-gray-600' }
    }
  }


  // ---------------------------------------------------------------------------
  // GET UPCOMING EVENTS (next 7 days)
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
          {user.ensemble_id && (
            <button
              onClick={() => setShowAddRehearsal(!showAddRehearsal)}
              className="btn-secondary text-sm"
            >
              + Rehearsal
            </button>
          )}
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
            const hasRehearsal = dayHasRehearsal(day)
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
                  {hasRehearsal && (
                    <div className="w-2 h-2 rounded-full bg-primary" title="Rehearsal" />
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
            <div className="w-2 h-2 rounded-full bg-primary" />
            Rehearsal
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
          ADD REHEARSAL FORM (only if in ensemble)
          ================================================================= */}
      {showAddRehearsal && user.ensemble_id && (
        <form onSubmit={handleCreateRehearsal} className="card space-y-4">
          <h3 className="font-semibold">New Rehearsal</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={newRehearsal.date}
                onChange={(e) => setNewRehearsal({ ...newRehearsal, date: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Time</label>
              <input
                type="time"
                value={newRehearsal.time}
                onChange={(e) => setNewRehearsal({ ...newRehearsal, time: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Location (optional)</label>
            <input
              type="text"
              value={newRehearsal.location}
              onChange={(e) => setNewRehearsal({ ...newRehearsal, location: e.target.value })}
              placeholder="Band Room A"
              className="input"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowAddRehearsal(false)}
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


      {/* =================================================================
          UPCOMING REHEARSALS
          ================================================================= */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Rehearsals</h2>

        {rehearsals.length > 0 ? (
          <div className="space-y-4">
            {rehearsals.map((rehearsal) => {
              const rehearsalDate = new Date(rehearsal.date)
              const daysUntil = Math.ceil(
                (rehearsalDate - new Date()) / (1000 * 60 * 60 * 24)
              )
              const linkedTasks = getTasksForRehearsal(rehearsal.id)

              return (
                <div
                  key={rehearsal.id}
                  className={`card border-l-4
                    ${daysUntil <= 1 ? 'border-l-danger' :
                      daysUntil <= 3 ? 'border-l-warning' : 'border-l-primary'}`}
                >
                  {/* Rehearsal Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {rehearsalDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {rehearsalDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                        {rehearsal.location && ` • ${rehearsal.location}`}
                      </p>
                    </div>
                    <span className={`badge
                      ${daysUntil <= 1 ? 'bg-danger/10 text-danger' :
                        daysUntil <= 3 ? 'bg-warning/10 text-warning-dark' :
                        'bg-gray-100 text-gray-600'}`}>
                      {daysUntil === 0 ? 'Today' :
                       daysUntil === 1 ? 'Tomorrow' :
                       `${daysUntil} days`}
                    </span>
                  </div>

                  {/* Linked Tasks */}
                  {linkedTasks.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <p className="text-xs text-gray-500 mb-2">Tasks for this rehearsal:</p>
                      <div className="space-y-2">
                        {linkedTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-700">{task.title}</span>
                            <span className={`font-medium
                              ${task.readiness_score >= 80 ? 'text-success' :
                                task.readiness_score >= 50 ? 'text-warning-dark' :
                                'text-danger'}`}>
                              {Math.round(task.readiness_score)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rehearsal.notes && (
                    <p className="text-sm text-gray-500 mt-3 italic">
                      {rehearsal.notes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : !user.ensemble_id ? (
          <div className="card text-center py-8">
            <span className="text-4xl mb-2 block">🎵</span>
            <p className="text-gray-600 font-medium">Not in an ensemble yet</p>
            <p className="text-gray-500 text-sm mb-4">
              Create or join an ensemble to add rehearsals
            </p>
            <button
              onClick={() => setShowCreateEnsemble(true)}
              className="btn-primary"
            >
              Create an Ensemble
            </button>
          </div>
        ) : (
          <div className="card text-center py-8">
            <span className="text-4xl mb-2 block">📅</span>
            <p className="text-gray-500">No upcoming rehearsals</p>
            <button
              onClick={() => setShowAddRehearsal(true)}
              className="btn-secondary mt-4"
            >
              Add Rehearsal
            </button>
          </div>
        )}
      </section>


      {/* =================================================================
          CREATE ENSEMBLE MODAL
          ================================================================= */}
      {showCreateEnsemble && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreateEnsemble}
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 space-y-4"
          >
            <h3 className="text-xl font-bold text-gray-900">Create an Ensemble</h3>
            <p className="text-gray-500 text-sm">
              An ensemble is a music group where members can share rehearsals,
              challenges, and compete on the leaderboard.
            </p>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Ensemble Name</label>
              <input
                type="text"
                value={newEnsemble.name}
                onChange={(e) => setNewEnsemble({ ...newEnsemble, name: e.target.value })}
                placeholder="e.g., Jazz Band, Orchestra..."
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Type (optional)</label>
              <select
                value={newEnsemble.type}
                onChange={(e) => setNewEnsemble({ ...newEnsemble, type: e.target.value })}
                className="input"
              >
                <option value="">Select a type...</option>
                <option value="jazz band">Jazz Band</option>
                <option value="orchestra">Orchestra</option>
                <option value="choir">Choir</option>
                <option value="chamber group">Chamber Group</option>
                <option value="marching band">Marching Band</option>
                <option value="rock band">Rock Band</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex-1">
                Create & Join
              </button>
              <button
                type="button"
                onClick={() => setShowCreateEnsemble(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
