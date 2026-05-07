import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useState, useEffect } from 'react'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { useApp } from '../contexts/AppContext'
import {
  GOOGLE_CLIENT_IDS,
  saveTokens,
  getTokens,
  clearTokens,
  getValidAccessToken,
} from '../utils/googleAuth'

// Required for the OAuth redirect to complete inside the app
WebBrowser.maybeCompleteAuthSession()

const CLIENT_IDS_SET =
  GOOGLE_CLIENT_IDS.iosClientId !== 'YOUR_IOS_CLIENT_ID_HERE' ||
  GOOGLE_CLIENT_IDS.webClientId !== 'YOUR_WEB_CLIENT_ID_HERE'

// Renders the Google Calendar connect / sync / disconnect UI block.
// Designed to drop into Profile.jsx as a self-contained section.
// Props: onSyncComplete(eventCount) — called after a successful sync
export default function GoogleCalendarConnect({ onSyncComplete }) {
  const { syncGoogleCalendar, setToast } = useApp()
  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)

  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      iosClientId:     GOOGLE_CLIENT_IDS.iosClientId,
      androidClientId: GOOGLE_CLIENT_IDS.androidClientId,
      webClientId:     GOOGLE_CLIENT_IDS.webClientId,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      // Request offline access so we get a refresh token and don't need
      // to re-authenticate every hour
      extraParams: { access_type: 'offline', prompt: 'consent' },
    }
  )

  // Check stored tokens on mount
  useEffect(() => {
    getTokens().then(t => {
      if (t) {
        setConnected(true)
        setLastSynced(t.synced_at || null)
      }
    })
  }, [])

  // Handle the OAuth response
  useEffect(() => {
    if (!response) return
    if (response.type === 'success') {
      const auth = response.authentication
      handleAuthSuccess(auth)
    } else if (response.type === 'error') {
      setToast('Google sign-in failed — try again', 'error')
    }
  }, [response])

  const handleAuthSuccess = async (auth) => {
    const tokens = {
      access_token:  auth.accessToken,
      refresh_token: auth.refreshToken || null,
      expires_at:    Date.now() + (auth.expiresIn || 3600) * 1000,
    }
    await saveTokens(tokens)
    setConnected(true)
    await runSync(auth.accessToken)
  }

  const runSync = async (accessToken) => {
    setSyncing(true)
    try {
      const token = accessToken || await getValidAccessToken()
      const count = await syncGoogleCalendar(token)
      const now = new Date().toISOString()
      // Persist synced_at alongside the tokens
      const existing = await getTokens()
      if (existing) await saveTokens({ ...existing, synced_at: now })
      setLastSynced(now)
      onSyncComplete?.(count)
      setToast(`Synced ${count} upcoming event${count !== 1 ? 's' : ''} from Google Calendar`, 'success')
    } catch (err) {
      if (err.message.includes('expired') || err.message.includes('reconnect')) {
        // Token expired and no refresh token — clear and ask user to re-auth
        await clearTokens()
        setConnected(false)
        setToast('Session expired — tap Connect to reconnect', 'error')
      } else {
        setToast(err.message, 'error')
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google Calendar',
      'This will remove all imported Google Calendar events from PracticeBeats.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearTokens()
            await syncGoogleCalendar(null) // null = clear events
            setConnected(false)
            setLastSynced(null)
            setToast('Google Calendar disconnected', 'success')
          },
        },
      ]
    )
  }

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm gap-3">
      {/* Header */}
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
          <Text style={{ fontSize: 22 }}>📅</Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">Google Calendar</Text>
          <Text className="text-xs text-gray-400">
            Claude reads your events to tailor practice plans
          </Text>
        </View>
        {connected && (
          <View className="flex-row items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
            <View className="w-2 h-2 rounded-full bg-green-500" />
            <Text className="text-xs text-green-600 font-medium">Connected</Text>
          </View>
        )}
      </View>

      {/* Not configured warning */}
      {!CLIENT_IDS_SET && (
        <View className="bg-amber-50 rounded-xl px-3 py-2">
          <Text className="text-amber-700 text-xs leading-relaxed">
            Google client IDs not set. Add them to{' '}
            <Text className="font-mono">mobile/src/utils/googleAuth.js</Text>{' '}
            after completing the Google Cloud Console setup below.
          </Text>
        </View>
      )}

      {/* Setup instructions (only when not connected) */}
      {!connected && (
        <View className="bg-gray-50 rounded-xl p-3 gap-2">
          <Text className="text-xs font-semibold text-gray-600">One-time Google Cloud setup</Text>
          {[
            'Go to console.cloud.google.com → New Project "PracticeBeats"',
            'Enable "Google Calendar API"',
            'APIs & Services → Credentials → OAuth consent screen (External, add calendar.readonly scope)',
            'Create Credentials → OAuth 2.0 Client ID:\n  • iOS → Bundle ID: com.practicebeats.app\n  • Android → Package: com.practicebeats.app\n  • Web → Redirect URI: https://auth.expo.io/@your-expo-username/practicebeats',
            'Paste the 3 client IDs into mobile/src/utils/googleAuth.js',
          ].map((step, i) => (
            <View key={i} className="flex-row gap-2">
              <Text className="text-xs text-indigo-500 font-bold w-4">{i + 1}.</Text>
              <Text className="text-xs text-gray-600 flex-1 leading-relaxed">{step}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Last synced */}
      {connected && lastSynced && (
        <Text className="text-xs text-gray-400 text-center">
          Last synced{' '}
          {new Date(lastSynced).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
          })}
        </Text>
      )}

      {/* Actions */}
      {connected ? (
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => runSync(null)}
            disabled={syncing}
            className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${syncing ? 'bg-gray-100' : 'bg-indigo-500'}`}
          >
            {syncing && <ActivityIndicator size="small" color="#9ca3af" />}
            <Text className={`font-medium text-sm ${syncing ? 'text-gray-400' : 'text-white'}`}>
              {syncing ? 'Syncing...' : 'Re-sync'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDisconnect}
            className="px-4 py-3 rounded-xl bg-red-50 items-center"
          >
            <Text className="text-red-500 font-medium text-sm">Disconnect</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => promptAsync()}
          disabled={!request || !CLIENT_IDS_SET}
          className={`py-3 rounded-xl items-center ${!request || !CLIENT_IDS_SET ? 'bg-gray-100' : 'bg-blue-500'}`}
        >
          <Text className={`font-semibold text-sm ${!request || !CLIENT_IDS_SET ? 'text-gray-400' : 'text-white'}`}>
            Connect Google Calendar
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
