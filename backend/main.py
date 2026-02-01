"""
=============================================================================
MAIN.PY - FastAPI Application & API Routes
=============================================================================
This is the main entry point for the PracticeBeats backend API.

HOW TO RUN:
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload

API DOCUMENTATION:
    After running, visit http://localhost:8000/docs for Swagger UI
    or http://localhost:8000/redoc for ReDoc

ROUTE ORGANIZATION:
    /api/auth     - User registration and login
    /api/users    - User profiles and stats
    /api/sessions - Practice session management
    /api/tasks    - Practice task management
    /api/rehearsals - Rehearsal scheduling
    /api/ensembles - Ensemble/group management
    /api/challenges - Group challenges
    /api/badges   - User achievements

CORS:
    Enabled for local development (localhost:5173 is Vite's default port)
    Adjust origins for production deployment
=============================================================================
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import date

import models
import schemas
import crud
from database import engine, get_db


# -----------------------------------------------------------------------------
# LIFESPAN (startup/shutdown events)
# -----------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    models.Base.metadata.create_all(bind=engine)
    # Migration: add share_practice_with_teacher column if it doesn't exist
    try:
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN share_practice_with_teacher INTEGER DEFAULT 0"
            ))
            conn.commit()
    except Exception:
        pass  # Column likely already exists
    print("=" * 60)
    print("  PracticeBeats API Started!")
    print("  Visit http://localhost:8000/docs for API documentation")
    print("=" * 60)
    yield
    # Shutdown (nothing needed)


# -----------------------------------------------------------------------------
# APP INITIALIZATION
# -----------------------------------------------------------------------------
app = FastAPI(
    title="PracticeBeats API",
    description="Backend API for the PracticeBeats music practice tracker",
    version="1.0.0",
    lifespan=lifespan
)

# -----------------------------------------------------------------------------
# CORS CONFIGURATION
# -----------------------------------------------------------------------------
# Allow frontend to make requests to this API
# In production, replace with your actual frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative React port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/")
def root():
    """
    Health check endpoint.
    Returns a simple message to verify the API is running.
    """
    return {"message": "PracticeBeats API is running!", "status": "healthy"}


@app.get("/api/health")
def health_check():
    """Detailed health check with version info."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "app": "PracticeBeats"
    }


# =============================================================================
# AUTH ROUTES - Simple email-based auth for MVP
# =============================================================================

