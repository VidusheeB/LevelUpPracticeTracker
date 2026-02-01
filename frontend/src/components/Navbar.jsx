/**
 * =============================================================================
 * NAVBAR.JSX - Bottom Navigation Bar
 * =============================================================================
 * Fixed bottom navigation like mobile apps (Duolingo-style).
 *
 * TABS:
 * - Home (Dashboard): Stats and today's practice
 * - Calendar: View rehearsals and practice history
 * - Practice (center, prominent): Start practice session
 * - Team: Ensemble dashboard, leaderboard
 * - Tasks: Full task list
 *
 * The Practice button is larger and centered to encourage users to practice!
 * =============================================================================
 */

import { NavLink } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'


export default function Navbar() {
  const { user } = useApp()

  // ---------------------------------------------------------------------------
  // NAV ITEMS (Teachers see Students tab, Students see Messages + Team tabs)
  // ---------------------------------------------------------------------------
  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/calendar', label: 'Calendar', icon: '📅' },
    { path: '/practice', label: 'Practice', icon: '▶️', isPrimary: true },
    ...(isTeacher
      ? [{ path: '/students', label: 'Students', icon: '📚' }]
      : [{ path: '/team', label: 'Messages', icon: '💬' }]),
    { path: '/tasks', label: 'Tasks', icon: '📋' },
  ]


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
      <div className="max-w-lg mx-auto px-2">
        <div className="flex items-center justify-around py-2">

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl
                transition-all duration-200
                ${item.isPrimary
                  ? 'relative -top-4'  // Lift the practice button up
                  : ''
                }
                ${isActive
                  ? 'text-primary'
                  : 'text-gray-400 hover:text-gray-600'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {/* Icon - Practice button is larger and highlighted */}
                  {item.isPrimary ? (
                    <div className={`
                      w-14 h-14 rounded-full flex items-center justify-center
                      shadow-lg transition-all duration-200
                      ${isActive
                        ? 'bg-primary scale-110'
                        : 'bg-primary hover:scale-105'
                      }
                    `}>
                      <span className="text-2xl text-white">▶</span>
                    </div>
                  ) : (
                    <span className="text-xl">{item.icon}</span>
                  )}

                  {/* Label */}
                  <span className={`
                    text-xs font-medium
                    ${item.isPrimary ? 'mt-1' : ''}
                  `}>
                    {item.label}
                  </span>

                  {/* Active indicator dot */}
                  {isActive && !item.isPrimary && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
