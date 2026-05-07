import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useApp } from '../contexts/AppContext'

export default function Login() {
  const { login, register } = useApp()

  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [instrument, setInstrument] = useState('')
  const [section, setSection] = useState('brass')
  const [role, setRole] = useState('personal')
  const [teacherCode, setTeacherCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    if (isRegistering && !name.trim()) { setError('Please enter your name'); return }
    if (!email.trim()) { setError('Please enter your email'); return }
    if (!password.trim()) { setError('Please enter your password'); return }

    setLoading(true)
    try {
      if (isRegistering) {
        const userData = { name, email, password, instrument, section, role }
        if (role === 'student' && teacherCode) userData.teacher_code_to_join = teacherCode
        await register(userData)
      } else {
        await login(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const roleOptions = [
    { value: 'personal', label: 'Personal', emoji: '🎵' },
    { value: 'student', label: 'Student', emoji: '📚' },
    { value: 'teacher', label: 'Teacher', emoji: '👩‍🏫' },
  ]

  const sectionOptions = [
    { value: 'brass', label: 'Brass' },
    { value: 'woodwind', label: 'Woodwind' },
    { value: 'strings', label: 'Strings' },
    { value: 'rhythm', label: 'Rhythm' },
    { value: 'vocals', label: 'Vocals' },
  ]

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-indigo-600"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow items-center justify-center p-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* Mascot */}
        <View className="items-center mb-8">
          <Text className="text-8xl">🎵</Text>
          <Text className="text-3xl font-bold text-white mt-4">PracticeBeats</Text>
          <Text className="text-indigo-200 mt-2">Don't miss a beat!</Text>
        </View>

        {/* Form Card */}
        <View className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
          <Text className="text-xl font-semibold text-center mb-6">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </Text>

          {/* Name (register only) */}
          {isRegistering && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Your Name</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                value={name}
                onChangeText={setName}
                placeholder="Alex Rivera"
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Registration-only fields */}
          {isRegistering && (
            <>
              {/* Role */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">I am a...</Text>
                <View className="flex-row gap-2">
                  {roleOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setRole(opt.value)}
                      className={`flex-1 p-3 rounded-xl border-2 items-center ${
                        role === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                      }`}
                    >
                      <Text className="text-2xl mb-1">{opt.emoji}</Text>
                      <Text className="text-xs font-medium">{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Teacher code (students only) */}
              {role === 'student' && (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Teacher Code (optional)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-center text-lg tracking-widest"
                    value={teacherCode}
                    onChangeText={setTeacherCode}
                    placeholder="000000"
                    maxLength={6}
                    keyboardType="number-pad"
                  />
                  <Text className="text-xs text-gray-500 mt-1">Ask your teacher for their code</Text>
                </View>
              )}

              {role === 'teacher' && (
                <View className="mb-4 bg-blue-50 p-3 rounded-lg">
                  <Text className="text-sm text-blue-700">After registration, you'll get a code to share with students.</Text>
                </View>
              )}

              {/* Instrument */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Instrument</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                  value={instrument}
                  onChangeText={setInstrument}
                  placeholder="Trumpet"
                />
              </View>

              {/* Section */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Section</Text>
                <View className="flex-row flex-wrap gap-2">
                  {sectionOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setSection(opt.value)}
                      className={`px-3 py-2 rounded-lg border ${
                        section === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${section === opt.value ? 'text-indigo-600' : 'text-gray-600'}`}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Error */}
          {!!error && (
            <Text className="text-red-500 text-sm text-center mb-4">{error}</Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center mb-4 ${loading ? 'bg-indigo-300' : 'bg-indigo-500'}`}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white font-semibold text-base">
              {loading ? 'Loading...' : isRegistering ? 'Create Account' : 'Login'}
            </Text>
          </TouchableOpacity>

          {/* Toggle */}
          <View className="flex-row justify-center gap-1">
            <Text className="text-gray-500">
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => { setIsRegistering(!isRegistering); setError('') }}>
              <Text className="text-indigo-500 font-medium">
                {isRegistering ? 'Login' : 'Register'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        <Text className="text-indigo-200 text-sm mt-6 text-center">
          Track your practice, build your streak, nail the rehearsal!
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