@app.post("/api/auth/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    For the hackathon MVP, this is simple email-based registration.
    No password required - just name, email, and instrument.

    Returns the created user with all default stats initialized.
    """
    # Check if email already exists
    existing = crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    return crud.create_user(db, user)


@app.post("/api/auth/login", response_model=schemas.LoginResponse)
def login(login_request: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email.

    For MVP simplicity, just check if email exists.
    In production, you'd add proper password auth or OAuth.
    """
    user = crud.get_user_by_email(db, login_request.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")

    return schemas.LoginResponse(user=user)


@app.get("/api/auth/me", response_model=schemas.User)
def get_current_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get current user's profile.

    Note: In a real app, user_id would come from a JWT token.
    For MVP, we pass it as a query parameter.
    """
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# =============================================================================
# USER ROUTES
# =============================================================================

@app.get("/api/users/{user_id}", response_model=schemas.User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a user's profile by ID."""
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.patch("/api/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db)):
    """
    Update a user's profile.

    Common uses:
    - Changing weekly goal
    - Updating instrument/section
    - Joining an ensemble
    """
    user = crud.update_user(db, user_id, user_update)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/users/{user_id}/stats", response_model=schemas.UserStats)
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    """
    Get a user's aggregated stats for the dashboard.

    Returns:
    - Streak count
    - Total points
    - Level
    - Weekly minutes practiced
    - Weekly goal progress percentage
    """
    stats = crud.get_user_stats(db, user_id)
    if not stats:
        raise HTTPException(status_code=404, detail="User not found")
    return stats


# =============================================================================
# PRACTICE SESSION ROUTES
# =============================================================================

@app.post("/api/sessions", response_model=schemas.PracticeSession)
def create_session(session: schemas.PracticeSessionCreate, db: Session = Depends(get_db)):
    """
    Create a new practice session.

    This is the main "end practice" endpoint. When a user finishes practicing:
    1. Frontend sends session data (duration, tasks, ratings)
    2. Backend calculates points, updates streak, checks badges
    3. Returns the saved session with points earned

    The session can include quality ratings and task breakdowns.
    """
    try:
        return crud.create_practice_session(db, session)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/sessions", response_model=List[schemas.PracticeSession])
def get_sessions(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(default=50, le=100),
    db: Session = Depends(get_db)
):
    """
    Get practice sessions for a user.

    Supports date filtering for calendar views and history.
    Default limit of 50, max 100.
    """
    return crud.get_user_sessions(db, user_id, start_date, end_date, limit)


@app.get("/api/sessions/{session_id}", response_model=schemas.PracticeSession)
def get_session(session_id: int, db: Session = Depends(get_db)):
    """Get a single practice session by ID."""
    session = crud.get_practice_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.patch("/api/sessions/{session_id}", response_model=schemas.PracticeSession)
def update_session(
    session_id: int,
    session_update: schemas.PracticeSessionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a practice session.

    Typically used to add quality ratings after the fact,
    or to edit notes.
    """
    session = crud.update_practice_session(db, session_id, session_update)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    """
    Delete a practice session.

    Also removes the associated points and updates task stats.
    """
    success = crud.delete_practice_session(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}


# =============================================================================
# PRACTICE TASK ROUTES
# =============================================================================

@app.post("/api/tasks", response_model=schemas.PracticeTask)
def create_task(task: schemas.PracticeTaskCreate, db: Session = Depends(get_db)):
    """
    Create a new practice task.

    Tasks can be:
    - Personal (just user_id, no ensemble)
    - Ensemble-shared (with ensemble_id)
    - Rehearsal-linked (with rehearsal_id for deadline tracking)
    """
    return crud.create_task(db, task)


@app.get("/api/tasks", response_model=List[schemas.PracticeTask])
def get_tasks(
    user_id: int,
    status: Optional[str] = None,
    rehearsal_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get tasks for a user with optional filters.

    Filter by:
    - status: "not_started", "in_progress", "ready"
    - rehearsal_id: Get tasks for a specific rehearsal
    """
    status_enum = None
    if status:
        try:
            status_enum = models.TaskStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")

    return crud.get_user_tasks(db, user_id, status_enum, rehearsal_id)


@app.get("/api/tasks/{task_id}", response_model=schemas.PracticeTask)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a single task by ID."""
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.patch("/api/tasks/{task_id}", response_model=schemas.PracticeTask)
def update_task(task_id: int, task_update: schemas.PracticeTaskUpdate, db: Session = Depends(get_db)):
    """Update a task's fields."""
    task = crud.update_task(db, task_id, task_update)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task."""
    success = crud.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


@app.get("/api/tasks/{task_id}/readiness")
def get_task_readiness(task_id: int, db: Session = Depends(get_db)):
    """
    Get the calculated readiness score for a task.

    Returns a 0-100 score based on:
    - Time practiced vs estimated
    - Quality of practice sessions
    - Frequency of practice
    - Recency of practice
    """
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    readiness = crud.calculate_task_readiness(db, task)
    return {
        "task_id": task_id,
        "readiness_score": readiness,
        "status": task.status.value
    }


# =============================================================================
# REHEARSAL ROUTES
# =============================================================================

@app.post("/api/rehearsals", response_model=schemas.Rehearsal)
def create_rehearsal(rehearsal: schemas.RehearsalCreate, db: Session = Depends(get_db)):
    """Create a new rehearsal."""
    return crud.create_rehearsal(db, rehearsal)


@app.get("/api/rehearsals", response_model=List[schemas.Rehearsal])
def get_rehearsals(
    ensemble_id: int,
    upcoming: bool = False,
    limit: Optional[int] = 3,
    db: Session = Depends(get_db)
):
    """
    Get rehearsals for an ensemble.

    Set upcoming=true to only get future rehearsals.
    limit=3 returns only the 3 soonest upcoming rehearsals (default).
    """
    return crud.get_ensemble_rehearsals(db, ensemble_id, upcoming, limit if upcoming else None)


@app.get("/api/rehearsals/{rehearsal_id}", response_model=schemas.Rehearsal)
def get_rehearsal(rehearsal_id: int, db: Session = Depends(get_db)):
    """Get a single rehearsal by ID."""
    rehearsal = crud.get_rehearsal(db, rehearsal_id)
    if not rehearsal:
        raise HTTPException(status_code=404, detail="Rehearsal not found")
    return rehearsal


@app.patch("/api/rehearsals/{rehearsal_id}", response_model=schemas.Rehearsal)
def update_rehearsal(
    rehearsal_id: int,
    rehearsal_update: schemas.RehearsalUpdate,
    db: Session = Depends(get_db)
):
    """Update rehearsal details."""
    rehearsal = crud.update_rehearsal(db, rehearsal_id, rehearsal_update)
    if not rehearsal:
        raise HTTPException(status_code=404, detail="Rehearsal not found")
    return rehearsal


@app.delete("/api/rehearsals/{rehearsal_id}")
def delete_rehearsal(rehearsal_id: int, db: Session = Depends(get_db)):
    """Delete a rehearsal."""
    success = crud.delete_rehearsal(db, rehearsal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Rehearsal not found")
    return {"message": "Rehearsal deleted successfully"}


# =============================================================================
# ENSEMBLE ROUTES
# =============================================================================

@app.post("/api/ensembles", response_model=schemas.Ensemble)
def create_ensemble(ensemble: schemas.EnsembleCreate, db: Session = Depends(get_db)):
    """Create a new ensemble (music group)."""
    return crud.create_ensemble(db, ensemble)


@app.get("/api/ensembles/{ensemble_id}", response_model=schemas.Ensemble)
def get_ensemble(ensemble_id: int, db: Session = Depends(get_db)):
    """Get ensemble details."""
    ensemble = crud.get_ensemble(db, ensemble_id)
    if not ensemble:
        raise HTTPException(status_code=404, detail="Ensemble not found")
    return ensemble


@app.get("/api/ensembles/{ensemble_id}/members", response_model=List[schemas.User])
def get_ensemble_members(ensemble_id: int, db: Session = Depends(get_db)):
    """Get all members of an ensemble."""
    ensemble = crud.get_ensemble(db, ensemble_id)
    if not ensemble:
        raise HTTPException(status_code=404, detail="Ensemble not found")
    return crud.get_ensemble_members(db, ensemble_id)


@app.post("/api/ensembles/{ensemble_id}/join", response_model=schemas.User)
def join_ensemble(ensemble_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Have a user join an ensemble.

    Updates the user's ensemble_id to the specified ensemble.
    """
    ensemble = crud.get_ensemble(db, ensemble_id)
    if not ensemble:
        raise HTTPException(status_code=404, detail="Ensemble not found")

    user_update = schemas.UserUpdate(ensemble_id=ensemble_id)
    user = crud.update_user(db, user_id, user_update)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/api/ensembles/join-by-code/{ensemble_code}", response_model=schemas.User)
def join_ensemble_by_code(ensemble_code: str, user_id: int, db: Session = Depends(get_db)):
    """
    Have a user join an ensemble using an 8-digit ensemble code.

    This is used when a user enters a code to join a group.
    """
    ensemble = crud.get_ensemble_by_code(db, ensemble_code)
    if not ensemble:
        raise HTTPException(status_code=404, detail="Ensemble code not found")

    user = crud.join_ensemble(db, user_id, ensemble_code)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/ensembles/{ensemble_id}/leaderboard", response_model=schemas.Leaderboard)
def get_leaderboard(ensemble_id: int, db: Session = Depends(get_db)):
    """
    Get the weekly leaderboard for an ensemble.

    Shows all members ranked by total practice minutes this week.
    """
    ensemble = crud.get_ensemble(db, ensemble_id)
    if not ensemble:
        raise HTTPException(status_code=404, detail="Ensemble not found")

    return crud.get_weekly_leaderboard(db, ensemble_id)


# =============================================================================
# CHALLENGE ROUTES
# =============================================================================

@app.post("/api/challenges", response_model=schemas.GroupChallenge)
def create_challenge(challenge: schemas.GroupChallengeCreate, db: Session = Depends(get_db)):
    """Create a new group challenge."""
    return crud.create_challenge(db, challenge)


@app.get("/api/challenges", response_model=List[schemas.GroupChallenge])
def get_challenges(
    ensemble_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get challenges for an ensemble.

    Filter by status: "active", "completed", "expired"
    """
    status_enum = None
    if status:
        try:
            status_enum = models.ChallengeStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")

    return crud.get_ensemble_challenges(db, ensemble_id, status_enum)


@app.get("/api/challenges/{challenge_id}", response_model=schemas.GroupChallenge)
def get_challenge(challenge_id: int, db: Session = Depends(get_db)):
    """Get a single challenge by ID."""
    challenge = crud.get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge


@app.post("/api/challenges/{challenge_id}/complete")
def complete_challenge(challenge_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Mark a challenge as completed by the user.

    Prevents duplicate completions.
    """
    challenge = crud.get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    success = crud.complete_challenge(db, challenge_id, user_id)
    if not success:
        return {"message": "Challenge already completed by this user"}

    return {"message": "Challenge completed!"}


@app.get("/api/challenges/{challenge_id}/progress", response_model=schemas.ChallengeProgress)
def get_challenge_progress(challenge_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Get detailed progress for a challenge.

    Shows total members, completed count, and whether the current user completed it.
    """
    progress = crud.get_challenge_progress(db, challenge_id, user_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return progress


# =============================================================================
# BADGE ROUTES
# =============================================================================

@app.get("/api/badges/{user_id}", response_model=List[schemas.Badge])
def get_user_badges(user_id: int, db: Session = Depends(get_db)):
    """
    Get all badges earned by a user.

    Badge types include:
    - first_session, streak_3, streak_7, streak_30
    - marathon, perfect_focus, early_bird, night_owl
    """
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return crud.get_user_badges(db, user_id)


# =============================================================================
# CALENDAR EVENT ROUTES
# =============================================================================

@app.post("/api/events", response_model=schemas.CalendarEvent)
def create_event(event: schemas.CalendarEventCreate, db: Session = Depends(get_db)):
    """
    Create a new calendar event.

    Event types:
    - practice_reminder: Scheduled practice time
    - lesson: Music lesson
    - performance: Concert, recital, gig
    - other: Custom event
    """
    return crud.create_calendar_event(db, event)


@app.get("/api/events", response_model=List[schemas.CalendarEvent])
def get_events(
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get calendar events for a user with optional filters."""
    type_enum = None
    if event_type:
        try:
            type_enum = models.CalendarEventType(event_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid event type")

    return crud.get_user_calendar_events(db, user_id, start_date, end_date, type_enum)


@app.get("/api/events/{event_id}", response_model=schemas.CalendarEvent)
def get_event(event_id: int, db: Session = Depends(get_db)):
    """Get a single calendar event by ID."""
    event = crud.get_calendar_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@app.patch("/api/events/{event_id}", response_model=schemas.CalendarEvent)
def update_event(event_id: int, event_update: schemas.CalendarEventUpdate, db: Session = Depends(get_db)):
    """Update a calendar event."""
    event = crud.update_calendar_event(db, event_id, event_update)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@app.delete("/api/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """Delete a calendar event."""
    success = crud.delete_calendar_event(db, event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}


# =============================================================================
# TEACHER-STUDENT ROUTES
# =============================================================================

@app.get("/api/teachers/code/{teacher_code}", response_model=schemas.User)
def get_teacher_by_code(teacher_code: str, db: Session = Depends(get_db)):
    """
    Look up a teacher by their unique code.
    Used by students to verify the code before linking.
    """
    teacher = crud.get_teacher_by_code(db, teacher_code)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found with that code")
    return teacher


@app.post("/api/students/{student_id}/link-teacher", response_model=schemas.User)
def link_student_to_teacher(
    student_id: int,
    teacher_code: str,
    db: Session = Depends(get_db)
):
    """
    Link a student to a teacher using the teacher's code.
    Updates the student's role to STUDENT and sets teacher_id.
    """
    student = crud.link_student_to_teacher(db, student_id, teacher_code)
    if not student:
        raise HTTPException(status_code=404, detail="Student or teacher not found")
    return student


@app.get("/api/teachers/{teacher_id}/students", response_model=List[schemas.User])
def get_teacher_students(teacher_id: int, db: Session = Depends(get_db)):
    """Get all students linked to a teacher."""
    teacher = crud.get_user(db, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    if teacher.role != models.UserRole.TEACHER:
        raise HTTPException(status_code=400, detail="User is not a teacher")
    return crud.get_teacher_students(db, teacher_id)


@app.get("/api/teachers/{teacher_id}/students/{student_id}/summary", response_model=schemas.StudentSummary)
def get_student_summary(teacher_id: int, student_id: int, db: Session = Depends(get_db)):
    """
    Get a summary of a student's practice for the teacher dashboard.
    Verifies that the student is linked to this teacher.
    """
    student = crud.get_user(db, student_id)
    if not student or student.teacher_id != teacher_id:
        raise HTTPException(status_code=404, detail="Student not found or not linked to this teacher")

    summary = crud.get_student_summary(db, student_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Could not generate summary")
    return summary


@app.get("/api/teachers/{teacher_id}/students/{student_id}/activity", response_model=List[schemas.PracticeSession])
def get_student_activity_log(
    teacher_id: int,
    student_id: int,
    limit: int = Query(default=20, le=50),
    db: Session = Depends(get_db)
):
    """
    Get the shared activity log for a student (recent practice sessions).
    Verifies that the student is linked to this teacher.
    """
    student = crud.get_user(db, student_id)
    if not student or student.teacher_id != teacher_id:
        raise HTTPException(status_code=404, detail="Student not found or not linked to this teacher")

    return crud.get_student_activity_log(db, student_id, limit)


# =============================================================================
# TEACHER NOTE ROUTES
# =============================================================================

@app.post("/api/notes", response_model=schemas.TeacherNote)
def create_note(
    sender_id: int,
    note: schemas.TeacherNoteCreate,
    db: Session = Depends(get_db)
):
    """
    Create a note from one user to another.
    Can be teacher->student or student->teacher.
    """
    sender = crud.get_user(db, sender_id)
    recipient = crud.get_user(db, note.recipient_id)
    if not sender or not recipient:
        raise HTTPException(status_code=404, detail="Sender or recipient not found")

    # Verify they have a teacher-student relationship
    if not (sender.teacher_id == note.recipient_id or recipient.teacher_id == sender_id):
        raise HTTPException(status_code=400, detail="Can only send notes to your teacher or students")

    return crud.create_teacher_note(db, sender_id, note)


@app.get("/api/notes/conversation/{user1_id}/{user2_id}", response_model=List[schemas.TeacherNote])
def get_notes_conversation(
    user1_id: int,
    user2_id: int,
    limit: int = Query(default=50, le=100),
    db: Session = Depends(get_db)
):
    """Get the conversation (notes) between two users."""
    return crud.get_notes_between_users(db, user1_id, user2_id, limit)


@app.get("/api/notes/unread/{user_id}", response_model=List[schemas.TeacherNote])
def get_unread_notes(user_id: int, db: Session = Depends(get_db)):
    """Get all unread notes for a user."""
    return crud.get_user_unread_notes(db, user_id)


@app.post("/api/notes/{note_id}/read", response_model=schemas.TeacherNote)
def mark_note_read(note_id: int, db: Session = Depends(get_db)):
    """Mark a note as read."""
    note = crud.mark_note_as_read(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.post("/api/notes/read-all")
def mark_all_notes_read(user_id: int, sender_id: int, db: Session = Depends(get_db)):
    """Mark all notes from a sender to a user as read."""
    count = crud.mark_notes_as_read(db, user_id, sender_id)
    return {"message": f"Marked {count} notes as read"}


# =============================================================================
# RUN SERVER (when executing python main.py directly)
# =============================================================================
if __name__ == "__main__":
    import uvicorn
    import subprocess
    import webbrowser
    import time
    import os
    import threading

    # Get project root directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(backend_dir)
    frontend_dir = os.path.join(project_dir, "frontend")

    # Start frontend in background
    print("Starting frontend...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=frontend_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Open browser after both servers are ready (only once)
    def open_browser():
        import urllib.request
        # Wait for backend to be ready
        for _ in range(30):
            time.sleep(0.5)
            try:
                urllib.request.urlopen("http://localhost:8000/", timeout=1)
                break
            except:
                pass

        # Wait for frontend to be ready
        for _ in range(30):
            time.sleep(0.5)
            try:
                urllib.request.urlopen("http://localhost:5173/", timeout=1)
                break
            except:
                pass

        time.sleep(1)
        print("\nOpening browser...")
        webbrowser.open("http://localhost:5173")

    threading.Thread(target=open_browser, daemon=True).start()

    print("\n" + "=" * 50)
    print("  PracticeBeats is starting!")
    print("  Frontend: http://localhost:5173")
    print("  Backend:  http://localhost:8000")
    print("  Press Ctrl+C to stop")
    print("=" * 50 + "\n")

    try:
        # reload=False to prevent double-startup flashing
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
    finally:
        frontend_process.terminate()


