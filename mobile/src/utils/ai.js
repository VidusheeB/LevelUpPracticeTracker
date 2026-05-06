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
