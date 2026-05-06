import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { useNavigation } from '@react-navigation/native'

const LAST_UPDATED = 'May 2026'
const CONTACT_EMAIL = 'privacy@practicebeats.app'
const SUPABASE_PRIVACY = 'https://supabase.com/privacy'
const ANTHROPIC_PRIVACY = 'https://www.anthropic.com/privacy'

function Section({ title, children }) {
  return (
    <View className="mb-6">
      <Text className="text-base font-bold text-gray-900 mb-2">{title}</Text>
      {children}
    </View>
  )
}

function Body({ children }) {
  return <Text className="text-sm text-gray-600 leading-relaxed">{children}</Text>
}

function Bullet({ children }) {
  return (
    <View className="flex-row gap-2 mb-1.5">
      <Text className="text-gray-400 text-sm mt-0.5">•</Text>
      <Text className="text-sm text-gray-600 leading-relaxed flex-1">{children}</Text>
    </View>
  )
}

function Link({ url, children }) {
  return (
    <Text
      className="text-indigo-500 underline"
      onPress={() => Linking.openURL(url)}
    >
      {children}
    </Text>
  )
}

export default function PrivacyPolicy() {
  const navigation = useNavigation()

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-5 pt-5 pb-16">

      <Text className="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</Text>
      <Text className="text-sm text-gray-400 mb-6">Last updated: {LAST_UPDATED}</Text>

      <Body>
        PracticeBeats ("we", "our", or "the app") is a music practice tracker. This policy
        explains what data we collect, where it goes, and how AI features work — including
        what is and is not sent to third-party services.
      </Body>

      {/* ── Data we collect ────────────────────────────────────────── */}
      <View className="h-px bg-gray-100 my-5" />
      <Section title="Data We Collect">
        <Body>When you use PracticeBeats, we store the following:</Body>
        <View className="mt-2 gap-0">
          <Bullet>Account info — email address, display name, instrument</Bullet>
          <Bullet>Practice sessions — date, duration, focus rating, points earned</Bullet>
          <Bullet>Practice tasks — title, category, estimated time, readiness score</Bullet>
          <Bullet>Practice notes — text you write per task after practicing</Bullet>
          <Bullet>Calendar events — titles and dates you add to your calendar</Bullet>
          <Bullet>Class/ensemble membership — if a teacher links you to their class</Bullet>
          <Bullet>Assignment submissions and teacher feedback (if applicable)</Bullet>
        </View>
      </Section>

      {/* ── Where data is stored ────────────────────────────────────── */}
      <Section title="Where Your Data Is Stored">
        <Body>
          All account data, practice history, notes, and class information is stored in{' '}
          <Link url={SUPABASE_PRIVACY}>Supabase</Link>, a cloud database provider. Data is
          encrypted in transit (TLS) and at rest. See Supabase's privacy policy for details
          on their data handling, storage location, and certifications.
        </Body>
        <View className="mt-3 bg-gray-50 rounded-xl p-3">
          <Text className="text-xs text-gray-500">
            We do not sell your data. We do not share it with advertisers. We do not build
            advertising profiles.
          </Text>
        </View>
      </Section>

      {/* ── AI features ─────────────────────────────────────────────── */}
      <Section title="AI Features and Third-Party AI Services">
        <Body>
          PracticeBeats includes optional AI features powered by Claude, made by{' '}
          <Link url={ANTHROPIC_PRIVACY}>Anthropic</Link>. These features are:
        </Body>
        <View className="mt-2">
          <Bullet>
            <Text className="font-medium">Smart Task creation</Text> — you describe a task in natural language and Claude structures it into a task (title, category, due date, estimated time).
          </Bullet>
          <Bullet>
            <Text className="font-medium">AI Coaching tips</Text> — Claude reads your practice notes and time logged to generate personalised guidance on what to work on next.
          </Bullet>
          <Bullet>
            <Text className="font-medium">Smart reminders</Text> — Claude decides when to send a practice reminder and writes the notification body based on your notes and practice history.
          </Bullet>
        </View>

        <View className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4 gap-3">
          <Text className="text-sm font-semibold text-amber-900">What is sent to Anthropic</Text>
          <Bullet>Task names (e.g. "Autumn Leaves — Solo Changes")</Bullet>
          <Bullet>Practice notes you have written for that task</Bullet>
          <Bullet>Timestamps of your recent practice sessions (day and time only — no names or identifiers)</Bullet>
          <Bullet>Today's date and time</Bullet>

          <Text className="text-sm font-semibold text-amber-900 mt-1">What is never sent to Anthropic</Text>
          <Bullet>Your name, email address, or any account identifier</Bullet>
          <Bullet>Your teacher's name or contact details</Bullet>
          <Bullet>Other students' data</Bullet>
          <Bullet>Any data from other tasks you are not currently viewing</Bullet>
        </View>

        <View className="mt-4 gap-2">
          <Body>
            <Text className="font-medium">Does Anthropic train on your data?</Text>
            {'\n'}No. Per Anthropic's API terms of service, inputs and outputs from the API are
            not used to train their models. Anthropic may retain API request data for up to
            30 days for safety review purposes, after which it is deleted.
          </Body>
          <Body>
            <Text className="font-medium">Can I use the app without AI features?</Text>
            {'\n'}Yes. AI features are opt-in. Skip the "✨ Smart Add" button and "Get Tip"
            button and no data will ever leave your device to Anthropic. Your notes stay in
            Supabase only.
          </Body>
        </View>
      </Section>

      {/* ── Notifications ───────────────────────────────────────────── */}
      <Section title="Notifications">
        <Body>
          PracticeBeats uses local scheduled notifications to remind you about practice
          tasks and calendar events. These notifications are stored and triggered entirely
          on your device. When AI reminders are enabled, the notification message is
          generated by Claude (see above) but the scheduling itself is local.
        </Body>
      </Section>

      {/* ── Children ────────────────────────────────────────────────── */}
      <Section title="Children's Privacy (COPPA)">
        <View className="bg-red-50 border border-red-100 rounded-xl p-4 mb-3">
          <Text className="text-sm font-semibold text-red-800 mb-1">For users under 13</Text>
          <Text className="text-sm text-red-700 leading-relaxed">
            PracticeBeats is not directed at children under 13. If you are under 13, please
            use this app only with a parent or guardian's knowledge and consent.
          </Text>
        </View>
        <Body>
          <Text className="font-medium">For teachers using this app with students:{'\n'}</Text>
          You are responsible for obtaining any necessary parental consent before having
          students create accounts. If AI features will be used with students' data, we
          recommend informing parents that anonymised practice notes (no names or identifiers)
          may be sent to Anthropic's API for coaching purposes, and that students can opt out
          by not using the AI buttons.
        </Body>
      </Section>

      {/* ── Your rights ─────────────────────────────────────────────── */}
      <Section title="Your Rights">
        <Bullet>
          <Text className="font-medium">Access:</Text> You can see all your data in the app at any time.
        </Bullet>
        <Bullet>
          <Text className="font-medium">Deletion:</Text> To delete your account and all associated data,
          email us at the address below. We will process deletion within 30 days.
        </Bullet>
        <Bullet>
          <Text className="font-medium">Opt out of AI:</Text> Simply do not use Smart Add or AI coaching.
          No opt-out request needed — not pressing the button means nothing is sent.
        </Bullet>
        <Bullet>
          <Text className="font-medium">California / GDPR:</Text> If you have additional rights under
          CCPA or GDPR, contact us and we will assist.
        </Bullet>
      </Section>

      {/* ── Contact ─────────────────────────────────────────────────── */}
      <Section title="Contact">
        <Body>
          Questions about this policy or data deletion requests:{'\n'}
        </Body>
        <Text
          className="text-indigo-500 text-sm font-medium"
          onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
        >
          {CONTACT_EMAIL}
        </Text>
      </Section>

      <View className="h-px bg-gray-100 mb-5" />
      <Text className="text-xs text-gray-400 text-center">
        PracticeBeats · Privacy Policy · {LAST_UPDATED}
      </Text>

    </ScrollView>
  )
}
