# PracticeBeats — Claude Context

> Read this at the start of every session. Full feature backlog is in `TODO.md`.

---

## What this app is

**PracticeBeats** — a music practice tracker for ensemble musicians (students + teachers).
Think Duolingo gamification meets Google Calendar scheduling, with Claude as a practice coach.

Target users: high school / college music students and their teachers.
Most differentiating feature: **evidence-based, hyper-specific AI practice recommendations** — not "play something fun", but "spend 10 min on bars 9–16 of the Donnelly B section at 60% tempo using spaced retrieval, because you have AP exams tomorrow and your mood has been low all week."

---

## Tech stack

| Layer | What |
|---|---|
| Mobile app | React Native + Expo (managed workflow), NativeWind (Tailwind) |
| Backend / DB | Supabase (Postgres + Auth + Edge Functions + RLS) |
| AI | Claude API (Haiku 4.5) via direct fetch in `mobile/src/utils/ai.js` |
| Notifications | Expo Push + Supabase Edge Function `deliver-notifications` |
| Calendar | Google Calendar OAuth (`expo-auth-session`) |
| Token storage | `expo-secure-store` (Google OAuth tokens only) |

Legacy: there's also a `frontend/` (React + Vite) and `backend/` (FastAPI) from the original hackathon build — both are effectively deprecated in favour of the mobile app.

---

## Repo structure (what matters)

```
mobile/
  App.js                          # Navigation: bottom tabs + stack screens
  src/
    components/                   # All screens and UI components
    contexts/AppContext.jsx        # Global state: user, tasks, auth, actions
    utils/
      ai.js                       # All Claude API calls (parseTask, recommendations, check-ins)
      supabase.js                  # All DB operations + business logic (XP, streaks, readiness)
      googleAuth.js               # Google OAuth token management + Calendar API fetch
      notifications.js            # Expo push token + local notification scheduling
  app.json                        # Bundle ID: com.practicebeats.app, scheme: practicebeats
supabase/
  functions/deliver-notifications/ # Edge Function: reads scheduled_notifications, sends via Expo
TODO.md                           # Full feature backlog + built inventory
CLAUDE.md                         # This file
```

---

## Supabase project

- **URL**: `https://yqcwvpwzykawwndbyakw.supabase.co`
- **Project ref**: `yqcwvpwzykawwndbyakw`
- All DB operations go through `mobile/src/utils/supabase.js` — the `db` export.

### Tables (all with RLS enabled)
`profiles`, `practice_tasks`, `practice_sessions`, `session_tasks`, `badges`, `notes`, `ensembles`, `ensemble_members`, `assignments`, `assignment_submissions`, `challenges`, `challenge_ensembles`, `calendar_events`, `task_notes`, `mood_logs`, `push_tokens`, `scheduled_notifications`

### SQL still to run (user hasn't confirmed these yet)
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_connected bool DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_synced_at timestamptz;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE mood_logs DROP CONSTRAINT IF EXISTS mood_logs_type_check;
ALTER TABLE mood_logs ADD CONSTRAINT mood_logs_type_check
  CHECK (type IN ('quick', 'deep', 'pre_session'));
