/**
 * =============================================================================
 * ENSEMBLEDASHBOARD.JSX - Team/Ensemble View
 * =============================================================================
 * Shows ensemble information for group accountability and competition.
 *
 * FEATURES:
 * - Weekly leaderboard (ranked by practice minutes)
 * - Active group challenges with progress
 * - Member list with recent activity
 * - Ability to create new challenges
 *
 * DESIGN:
 * - Leaderboard uses medal emojis for top 3
 * - Challenge progress shows member avatars
 * - Encouraging messaging for team motivation
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../utils/api'


export default function EnsembleDashboard() {
  const {
    user,
    ensemble,
    leaderboard,
    challenges,
    refreshLeaderboard,
    refreshChallenges,
    setToast,
    loadUserData
  } = useApp()


  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Joining ensemble
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [ensembleCode, setEnsembleCode] = useState('')
  const [joiningEnsemble, setJoiningEnsemble] = useState(false)

  // Create ensemble state
  const [showCreateEnsemble, setShowCreateEnsemble] = useState(false)
  const [newEnsembleName, setNewEnsembleName] = useState('')
  const [creatingEnsemble, setCreatingEnsemble] = useState(false)

  // Handle creating ensemble
  const handleCreateEnsemble = async () => {
    if (!newEnsembleName.trim()) {
      setToast('Please enter an ensemble name', 'error')
      return
    }

    setCreatingEnsemble(true)
    try {
      const ensemble = await api.createEnsemble({
        name: newEnsembleName,
        type: 'orchestra'
      })
      setToast('Ensemble created! 🎵', 'success')
      setShowCreateEnsemble(false)
      setNewEnsembleName('')
      await loadUserData(user.id)
    } catch (error) {
      setToast(error.message || 'Failed to create ensemble', 'error')
    } finally {
      setCreatingEnsemble(false)
    }
  }

  // Challenge progress details
  const [challengeProgress, setChallengeProgress] = useState({})

  // Create challenge form
  const [showCreateChallenge, setShowCreateChallenge] = useState(false)
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    goal_type: 'individual_minutes',
    goal_value: 30,
    end_date: ''
  })

  // Teacher messaging state
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Handle joining ensemble
  const handleJoinEnsemble = async () => {
    if (!ensembleCode.trim()) {
      setToast('Please enter an ensemble code', 'error')
      return
    }

    setJoiningEnsemble(true)
    try {
      await api.joinEnsembleByCode(ensembleCode.trim(), user.id)
      setToast('Joined ensemble! 🎉', 'success')
      setShowJoinModal(false)
      setEnsembleCode('')
      await loadUserData(user.id)
    } catch (error) {
      setToast(error.message || 'Failed to join ensemble', 'error')
    } finally {
      setJoiningEnsemble(false)
    }
  }

  // Load teacher messages (for students)
  const loadTeacherMessages = async () => {
    if (user?.role !== 'student' || !user?.teacher_id) {
      return
    }
    try {
      const data = await api.getNotes(user.id)
      setMessages(data)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  // Send reply to teacher
  const handleSendReply = async () => {
    if (!replyText.trim() || !user?.teacher_id) return

    setSendingMessage(true)
    try {
      await api.sendNote({
        recipient_id: user.teacher_id,
        message: replyText
      })
      setToast('Message sent! 📨', 'success')
      setReplyText('')
      await loadTeacherMessages()
    } catch (error) {
      setToast(error.message || 'Failed to send message', 'error')
    } finally {
      setSendingMessage(false)
    }
  }

  // Load messages on mount
  useEffect(() => {
    if (user?.role === 'student') {
      loadTeacherMessages()
    }
  }, [user?.id, user?.teacher_id])


  // ---------------------------------------------------------------------------
  // LOAD CHALLENGE PROGRESS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadProgress = async () => {
      for (const challenge of challenges) {
        try {
          const progress = await api.getChallengeProgress(challenge.id, user.id)
          setChallengeProgress(prev => ({
            ...prev,
            [challenge.id]: progress
          }))
        } catch (error) {
          console.error('Failed to load challenge progress:', error)
        }
      }
    }

    if (challenges.length > 0) {
      loadProgress()
    }
  }, [challenges, user.id])


  // ---------------------------------------------------------------------------
  // CREATE CHALLENGE
  // ---------------------------------------------------------------------------
  const handleCreateChallenge = async (e) => {
    e.preventDefault()

    try {
      await api.createChallenge({
        ensemble_id: ensemble.id,
        title: newChallenge.title,
        description: newChallenge.description || null,
        goal_type: newChallenge.goal_type,
        goal_value: newChallenge.goal_value,
        start_date: new Date().toISOString().split('T')[0],
        end_date: newChallenge.end_date
      })

      setToast('Challenge created!', 'success')
      setShowCreateChallenge(false)
      setNewChallenge({
        title: '',
        description: '',
        goal_type: 'individual_minutes',
        goal_value: 30,
        end_date: ''
      })
      refreshChallenges()
    } catch (error) {
      setToast(error.message, 'error')
    }
  }


  // ---------------------------------------------------------------------------
  // COMPLETE CHALLENGE
  // ---------------------------------------------------------------------------
  const handleCompleteChallenge = async (challengeId) => {
    try {
      await api.completeChallenge(challengeId, user.id)
      setToast('Challenge completed!', 'success')

      // Refresh progress
      const progress = await api.getChallengeProgress(challengeId, user.id)
      setChallengeProgress(prev => ({
        ...prev,
        [challengeId]: progress
      }))
    } catch (error) {
      setToast(error.message, 'error')
    }
  }


  // ---------------------------------------------------------------------------
  // NO ENSEMBLE STATE
  // ---------------------------------------------------------------------------
  if (!ensemble) {
    const isTeacher = user?.role === 'teacher'
    const isStudent = user?.role === 'student'

    return (
      <>
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-gray-900">Team</h1>
            <p className="text-gray-500">
              {isTeacher 
                ? 'Create or manage your ensemble' 
                : 'Join an ensemble to see team features'}
            </p>
          </header>

          {/* Join Ensemble Section (for students) */}
          {isStudent && (
            <div className="card text-center py-12">
              <span className="text-6xl mb-4 block">👥</span>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Team Yet
              </h2>
              <p className="text-gray-500 mb-6">
                Join an ensemble to see leaderboards, challenges, and practice together!
              </p>
              <button 
                onClick={() => setShowJoinModal(true)}
                className="btn-primary"
              >
                Join Ensemble
              </button>
            </div>
          )}

          {/* Create Ensemble Section (for teachers) */}
          {isTeacher && (
            <div className="card text-center py-12">
              <span className="text-6xl mb-4 block">🎼</span>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Ensemble Yet
              </h2>
              <p className="text-gray-500 mb-6">
                Create an ensemble to organize and manage musicians
              </p>
              <button 
                onClick={() => setShowCreateEnsemble(true)}
                className="btn-primary"
              >
                Create Ensemble
              </button>
            </div>
          )}

          {/* Teacher Messaging Section (for students) */}
          {isStudent && user?.teacher_id && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">💬 Contact Your Teacher</h2>
              
              <div className="card space-y-4">
                {/* Messages list */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {messages && messages.length > 0 ? (
                    messages.map((msg, idx) => (
                      <div key={idx} className={`p-3 rounded-lg ${
                        msg.sender_id === user.id 
                          ? 'bg-primary/10 ml-8' 
                          : 'bg-gray-100 mr-8'
                      }`}>
                        <p className="text-sm text-gray-900">{msg.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      No messages yet. Send one!
                    </p>
                  )}
                </div>

                {/* Message input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Send a message..."
                    className="input flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendReply()
                      }
                    }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sendingMessage || !replyText.trim()}
                    className="btn-primary"
                  >
                    {sendingMessage ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Metronome encouragement */}
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
              <span className="text-xl">🎵</span>
              <span className="text-sm text-gray-600 italic">
                {isTeacher ? 'Build your ensemble!' : 'Even solo practice counts! Keep going!'}
              </span>
            </div>
          </div>
        </div>

        {/* Modal for creating ensemble (Teachers) */}
        {showCreateEnsemble && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6">
              <h3 className="text-xl font-bold mb-4">Create New Ensemble</h3>
              <p className="text-gray-600 text-sm mb-4">
                Give your ensemble a name
              </p>
              <input
                type="text"
                value={newEnsembleName}
                onChange={(e) => setNewEnsembleName(e.target.value)}
                placeholder="e.g., Jazz Band, String Quartet"
                className="input mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreateEnsemble(false)
                    setNewEnsembleName('')
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEnsemble}
                  disabled={creatingEnsemble || !newEnsembleName.trim()}
                  className="flex-1 btn-primary"
                >
                  {creatingEnsemble ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for joining ensemble (Students) */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6">
              <h3 className="text-xl font-bold mb-4">Enter Ensemble Code</h3>
              <p className="text-gray-600 text-sm mb-4">
                Ask your ensemble coordinator for the 8-digit code
              </p>
              <input
                type="text"
                value={ensembleCode}
                onChange={(e) => setEnsembleCode(e.target.value.toUpperCase())}
                placeholder="12345678"
                maxLength={8}
                className="input text-center text-2xl tracking-widest mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowJoinModal(false)
                    setEnsembleCode('')
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinEnsemble}
                  disabled={joiningEnsemble || !ensembleCode.trim()}
                  className="flex-1 btn-primary"
                >
                  {joiningEnsemble ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">

      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{ensemble.name}</h1>
        <p className="text-gray-500">{ensemble.type}</p>
      </header>


      {/* =================================================================
          LEADERBOARD
          ================================================================= */}
      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Leaderboard</h2>
          <button
            onClick={refreshLeaderboard}
            className="text-sm text-primary"
          >
            Refresh
          </button>
        </div>

        {leaderboard?.entries?.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.entries.map((entry, index) => {
              const isCurrentUser = entry.user.id === user.id
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null

              return (
                <div
                  key={entry.user.id}
                  className={`flex items-center gap-3 p-3 rounded-xl
                    ${isCurrentUser ? 'bg-primary/10 border border-primary/30' : 'bg-gray-50'}`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center font-bold text-lg">
                    {medal || entry.rank}
                  </div>

                  {/* User info */}
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrentUser ? 'text-primary' : 'text-gray-900'}`}>
                      {entry.user.name}
                      {isCurrentUser && ' (You)'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {entry.user.instrument}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{entry.weekly_minutes} min</p>
                    <p className="text-xs text-gray-500">{entry.weekly_points} XP</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No practice logged this week</p>
        )}

        {/* Week period */}
        {leaderboard && (
          <p className="text-xs text-gray-400 text-center mt-4">
            {new Date(leaderboard.period_start).toLocaleDateString()} - {new Date(leaderboard.period_end).toLocaleDateString()}
          </p>
        )}
      </section>


      {/* =================================================================
          GROUP CHALLENGES
          ================================================================= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Team Challenges</h2>
          <button
            onClick={() => setShowCreateChallenge(!showCreateChallenge)}
            className="text-sm text-primary font-medium"
          >
            + New Challenge
          </button>
        </div>

        {/* Create Challenge Form */}
        {showCreateChallenge && (
          <form onSubmit={handleCreateChallenge} className="card mb-4 space-y-4">
            <h3 className="font-semibold">New Team Challenge</h3>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={newChallenge.title}
                onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                placeholder="e.g., Everyone practice 30 minutes!"
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Goal Type</label>
                <select
                  value={newChallenge.goal_type}
                  onChange={(e) => setNewChallenge({ ...newChallenge, goal_type: e.target.value })}
                  className="input"
                >
                  <option value="individual_minutes">Individual Minutes</option>
                  <option value="all_members_practice">Everyone Practices</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Goal Value (min)</label>
                <input
                  type="number"
                  value={newChallenge.goal_value}
                  onChange={(e) => setNewChallenge({ ...newChallenge, goal_value: parseInt(e.target.value) })}
                  min="10"
                  step="5"
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={newChallenge.end_date}
                onChange={(e) => setNewChallenge({ ...newChallenge, end_date: e.target.value })}
                className="input"
                required
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">
                Create Challenge
              </button>
              <button
                type="button"
                onClick={() => setShowCreateChallenge(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Challenge Cards */}
        {challenges.length > 0 ? (
          <div className="space-y-4">
            {challenges.map((challenge) => {
              const progress = challengeProgress[challenge.id]
              const isCompleted = progress?.user_completed

              return (
                <div key={challenge.id} className="card">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎯</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{challenge.title}</h3>
                      {challenge.description && (
                        <p className="text-sm text-gray-500 mt-1">{challenge.description}</p>
                      )}

                      {/* Progress */}
                      {progress && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex -space-x-2">
                              {[...Array(progress.total_members)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm
                                    ${i < progress.completed_count ? 'bg-success text-white' : 'bg-gray-200 text-gray-400'}`}
                                >
                                  {i < progress.completed_count ? '✓' : '?'}
                                </div>
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {progress.completed_count}/{progress.total_members} done
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success transition-all"
                              style={{ width: `${(progress.completed_count / progress.total_members) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Complete button */}
                      {!isCompleted && (
                        <button
                          onClick={() => handleCompleteChallenge(challenge.id)}
                          className="btn-primary mt-3 text-sm"
                        >
                          Mark Complete
                        </button>
                      )}

                      {isCompleted && (
                        <p className="text-success font-medium mt-3 text-sm">
                          ✓ You've completed this challenge!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* End date */}
                  <p className="text-xs text-gray-400 mt-3">
                    Ends {new Date(challenge.end_date).toLocaleDateString()}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-8">
            <span className="text-4xl mb-2 block">🎯</span>
            <p className="text-gray-500">No active challenges</p>
            <button
              onClick={() => setShowCreateChallenge(true)}
              className="btn-secondary mt-4"
            >
              Create Challenge
            </button>
          </div>
        )}
      </section>


      {/* Mascot encouragement */}
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
          <span className="text-xl">🎵</span>
          <span className="text-sm text-gray-600 italic">
            Practice together, grow together!
          </span>
        </div>
      </div>

      {/* Teacher Messaging (for students in ensemble) */}
      {user?.role === 'student' && user?.teacher_id && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">💬 Contact Your Teacher</h2>
          
          <div className="card space-y-4">
            {/* Messages list */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {messages && messages.length > 0 ? (
                messages.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${
                    msg.sender_id === user.id 
                      ? 'bg-primary/10 ml-8' 
                      : 'bg-gray-100 mr-8'
                  }`}>
                    <p className="text-sm text-gray-900">{msg.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No messages yet. Send one!
                </p>
              )}
            </div>

            {/* Message input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Send a message..."
                className="input flex-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendReply()
                  }
                }}
              />
              <button
                onClick={handleSendReply}
                disabled={sendingMessage || !replyText.trim()}
                className="btn-primary"
              >
                {sendingMessage ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
