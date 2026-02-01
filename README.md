# PracticeBeats 🎵

**Track your practice. Build your streak. Nail the rehearsal!**

PracticeBeats is a music practice tracker designed for ensemble musicians. It combines the gamification of Duolingo with the scheduling features of Google Calendar to help you stay accountable, prepared, and motivated.

## Features

### For Individual Musicians
- **Practice Timer** - Track your practice sessions with a simple timer
- **Task Management** - Create and manage practice tasks (repertoire, technique, sight-reading)
- **Readiness Tracking** - See how prepared you are for each piece (0-100% score)
- **Streak System** - Build daily practice streaks for bonus XP
- **Points & Levels** - Earn XP for practice, level up over time
- **Quality Ratings** - Rate your focus, progress, and energy after each session

### For Ensembles
- **Team Dashboard** - See how your ensemble members are practicing
- **Weekly Leaderboard** - Friendly competition based on practice minutes
- **Group Challenges** - Create team challenges ("everyone practice 30 min today!")
- **Rehearsal Tracking** - Link practice tasks to upcoming rehearsals
- **Section Support** - Organize by section (brass, woodwind, rhythm, etc.)

## Tech Stack

- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: SQLite with SQLAlchemy ORM
- **State Management**: React Context API
- **API**: RESTful with automatic OpenAPI documentation

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed the database with demo data
python seed.py

# Start the API server
uvicorn main:app --reload
```

The API will be running at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be running at `http://localhost:5173`

### Demo Accounts

After running `seed.py`, you can login with these demo accounts:

| Email | Name | Instrument | Streak |
|-------|------|------------|--------|
| alex@demo.com | Alex Rivera | Trumpet | 12 days |
| jordan@demo.com | Jordan Kim | Alto Saxophone | 5 days |
| sam@demo.com | Sam Chen | Piano | 28 days |
| taylor@demo.com | Taylor Johnson | Drums | 0 days |
| casey@demo.com | Casey Williams | Trombone | 3 days |

## Project Structure

```
practice-beats/
├── backend/
│   ├── main.py          # FastAPI app & routes
│   ├── models.py        # SQLAlchemy database models
│   ├── database.py      # Database connection setup
│   ├── schemas.py       # Pydantic validation schemas
│   ├── crud.py          # Database operations
│   ├── seed.py          # Demo data seeding script
│   └── requirements.txt # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx      # Main home screen
│   │   │   ├── PracticeSession.jsx # Timer & session logging
│   │   │   ├── TaskCard.jsx       # Task display component
│   │   │   ├── Calendar.jsx       # Calendar view
│   │   │   ├── TaskList.jsx       # All tasks view
│   │   │   ├── EnsembleDashboard.jsx # Team features
│   │   │   ├── Navbar.jsx         # Bottom navigation
│   │   │   ├── Login.jsx          # Login/register screen
│   │   │   └── Toast.jsx          # Notification component
│   │   ├── contexts/
│   │   │   └── AppContext.jsx     # Global state management
│   │   ├── utils/
│   │   │   └── api.js             # API client functions
│   │   ├── App.jsx                # Main app with routing
│   │   ├── main.jsx               # Entry point
│   │   └── index.css              # Global styles
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login with email
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update user
- `GET /api/users/:id/stats` - Get user stats

### Practice Sessions
- `POST /api/sessions` - Create practice session
- `GET /api/sessions` - Get user's sessions
- `PATCH /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - Get tasks with filters
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/:id/readiness` - Get readiness score

### Rehearsals
- `POST /api/rehearsals` - Create rehearsal
- `GET /api/rehearsals` - Get rehearsals
- `PATCH /api/rehearsals/:id` - Update rehearsal
- `DELETE /api/rehearsals/:id` - Delete rehearsal

### Ensembles
- `POST /api/ensembles` - Create ensemble
- `GET /api/ensembles/:id` - Get ensemble
- `GET /api/ensembles/:id/members` - Get members
- `GET /api/ensembles/:id/leaderboard` - Get leaderboard
- `POST /api/ensembles/:id/join` - Join ensemble

### Challenges
- `POST /api/challenges` - Create challenge
- `GET /api/challenges` - Get challenges
- `POST /api/challenges/:id/complete` - Mark complete
- `GET /api/challenges/:id/progress` - Get progress

### Badges
- `GET /api/badges/:user_id` - Get user's badges

## Gamification System

### Points (XP)
- **Base**: 1 XP per minute practiced
- **Streak Multiplier**:
  - 3+ day streak: 1.2x
  - 7+ day streak: 1.5x
  - 30+ day streak: 2.0x
- **Quality Bonus**: +20% for focus rating >= 4

### Levels
- 100 XP per level
- Level 1 starts at 0 XP

### Streaks
- Practice any amount to maintain your streak
- Miss a day = streak resets to 0
- Longest streak users get special recognition!

### Badges
- `first_session` - Complete your first practice
- `streak_3` - 3-day streak
- `streak_7` - Week-long streak
- `streak_30` - Month-long streak
- `marathon` - 60+ minute session
- `perfect_focus` - 5-star focus rating
- `early_bird` - Practice before 8am
- `night_owl` - Practice after 10pm

### Readiness Score
Tasks have a 0-100% readiness score based on:
- **Time Score (40%)** - Time practiced vs. estimated
- **Quality Score (30%)** - Average session quality ratings
- **Frequency Score (20%)** - Number of practice sessions
- **Recency Bonus (10%)** - Practiced within last 2 days

## Design Philosophy

### UI Inspiration
- **Duolingo**: Gamification, streaks, XP, encouraging mascot
- **Google Calendar**: Clean event cards, week view, scheduling

### Mascot: The Metronome 🎵
Our friendly metronome mascot appears throughout the app with encouraging messages:
- "Don't miss a beat!"
- "Keep the rhythm going!"
- "Practice together, grow together!"

### Color Scheme
- **Primary**: Indigo/Purple (#6366f1)
- **Success**: Green (#22c55e)
- **Warning**: Yellow (#eab308)
- **Danger**: Red (#ef4444)
- **Streak**: Orange (#f97316)

## Development

### Backend Development
```bash
cd backend
uvicorn main:app --reload
```

Visit `http://localhost:8000/docs` for interactive API documentation.

### Frontend Development
```bash
cd frontend
npm run dev
```

Hot reload is enabled - changes appear instantly.

### Database Reset
```bash
cd backend
rm practice_beats.db  # Delete existing database
python seed.py        # Re-create with fresh demo data
```

## Future Improvements

- [ ] Password authentication / OAuth
- [ ] Push notifications for practice reminders
- [ ] Dark mode toggle
- [ ] Practice analytics and insights
- [ ] Audio recording integration
- [ ] Metronome built into practice timer
- [ ] Export practice log to CSV
- [ ] Multiple ensembles per user
- [ ] Section-specific challenges
- [ ] Practice goal customization by day

## Contributing

This was built for a hackathon! Feel free to fork and improve.

## License

MIT License - do whatever you want with it!

---

Built with 💜 for musicians who want to level up their practice.

*"Don't miss a beat!"* 🎵
