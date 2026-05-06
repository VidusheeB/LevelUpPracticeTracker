import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function requestNotificationPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('practicebeats', {
      name: 'PracticeBeats',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    })
  }
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// Schedule a day-before reminder for a calendar event
export async function scheduleEventReminder(eventId, title, dateStr, eventTime = '09:00') {
  try {
    const [h, m] = (eventTime || '09:00').split(':').map(Number)
    const eventDate = new Date(dateStr)
    eventDate.setHours(h, m, 0, 0)

    const dayBefore = new Date(eventDate)
    dayBefore.setDate(dayBefore.getDate() - 1)
    dayBefore.setHours(8, 0, 0, 0)

    if (dayBefore <= new Date()) return

    await Notifications.scheduleNotificationAsync({
      identifier: `event-${eventId}`,
      content: {
        title: 'PracticeBeats 🎵',
        body: `Reminder: "${title}" is tomorrow`,
        sound: 'default',
      },
      trigger: { date: dayBefore, channelId: 'practicebeats' },
    })
  } catch {}
}

// Schedule a morning-of reminder for a task due date
export async function scheduleTaskDueReminder(taskId, title, dueDateStr) {
  try {
    const dueDate = new Date(dueDateStr)
    dueDate.setHours(8, 0, 0, 0)

    if (dueDate <= new Date()) return

    await Notifications.scheduleNotificationAsync({
      identifier: `task-${taskId}`,
      content: {
        title: 'PracticeBeats 🎵',
        body: `Finish "${title}" by tonight`,
        sound: 'default',
      },
      trigger: { date: dueDate, channelId: 'practicebeats' },
    })
  } catch {}
}

export async function cancelEventReminder(eventId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(`event-${eventId}`)
  } catch {}
}

export async function cancelTaskReminder(taskId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(`task-${taskId}`)
  } catch {}
}

// Idempotent: cancel existing, reschedule all upcoming
export async function scheduleAllReminders(events = [], tasks = []) {
  const granted = await requestNotificationPermissions()
  if (!granted) return

  const today = new Date()

  for (const event of events) {
    if (!event.date) continue
    const d = new Date(event.date)
    if (d >= today) {
      await scheduleEventReminder(event.id, event.title, event.date, event.event_time)
    }
  }

  for (const task of tasks) {
    if (!task.due_date) continue
    const d = new Date(task.due_date)
    if (d >= today) {
      await scheduleTaskDueReminder(task.id, task.title, task.due_date)
    }
  }
}
