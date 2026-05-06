// ─────────────────────────────────────────────────────────────
// Paste your Claude API key here (get one at console.anthropic.com)
const CLAUDE_API_KEY = 'YOUR_CLAUDE_API_KEY_HERE'
// ─────────────────────────────────────────────────────────────

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001' // fast + cost-effective for in-app use

async function callClaude(prompt, maxTokens = 400) {
  if (CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE') {
    throw new Error('Paste your Claude API key into mobile/src/utils/ai.js')
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.content[0].text
}

// Parse natural language into a structured practice task
export async function parseTask(text) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })

  const prompt = `Today is ${dayName}, ${todayStr}. Parse this music practice task description into structured data.

Input: "${text}"

Return ONLY a JSON object — no markdown, no explanation:
{
  "title": "short descriptive title (piece name + focus area)",
  "category": "repertoire",
  "estimated_minutes": 30,
  "difficulty": 3,
  "due_date": null
}

Rules:
- title: concise, e.g. "Autumn Leaves - Solo Changes" not the full sentence
- category: one of repertoire, technique, sight_reading, section_work
- estimated_minutes: number (default 30 if not mentioned)
- difficulty: 1-5 stars based on how hard it sounds (default 3)
- due_date: ISO date string (YYYY-MM-DD) if a deadline is mentioned, otherwise null
  - "by Wednesday" → next Wednesday's date relative to today
  - "by tonight" or "today" → today's date
  - "this week" → next Sunday's date`

  const raw = await callClaude(prompt, 300)
  const clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  return JSON.parse(clean)
}

// Decide the optimal reminder time + write a personalised notification message.
// Claude reads practice notes, due date, and when the user typically practices
// to produce both the message body and the exact send time.
export async function getSmartReminderData(task, notes, recentSessionTimes) {
  const now = new Date()
  const nowStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })

  const dueLine = task.due_date
    ? `Due: ${new Date(task.due_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
    : 'No due date'

  const minutesLeft = Math.max(0, (task.estimated_minutes || 30) - (task.total_time_practiced || 0))

  const notesSection = notes.length > 0
    ? `Practice notes (newest first):\n${notes.map(n => `• ${n.content}`).join('\n')}`
    : 'No practice notes yet.'

  const sessionsSection = recentSessionTimes.length > 0
    ? `Recent session times (shows when they typically practice):\n${recentSessionTimes.map(t => `• ${t}`).join('\n')}`
    : 'No session history.'

  const prompt = `Right now: ${nowStr}

Task: "${task.title}" (${(task.category || 'repertoire').replace('_', ' ')})
${dueLine}
Practiced: ${task.total_time_practiced || 0} / ${task.estimated_minutes || 30} min (${minutesLeft} min remaining)

${notesSection}

${sessionsSection}

You are scheduling a push notification reminder for this student. Decide:
1. The best DATE AND TIME to send it — factor in due date urgency, how much practice remains, and when they historically practice. Must be in the future. If no due date, pick within the next 48 hours.
2. A short notification message (1-2 sentences) that is specific and actionable — reference what they've already mastered from the notes and tell them exactly what to focus on next.

Return ONLY valid JSON, no markdown:
{
  "remind_at": "2026-05-08T18:30:00",
  "message": "Your melody is locked in — tonight nail the ii-V-I at bar 8. 25 min left before Friday."
}`

  const raw = await callClaude(prompt, 300)
  const clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  const result = JSON.parse(clean)

  // Safety: if Claude picked a time in the past, default to tomorrow at 6pm
  const remindAt = new Date(result.remind_at)
  if (isNaN(remindAt.getTime()) || remindAt <= now) {
    const fallback = new Date(now)
    fallback.setDate(fallback.getDate() + 1)
    fallback.setHours(18, 0, 0, 0)
    result.remind_at = fallback.toISOString()
  }

  return result
}

// Generate a personalised coaching tip based on practice history + notes
export async function getCoachingTip(taskTitle, practiceMinutes, notes) {
  const notesSection = notes.length > 0
    ? `Notes from past sessions:\n${notes.map(n => `• ${n.content}`).join('\n')}`
    : 'No practice notes yet.'

  const prompt = `You are a supportive, knowledgeable music coach. Write a short coaching tip (2-3 sentences) for this student's practice task.

Task: "${taskTitle}"
Total time practiced so far: ${practiceMinutes} minutes
${notesSection}

Be specific and actionable. If the notes mention something mastered, focus on what logically comes next. If there are no notes, give a useful starting tip for the task. Sound encouraging, not generic. No bullet points — just natural coach language.`

  return callClaude(prompt, 250)
}
