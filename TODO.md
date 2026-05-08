# PracticeBeats — Build Tracker

## Blockers (manual steps required)

- [x] Run SQL migrations in Supabase — all tables and columns confirmed created ✅
- [ ] Set up Google Cloud Console OAuth credentials → paste iOS, Android, Web client IDs into `mobile/src/utils/googleAuth.js`
- [ ] Add Claude API key to `mobile/src/utils/ai.js`

---

## Features To Build

### High priority
- [x] **Notebook** — free-form per-user notebook (session reflections, music writing, lesson notes)
  - AI-generated table of contents ✅
  - "Let AI read my notebook" toggle → Claude uses it as extra context for coaching ✅
  - Post-session prompt to add a reflection ✅
  - ⚠️ **SQL still needed** — run in Supabase before testing:
    ```sql
    -- Add ai_read_notebook column to profiles
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_read_notebook BOOLEAN DEFAULT FALSE;

    -- Create notebook_entries table
    CREATE TABLE IF NOT EXISTS notebook_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      tags TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users manage own notebook entries" ON notebook_entries
      FOR ALL USING (auth.uid() = user_id);

    CREATE INDEX IF NOT EXISTS notebook_entries_user_id_idx ON notebook_entries(user_id);
    CREATE INDEX IF NOT EXISTS notebook_entries_updated_at_idx ON notebook_entries(updated_at DESC);
    ```
- [x] **AI Chat screen** — freeform Claude chat with full app context loaded in (tasks, mood logs, sessions, calendar, notebook)
- [ ] **Server-side push notifications** — Expo Push Tokens + Supabase Edge Function `deliver-notifications` (currently local-only)

### Medium priority
- [ ] **Image attachments in messaging** — teacher ↔ student messages with photo support (like iMessage)
- [ ] **Username / display name** — separate from login email; shown on leaderboards and profile
- [ ] **Personal role experience** — differentiated home screen for users not linked to a teacher

### Larger / needs design time
- [ ] **Custom avatar builder** — pick instrument, style, colours
- [ ] **UI redesign** — left sidebar nav, split-pane with activity feed on right, progress bar at bottom (hrs / XP / completed this week)
- [ ] **Apple Sign-In** — required by App Store if any social login is added

### App Store prep
- [ ] App icon + splash screen polish
- [ ] TestFlight setup
- [ ] Screenshots + App Store description
- [ ] Privacy policy URL

---

## Built ✅

- Email + password auth, teacher / student / personal roles
- Teacher 6-digit code, student joins via code, session persistence
- Dashboard: weekly goal ring, streak, XP/level, challenge banners, task preview
- Practice timer: focus/progress/energy ratings, XP calc, streak + badge awarding
- Tasks: filter tabs, manual create, Smart Add (Claude structures natural language), Task Detail, readiness bar
- Practice notes (per-task AI memory), AI coaching tip, smart notifications (Claude picks message + send time)
- Calendar: month grid, dot indicators, personal + class events, assignment due dates, day-before reminders
- Classes (teacher): create/archive/delete, add/remove students, roster
- Assignments: create → auto-task per student, readiness tracking, grade + feedback
- Challenges: XP sprint + minutes types, individual + class-vs-class leaderboards
- Mindful Practice layer: pre-session check-in (mood + Claude intention question), post-session quick reflection, weekly deep check-in (Claude generates personalised 5-6 question survey)
- Today's Practice Plan: evidence-based recommendation (deliberate practice, spaced retrieval, Pomodoro, cognitive load) — specific task, bars, method, duration
- Google Calendar OAuth: connect via Google sign-in, syncs 90 days of events, auto-refresh tokens, disconnect
- Profile: editable name, editable weekly goal, Google Calendar connect section, teacher code, achievements link
- Messaging: teacher ↔ student text notes
- Achievements: 8 badge types
- Privacy Policy screen + AI data sanitisation layer (allowlist, no PII to Anthropic)
- Push notification infrastructure: Expo token registration + Supabase Edge Function `deliver-notifications` (needs deployment)
