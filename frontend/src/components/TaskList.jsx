/**
 * =============================================================================
 * TASKLIST.JSX - Full Task List View
 * =============================================================================
 * Shows all practice tasks with filtering and sorting options.
 *
 * FEATURES:
 * - Filter by status: All, Not Started, In Progress, Ready
 * - Sort by: Readiness, Difficulty, Recently Added
 * - Create new tasks
 * - Quick edit/delete tasks
 *
 * DESIGN:
 * - Filter tabs at top
 * - Scrollable task cards
 * - Floating add button (FAB style)
 * =============================================================================
 */

import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import TaskCard from './TaskCard'


export default function TaskList() {
  const { tasks, createTask, deleteTask, setToast } = useApp()


  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  // Current filter
  const [filter, setFilter] = useState('all') // 'all' | 'not_started' | 'in_progress' | 'ready'

  // Show create form
  const [showCreateForm, setShowCreateForm] = useState(false)

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'repertoire',
    difficulty: 3,
    estimated_minutes: 30
  })


  // ---------------------------------------------------------------------------
  // FILTER TASKS
  // ---------------------------------------------------------------------------
  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(task => task.status === filter)

  // Sort by readiness (lowest first - needs most work)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === 'ready' && b.status !== 'ready') return 1
    if (b.status === 'ready' && a.status !== 'ready') return -1
    return a.readiness_score - b.readiness_score
  })


  // ---------------------------------------------------------------------------
  // FILTER OPTIONS
  // ---------------------------------------------------------------------------
  const filters = [
    { value: 'all', label: 'All', count: tasks.length },
    { value: 'not_started', label: 'Not Started', count: tasks.filter(t => t.status === 'not_started').length },
    { value: 'in_progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length },
    { value: 'ready', label: 'Ready', count: tasks.filter(t => t.status === 'ready').length },
  ]


  // ---------------------------------------------------------------------------
  // CATEGORY OPTIONS
  // ---------------------------------------------------------------------------
  const categories = [
    { value: 'repertoire', label: 'Repertoire', icon: '🎵' },
    { value: 'technique', label: 'Technique', icon: '🎯' },
    { value: 'sight_reading', label: 'Sight Reading', icon: '👀' },
    { value: 'section_work', label: 'Section Work', icon: '👥' },
  ]


  // ---------------------------------------------------------------------------
  // CREATE TASK
  // ---------------------------------------------------------------------------
  const handleCreateTask = async (e) => {
    e.preventDefault()

    try {
      await createTask({
        title: newTask.title,
        category: newTask.category,
        difficulty: newTask.difficulty,
        estimated_minutes: newTask.estimated_minutes
      })

      setNewTask({
        title: '',
        category: 'repertoire',
        difficulty: 3,
        estimated_minutes: 30
      })
      setShowCreateForm(false)
    } catch (error) {
      // Error handled by context
    }
  }


  // ---------------------------------------------------------------------------
  // DELETE TASK
  // ---------------------------------------------------------------------------
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return

    try {
      await deleteTask(taskId)
    } catch (error) {
      // Error handled by context
    }
  }


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500">{tasks.length} total tasks</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          + New Task
        </button>
      </header>


      {/* =================================================================
          FILTER TABS
          ================================================================= */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                       transition-colors
              ${filter === f.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f.label}
            <span className={`ml-1 ${filter === f.value ? 'opacity-80' : 'opacity-50'}`}>
              ({f.count})
            </span>
          </button>
        ))}
      </div>


      {/* =================================================================
          CREATE TASK FORM
          ================================================================= */}
      {showCreateForm && (
        <form onSubmit={handleCreateTask} className="card space-y-4">
          <h3 className="font-semibold">New Practice Task</h3>

          {/* Title */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g., Autumn Leaves - Solo Section"
              className="input"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setNewTask({ ...newTask, category: cat.value })}
                  className={`p-3 rounded-xl text-left transition-colors
                    ${newTask.category === cat.value
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}
                >
                  <span className="text-lg mr-2">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Difficulty</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setNewTask({ ...newTask, difficulty: level })}
                    className={`flex-1 py-2 rounded-lg text-lg
                      ${level <= newTask.difficulty ? 'text-warning' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Est. Time (min)</label>
              <input
                type="number"
                value={newTask.estimated_minutes}
                onChange={(e) => setNewTask({ ...newTask, estimated_minutes: parseInt(e.target.value) || 30 })}
                min="5"
                step="5"
                className="input"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1">
              Create Task
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}


      {/* =================================================================
          TASK LIST
          ================================================================= */}
      {sortedTasks.length > 0 ? (
        <div className="space-y-3">
          {sortedTasks.map((task) => (
            <div key={task.id} className="relative group">
              <TaskCard
                task={task}
                rehearsal={null}
              />

              {/* Delete button (shows on hover) */}
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-danger/10 text-danger
                           opacity-0 group-hover:opacity-100 transition-opacity
                           flex items-center justify-center hover:bg-danger/20"
                title="Delete task"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <span className="text-4xl mb-2 block">
            {filter === 'ready' ? '🎉' : '📝'}
          </span>
          <p className="text-gray-500">
            {filter === 'all'
              ? 'No tasks yet. Add your first task!'
              : filter === 'ready'
                ? 'No tasks are ready yet. Keep practicing!'
                : `No ${filter.replace('_', ' ')} tasks`}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-secondary mt-4"
            >
              Create Task
            </button>
          )}
        </div>
      )}
    </div>
  )
}
