/**
 * =============================================================================
 * ACHIEVEMENTS.JSX - Badges & XP Guide
 * =============================================================================
 * Shows all available badges and explains the XP/leveling system.
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'


// Badge definitions with unlock criteria
const ALL_BADGES = [
  { type: 'first_session', name: 'First Steps', icon: '🎵', description: 'Complete your first practice session' },
  { type: 'streak_3', name: 'On a Roll', icon: '🔥', description: 'Maintain a 3-day practice streak' },
  { type: 'streak_7', name: 'Week Warrior', icon: '⚡', description: 'Maintain a 7-day practice streak' },
  { type: 'streak_30', name: 'Unstoppable', icon: '🏆', description: 'Maintain a 30-day practice streak' },
  { type: 'marathon', name: 'Marathon', icon: '🏃', description: 'Complete a 60+ minute practice session' },
  { type: 'perfect_focus', name: 'Laser Focus', icon: '🎯', description: 'Rate your focus 5 stars in a session' },
  { type: 'early_bird', name: 'Early Bird', icon: '🌅', description: 'Practice before 8am' },
  { type: 'night_owl', name: 'Night Owl', icon: '🦉', description: 'Practice after 10pm' },
]


export default function Achievements() {
  const { user } = useApp()
  const [earnedBadges, setEarnedBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBadges = async () => {
      if (!user?.id) return
      try {
        const badges = await api.getUserBadges(user.id)
        setEarnedBadges(badges.map(b => b.badge_type))
      } catch (error) {
        console.error('Failed to load badges:', error)
      } finally {
        setLoading(false)
      }
    }
    loadBadges()
  }, [user?.id])


  return (
    <div className="space-y-6 pb-4">

      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
        <p className="text-gray-500">Earn badges and level up!</p>
      </header>


      {/* =================================================================
          XP SYSTEM
          ================================================================= */}
      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>💎</span> How XP Works
        </h2>

        <div className="space-y-4 text-sm">
          {/* Base XP */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">1</div>
            <div>
              <p className="font-medium text-gray-900">Base XP</p>
              <p className="text-gray-500">1 XP per minute of practice</p>
            </div>
          </div>

          {/* Streak Multiplier */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">🔥</div>
            <div>
              <p className="font-medium text-gray-900">Streak Bonus</p>
              <div className="text-gray-500 space-y-1">
                <p>3+ days: <span className="text-orange-500 font-medium">1.2x</span> multiplier</p>
                <p>7+ days: <span className="text-orange-500 font-medium">1.5x</span> multiplier</p>
                <p>30+ days: <span className="text-orange-500 font-medium">2x</span> multiplier!</p>
              </div>
            </div>
          </div>

          {/* Quality Bonus */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">⭐</div>
            <div>
              <p className="font-medium text-gray-900">Focus Bonus</p>
              <p className="text-gray-500">Rate focus 4-5 stars: <span className="text-yellow-600 font-medium">+20%</span> XP</p>
            </div>
          </div>
        </div>

        {/* Example calculation */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Example:</p>
          <p className="text-sm text-gray-700">
            30 min practice + 7-day streak + high focus = <span className="font-bold text-primary">54 XP</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">30 × 1.5 × 1.2 = 54</p>
        </div>
      </section>


      {/* =================================================================
          LEVELS
          ================================================================= */}
      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>⭐</span> Levels
        </h2>

        <p className="text-sm text-gray-500 mb-4">
          Every <span className="font-medium text-primary">100 XP</span> = 1 level up!
        </p>

        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          {[1, 2, 3, 4, 5, 10, 15, 20, 25, 50].map((level) => (
            <div
              key={level}
              className={`p-2 rounded-lg ${
                user?.level >= level
                  ? 'bg-primary/10 text-primary'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <p className="font-bold">Lv {level}</p>
              <p className="text-xs">{(level - 1) * 100} XP</p>
            </div>
          ))}
        </div>
      </section>


      {/* =================================================================
          BADGES
          ================================================================= */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>🏅</span> Badges
          <span className="text-sm font-normal text-gray-500">
            ({earnedBadges.length}/{ALL_BADGES.length})
          </span>
        </h2>

        {loading ? (
          <div className="card text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {ALL_BADGES.map((badge) => {
              const earned = earnedBadges.includes(badge.type)
              return (
                <div
                  key={badge.type}
                  className={`card p-4 ${
                    earned ? 'bg-white' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-3xl ${earned ? '' : 'grayscale'}`}>
                      {badge.icon}
                    </span>
                    <div>
                      <p className={`font-medium ${earned ? 'text-gray-900' : 'text-gray-500'}`}>
                        {badge.name}
                      </p>
                      <p className="text-xs text-gray-500">{badge.description}</p>
                    </div>
                  </div>
                  {earned && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✓ Earned!
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
