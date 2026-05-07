import * as SecureStore from 'expo-secure-store'

// ─────────────────────────────────────────────────────────────────────────────
// Paste your Google Cloud OAuth client IDs here.
// Setup instructions are in Profile → Google Calendar section.
// ─────────────────────────────────────────────────────────────────────────────
export const GOOGLE_CLIENT_IDS = {
  iosClientId:     'YOUR_IOS_CLIENT_ID_HERE',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID_HERE',
  webClientId:     'YOUR_WEB_CLIENT_ID_HERE',
}
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'google_cal_tokens'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

// Store access + refresh tokens securely on the device
export async function saveTokens(tokens) {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens))
}

export async function getTokens() {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY)
  return raw ? JSON.parse(raw) : null
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export async function isConnected() {
  const tokens = await getTokens()
  return !!tokens
}

// Refresh an expired access token using the stored refresh token
async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: [
      `client_id=${GOOGLE_CLIENT_IDS.webClientId}`,
      `refresh_token=${encodeURIComponent(refreshToken)}`,
      'grant_type=refresh_token',
    ].join('&'),
  })
  if (!res.ok) throw new Error('Session expired — please reconnect Google Calendar')
  const data = await res.json()
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  }
}

// Returns a valid access token, refreshing automatically if expired
export async function getValidAccessToken() {
  const tokens = await getTokens()
  if (!tokens) throw new Error('Google Calendar not connected')

  // Still valid (with 60s buffer)
  if (tokens.expires_at && Date.now() < tokens.expires_at - 60_000) {
    return tokens.access_token
  }

  // Need to refresh
  if (!tokens.refresh_token) {
    // No refresh token — user must re-authenticate
    throw new Error('Session expired — please reconnect Google Calendar')
  }

  const refreshed = await refreshAccessToken(tokens.refresh_token)
  await saveTokens({ ...tokens, ...refreshed })
  return refreshed.access_token
}

// Fetch the next 90 days of events from the user's primary Google Calendar
export async function fetchGoogleCalendarEvents(accessToken) {
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '150',
  })

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 401) throw new Error('Session expired — please reconnect Google Calendar')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Calendar API error ${res.status}`)
  }

  const data = await res.json()

  return (data.items || [])
    .filter(item => item.summary && !item.status?.includes('cancelled'))
    .map(item => {
      const rawStart = item.start.dateTime || item.start.date
      const isAllDay = !item.start.dateTime
      const date = isAllDay ? rawStart : rawStart.split('T')[0]
      const time = isAllDay ? '09:00' : rawStart.split('T')[1].slice(0, 5)
      return { title: item.summary, date, time }
    })
}
