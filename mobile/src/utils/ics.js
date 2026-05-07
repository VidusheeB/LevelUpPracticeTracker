// Unfold ICS line continuations (lines starting with space/tab are continuations)
function unfold(text) {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
}

function unescapeValue(value) {
  return value
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\n/g, ' ')
    .replace(/\\\\/g, '\\')
    .trim()
}

// Parse DTSTART value (handles all-day DATE and timed DATETIME, UTC or local)
function parseDTStart(raw) {
  // Strip any trailing \r
  const value = raw.replace(/\r/g, '').trim()

  if (value.length === 8) {
    // All-day: YYYYMMDD
    return {
      date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
      time: '09:00',
    }
  }

  // Timed: YYYYMMDDTHHmmss[Z]
  const year  = value.slice(0, 4)
  const month = value.slice(4, 6)
  const day   = value.slice(6, 8)
  const hour  = value.slice(9, 11)
  const min   = value.slice(11, 13)
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${min}`,
  }
}

export function parseICS(text) {
  const unfolded = unfold(text)
  const events = []

  // Split on BEGIN:VEVENT boundaries
  const blocks = unfolded.split(/BEGIN:VEVENT/i)

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]

    // SUMMARY — property name can have params like SUMMARY;LANGUAGE=en:...
    const summaryMatch = block.match(/^SUMMARY[^:\n]*:(.+)$/im)
    if (!summaryMatch) continue
    const title = unescapeValue(summaryMatch[1])

    // DTSTART — may have params: DTSTART;VALUE=DATE:... or DTSTART;TZID=...:...
    const dtMatch = block.match(/^DTSTART[^:\n]*:(.+)$/im)
    if (!dtMatch) continue
    const { date, time } = parseDTStart(dtMatch[1])

    // Skip events in the past (keep today and future)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (new Date(date) < today) continue

    events.push({ title, date, time })
  }

  // Sort ascending by date
  return events.sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchAndParseICS(rawUrl) {
  // Convert webcal:// → https://
  const url = rawUrl.trim().replace(/^webcal:\/\//i, 'https://')

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not fetch calendar (${response.status}). Check the URL and try again.`)

  const text = await response.text()

  if (!text.includes('BEGIN:VCALENDAR')) {
    throw new Error('That URL does not look like a valid ICS calendar file.')
  }

  return parseICS(text)
}
