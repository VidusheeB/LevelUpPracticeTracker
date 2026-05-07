// Supabase Edge Function — runs every minute via pg_cron
// Finds due notifications, looks up every push token for each user,
// and fires them through Expo's push service → APNs / FCM → lock screen.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // bypasses RLS so we can read all tokens
  )

  // Find all notifications that are due and not yet sent
  const { data: pending, error } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .lte('send_at', new Date().toISOString())
    .eq('sent', false)
    .limit(100)

  if (error) return new Response(`error: ${error.message}`, { status: 500 })
  if (!pending?.length) return new Response('ok — nothing due')

  let sent = 0

  for (const notif of pending) {
    // Get every push token registered to this user (all their devices)
    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', notif.user_id)

    if (tokenRows?.length) {
      // Expo accepts a batch — one call delivers to all devices at once
      const messages = tokenRows.map(({ token }) => ({
        to: token,
        title: notif.title,
        body: notif.body,
        sound: 'default',
        channelId: 'practicebeats', // Android notification channel
        priority: 'high',
      }))

      const pushRes = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      })

      if (!pushRes.ok) {
        console.error(`Expo push failed for notif ${notif.id}:`, await pushRes.text())
      } else {
        sent++
      }
    }

    // Always mark sent to prevent retry loops even if the user has no tokens yet
    await supabase
      .from('scheduled_notifications')
      .update({ sent: true, sent_at: new Date().toISOString() })
      .eq('id', notif.id)
  }

  return new Response(`ok — delivered ${sent} of ${pending.length} notification(s)`)
})
