import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
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

// Register this device's Expo push token in Supabase so the edge function
// can reach it. Called once per login — safe to call multiple times (upserts).
// saveTokenFn should be db.savePushToken bound to the user's id.
export async function registerPushToken(userId, saveTokenFn) {
  try {
    const granted = await requestNotificationPermissions()
    if (!granted) return

    // projectId comes from eas.json after running `eas init`
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {}
    )

    await saveTokenFn(userId, tokenData.data, Platform.OS)
  } catch (err) {
    // Silent — push registration fails gracefully in Expo Go dev builds
    // that haven't been configured with EAS yet
    console.log('Push token registration skipped:', err.message)
  }
}

// ─── Calendar event reminders (local — these are personal, single-device) ───

// Schedule a day-before reminder for a calendar event (stays local/on-device)
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

export async function cancelEventReminder(eventId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(`event-${eventId}`)
  } catch {}
}

// Schedule local reminders for calendar events and tasks with due dates.
// Task smart reminders now go through the server (db.scheduleNotification),
// but we keep local scheduling for calendar events and basic task due dates
// as a fallback for devices that haven't registered a push token yet.
export async function scheduleAllReminders(events = [], tasks = []) {
  const granted = await requestNotificationPermissions()
  if (!granted) return

  const today = new Date()

  for (const event of events) {
    if (!event.date) continue
    if (new Date(event.date) >= today) {
      await scheduleEventReminder(event.id, event.title, event.date, event.event_time)
    }
  }
}
