/**
 * =============================================================================
 * MAIN.JSX - Application Entry Point
 * =============================================================================
 * This is where React boots up and mounts our app to the DOM.
 *
 * RESPONSIBILITIES:
 * - Import global CSS (Tailwind styles)
 * - Wrap app with BrowserRouter for routing
 * - Wrap app with AppProvider for global state
 * - Mount App component to the #root element
 *
 * The hierarchy is:
 * BrowserRouter (enables routing)
 *   └── AppProvider (provides global state)
 *         └── App (main component with routes)
 * =============================================================================
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './contexts/AppContext'
import './index.css'

// Find the root element and mount our React app
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    {/* AppProvider wraps the app with global state (user, tasks, etc.) */}
    <AppProvider>
      <App />
    </AppProvider>
  </BrowserRouter>
)
