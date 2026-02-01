/**
 * =============================================================================
 * LOGIN.JSX - Login/Register Screen
 * =============================================================================
 * The first screen users see if not logged in.
 * Features our friendly metronome mascot!
 *
 * MVP APPROACH:
 * - Simple email-based login (no passwords for hackathon)
 * - Can switch between login and register modes
 * - Demo accounts listed for easy testing
 *
 * UI ELEMENTS:
 * - Metronome mascot with encouraging message
 * - Email input
 * - For registration: name, instrument, section fields
 * - Demo account quick-login buttons
 * =============================================================================
 */

import { useState } from 'react'
import { useApp } from '../contexts/AppContext'


export default function Login() {
  const { login, register } = useApp()

  // Form state
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [instrument, setInstrument] = useState('')
  const [section, setSection] = useState('brass')
  const [role, setRole] = useState('personal')
  const [teacherCode, setTeacherCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')


  // ---------------------------------------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegistering) {
        const userData = { name, email, instrument, section, role }
        if (role === 'student' && teacherCode) {
          userData.teacher_code_to_join = teacherCode
        }
        await register(userData)
      } else {
        await login(email)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Quick login with demo account
  const handleDemoLogin = async (demoEmail) => {
    setEmail(demoEmail)
    setError('')
    setLoading(true)
    try {
      await login(demoEmail)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* ===================================================================
            MASCOT HEADER
            Our friendly metronome encourages users!
            =================================================================== */}
        <div className="text-center mb-8">
          {/* Metronome mascot with eyes */}
          <div className="relative inline-block">
            <div className="text-8xl">🎵</div>
            {/* Cute eyes overlay */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex gap-3">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
              </div>
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mt-4">PracticeBeats</h1>
          <p className="text-purple-200 mt-2">Don't miss a beat!</p>
        </div>


        {/* ===================================================================
            LOGIN/REGISTER FORM
            =================================================================== */}
        <div className="bg-white rounded-3xl shadow-xl p-8">

          <h2 className="text-xl font-semibold text-center mb-6">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name field (register only) */}
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="input"
                  required
                />
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@demo.com"
                className="input"
                required
              />
            </div>

            {/* Registration fields */}
            {isRegistering && (
              <>
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    I am a...
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'personal', label: 'Personal', emoji: '🎵' },
                      { value: 'student', label: 'Student', emoji: '📚' },
                      { value: 'teacher', label: 'Teacher', emoji: '👩‍🏫' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRole(option.value)}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          role === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{option.emoji}</div>
                        <div className="text-xs font-medium">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teacher code field for students */}
                {role === 'student' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teacher Code (optional)
                    </label>
                    <input
                      type="text"
                      value={teacherCode}
                      onChange={(e) => setTeacherCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="input text-center text-lg tracking-widest"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ask your teacher for their code to connect
                    </p>
                  </div>
                )}

                {/* Show code info for teachers */}
                {role === 'teacher' && (
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                    After registration, you'll get a unique code to share with your students.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instrument
                  </label>
                  <input
                    type="text"
                    value={instrument}
                    onChange={(e) => setInstrument(e.target.value)}
                    placeholder="Trumpet"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="input"
                  >
                    <option value="brass">Brass</option>
                    <option value="woodwind">Woodwind</option>
                    <option value="strings">Strings</option>
                    <option value="rhythm">Rhythm Section</option>
                    <option value="vocals">Vocals</option>
                  </select>
                </div>
              </>
            )}

            {/* Error message */}
            {error && (
              <p className="text-danger text-sm text-center">{error}</p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Loading...' : (isRegistering ? 'Create Account' : 'Login')}
            </button>
          </form>

          {/* Toggle login/register */}
          <p className="text-center text-gray-500 mt-4">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-primary font-medium ml-1 hover:underline"
            >
              {isRegistering ? 'Login' : 'Register'}
            </button>
          </p>


          {/* ================================================================
              DEMO ACCOUNTS
              Quick login buttons for testing/demo
              ================================================================ */}
          {!isRegistering && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 text-center mb-3">
                Quick Demo Login:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { email: 'alex@demo.com', label: 'Alex', emoji: '🎺' },
                  { email: 'sam@demo.com', label: 'Sam', emoji: '🎹' },
                  { email: 'jordan@demo.com', label: 'Jordan', emoji: '🎷' },
                ].map((demo) => (
                  <button
                    key={demo.email}
                    onClick={() => handleDemoLogin(demo.email)}
                    disabled={loading}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm
                               transition-colors flex items-center gap-1"
                  >
                    <span>{demo.emoji}</span>
                    <span>{demo.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* Footer tagline */}
        <p className="text-center text-purple-200 text-sm mt-6">
          Track your practice, build your streak, nail the rehearsal!
        </p>
      </div>
    </div>
  )
}