```

---

## Key architectural decisions (don't undo these)

- **No FastAPI** — all business logic (XP calc, streak, readiness score) lives client-side in `supabase.js`. Supabase RLS enforces security.
- **Privacy layer** — `sanitizeTask()` and `sanitizeNotes()` in `ai.js` are an explicit allowlist. No user IDs, names, emails, or teacher identifiers ever leave the device toward Anthropic. Don't remove this.
- **Claude API key** — stored as a plaintext constant at the top of `ai.js`. User needs to paste their own key. This is intentional for a student-built app.
- **Google OAuth tokens** — stored in `expo-secure-store` (device-only), NOT in Supabase. `google_calendar_connected` bool on profile is just a display flag.
- **Mood logs** — three types: `quick` (post-session, ~60s), `deep` (weekly reflection, 5-6 Claude questions), `pre_session` (before timer starts, mood + Claude intention question).
- **Calendar events** — `source` column: `manual` (user added), `google` (OAuth sync), `ensemble` (teacher pushed to class).

---

## AI functions in ai.js

| Function | When called | What it does |
|---|---|---|
| `parseTask(text)` | Smart Add | NL → structured task JSON |
| `getPreSessionQuestion(tasks, logs)` | Before practice | Specific intention question |
| `getQuickFollowUp(session, tasks, logs)` | After practice | Specific reflection question |
| `getDeepCheckInQuestions(tasks, logs, events)` | Weekly check-in | 5-6 personalised survey questions |
| `getPracticeRecommendation(tasks, logs, events, sessions)` | Dashboard | Evidence-based plan (method + specific bars + duration) |
| `getCoachingTip(title, minutes, notes)` | Task Detail | 2-3 sentence coaching tip |
| `getSmartReminderData(task, notes, times)` | Task notifications | Message text + optimal send time |

---

## Navigation structure

**Bottom tabs**: Home (Dashboard) · Calendar · Practice (timer, centre FAB) · Tasks or Classes (role-dependent) · Profile

**Stack screens**: Achievements · Messages · EnsembleDetail · AssignmentCreate · AssignmentDetail · ChallengeCreate · ChallengeLeaderboard · StudentEnsembleView · AllStudents (TeacherDashboard) · TaskDetail · PrivacyPolicy · DeepCheckIn (Weekly Reflection)

---

## User roles

- `teacher` — sees Classes tab instead of Tasks, can create ensembles/assignments/challenges, has teacher code
- `student` — linked to teacher via 6-digit code, sees ensemble events + assignments + challenges
- `personal` — not linked to teacher, same as student but no ensemble features (differentiated experience not yet built)

---

## Ideas from Vidushee (capture these, don't lose them)

- **Mood check-in should feel like a conversation**, not a form. Claude prompts questions one at a time — "how are you feeling?", emoji scale, then "name two things you're grateful for", "anything frustrating you?", "what are your goals this week?" — not a static survey.
- **Recommendations must be hyper-specific**, not vague. Not "play something easy". Instead: "spend 10 min on bars 9–16 of the Donnelly B section at 60% tempo — that's the passage your notes say is slipping." Grounded in actual research (Ericsson deliberate practice, cognitive load theory, interleaved vs blocked practice, spaced retrieval, Pomodoro for high-stress periods).
- **Google Calendar context** makes recommendations much smarter — if Claude sees "AP Biology exam tomorrow", it recommends a short targeted session instead of a full drill. This is why OAuth matters.
- **Notebook** should be closer to Google Docs than a text field. Rich text, hyperlinks. AI generates a table of contents. Toggle: "let AI read my notebook" → Claude uses it as extra coaching context.
- **AI Chat screen** — student types "I've been playing these big band charts, recommend similar ones" and Claude knows their full history (tasks, notes, ensemble, mood). Not a generic chatbot — fully context-loaded.
- **UI redesign** — Vidushee sketched: left sidebar nav (vs current bottom tabs), split-pane with activity feed on the right, progress bar at bottom showing hrs / XP / completed this week. "Positive message" card + "How r u feeling" button on the home activity panel.
- **The most differentiated feature in the music ed space** is the evidence-based practice method recommendations. Nothing else does this. Lean into it.

---

## Session log (newest first)

### Session: continue-app-development
- Built ICS calendar import (later replaced with Google OAuth)
- Built `PreSessionCheckIn` — mood + Claude intention question shown before timer starts
- Built `GoogleCalendarConnect` — full OAuth flow, token refresh, disconnect
- Replaced ICS copy-paste with Google sign-in sheet
- Added editable display name + weekly goal to Profile
- Updated `app.json` with bundle ID (`com.practicebeats.app`), scheme (`practicebeats`)
- Installed `expo-auth-session`, `expo-web-browser`, `expo-secure-store`, `expo-crypto`
- Created `TODO.md` and `CLAUDE.md` for persistent context
- Agreed: CLAUDE.md gets updated every session with decisions, ideas, and progress

### Session: document-app-components (prior session)
- Built full Mindful Practice layer: `MindfulCheckIn` (post-session), `DeepCheckIn` (weekly), `TodayRecommendation` (evidence-based plan)
- All AI functions in `ai.js`: `getPreSessionQuestion`, `getQuickFollowUp`, `getDeepCheckInQuestions`, `getPracticeRecommendation`, `getCoachingTip`, `getSmartReminderData`
- Discussed Notebook, AI Chat, avatar builder, UI redesign — all deferred to future sessions
- Decided on two mood modes: quick (every session, ~60s) and deep (weekly, Claude-generated questions)


See `TODO.md` for the full list. Top priorities from previous conversations:

1. **Notebook** — free-form journaling with AI table of contents + "let AI read" toggle. Closest to Google Docs, not a text field.
2. **AI Chat screen** — freeform chat where Claude has full context (tasks, notes, mood logs, ensemble)
3. **Server-side push notifications** — Edge Function exists (`supabase/functions/deliver-notifications/index.ts`) but hasn't been deployed yet. Needs `npx supabase functions deploy deliver-notifications --project-ref yqcwvpwzykawwndbyakw` from inside the repo.
4. **UI redesign** — user sketched left sidebar nav, split-pane layout, activity feed on right, progress bar at bottom. Not started.

---

## Git

- **Active branch**: `claude/continue-app-development-tBZDj`
- Always develop on this branch and push here.
- Never push to `main` without explicit permission.
