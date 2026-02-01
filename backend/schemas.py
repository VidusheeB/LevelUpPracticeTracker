"""
=============================================================================
SCHEMAS.PY - Pydantic Models for Request/Response Validation
=============================================================================
This file defines the data shapes for our API requests and responses.

WHY PYDANTIC:
- Automatic request validation (FastAPI + Pydantic = magic)
- Type hints that actually work at runtime
- Auto-generated API documentation
- Serialization/deserialization handled for us

NAMING CONVENTION:
- XxxBase: Common fields shared between create/read
- XxxCreate: Fields needed when creating a new record
- XxxUpdate: Fields that can be updated (all optional)
- Xxx: Full response schema with all fields (including id, timestamps)

HOW FASTAPI USES THESE:
- Request body: FastAPI validates incoming JSON against Create/Update schemas
- Response: FastAPI serializes database objects using the response schema
- Both: Automatically documented in /docs (Swagger UI)
=============================================================================
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


# -----------------------------------------------------------------------------
# ENUM SCHEMAS
# -----------------------------------------------------------------------------
# Mirror the SQLAlchemy enums for API consistency

class TaskCategory(str, Enum):
    REPERTOIRE = "repertoire"
    TECHNIQUE = "technique"
    SIGHT_READING = "sight_reading"
    SECTION_WORK = "section_work"


class TaskStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    READY = "ready"


class ChallengeGoalType(str, Enum):
    INDIVIDUAL_MINUTES = "individual_minutes"
    ALL_MEMBERS_PRACTICE = "all_members_practice"
    SECTION_COMPETITION = "section_competition"


class ChallengeStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"


class CalendarEventType(str, Enum):
    PRACTICE_REMINDER = "practice_reminder"
    LESSON = "lesson"
    PERFORMANCE = "performance"
    OTHER = "other"


class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    PERSONAL = "personal"


# =============================================================================
# ENSEMBLE SCHEMAS
# =============================================================================

class EnsembleBase(BaseModel):
    """Base ensemble fields - name and type are the core identifiers"""
    name: str
    type: Optional[str] = None


class EnsembleCreate(EnsembleBase):
    """Creating an ensemble - just need name and optionally type"""
    pass


class Ensemble(EnsembleBase):
    """
    Full ensemble response - includes id, timestamp, and ensemble code.
    Used when returning ensemble data from the API.
    """
    id: int
    ensemble_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True  # Allows SQLAlchemy model -> Pydantic conversion


# =============================================================================
# USER SCHEMAS
# =============================================================================

class UserBase(BaseModel):
    """Core user fields needed for most operations"""
    name: str
    email: EmailStr  # Pydantic validates email format automatically
    instrument: Optional[str] = None
    section: Optional[str] = None


class UserCreate(UserBase):
    """
    Creating a new user - can optionally join an ensemble right away.
    Weekly goal defaults to 300 min (5 hours) if not specified.
    """
    role: UserRole = UserRole.PERSONAL
    ensemble_id: Optional[int] = None
    weekly_goal_minutes: Optional[int] = 300
    teacher_code_to_join: Optional[str] = None  # Student provides teacher's code


class UserUpdate(BaseModel):
    """
    Updating a user - all fields optional.
    Only include fields you want to change in the request.
    """
    name: Optional[str] = None
    instrument: Optional[str] = None
    section: Optional[str] = None
    ensemble_id: Optional[int] = None
    weekly_goal_minutes: Optional[int] = None
    role: Optional[UserRole] = None
    teacher_code_to_join: Optional[str] = None  # To link to a teacher
    share_practice_with_teacher: Optional[bool] = None  # Student opt-in to share practice log


class User(UserBase):
    """
    Full user response with all gamification stats.
    This is what we return when fetching user data.
    """
    id: int
    role: UserRole
    ensemble_id: Optional[int] = None
    teacher_code: Optional[str] = None  # Only for teachers
    teacher_id: Optional[int] = None  # Only for students
    share_practice_with_teacher: bool = False  # Student opt-in to share practice log
    weekly_goal_minutes: int
    streak_count: int
    total_points: int
    level: int
    last_practice_date: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserStats(BaseModel):
    """
    Aggregated user statistics - calculated fields.
    Used for the dashboard display.
    """
    streak_count: int
    total_points: int
    level: int
    weekly_minutes: int  # Calculated: sum of practice this week
    weekly_goal_minutes: int
    weekly_progress_percent: float  # weekly_minutes / weekly_goal * 100


# =============================================================================
# REHEARSAL SCHEMAS
# =============================================================================

class RehearsalBase(BaseModel):
    """Core rehearsal info - when, where, and any notes"""
    date: datetime
    location: Optional[str] = None
    notes: Optional[str] = None


class RehearsalCreate(RehearsalBase):
    """Creating a rehearsal - must specify which ensemble"""
    ensemble_id: int


class RehearsalUpdate(BaseModel):
    """Updating rehearsal - all fields optional"""
    date: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class Rehearsal(RehearsalBase):
    """Full rehearsal response with ID and relationships"""
    id: int
    ensemble_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# PRACTICE TASK SCHEMAS
# =============================================================================

class PracticeTaskBase(BaseModel):
    """Core task fields - what you're practicing and how hard it is"""
    title: str
    category: TaskCategory = TaskCategory.REPERTOIRE
    difficulty: int = 3  # 1-5 scale
    estimated_minutes: int = 30


class PracticeTaskCreate(PracticeTaskBase):
    """
    Creating a task - must specify user.
    Optionally link to ensemble and/or rehearsal.
    """
    user_id: int
    ensemble_id: Optional[int] = None
    rehearsal_id: Optional[int] = None


class PracticeTaskUpdate(BaseModel):
    """
    Updating a task - all fields optional.
    Status can be updated manually or auto-calculated based on readiness.
    """
    title: Optional[str] = None
    category: Optional[TaskCategory] = None
    difficulty: Optional[int] = None
    estimated_minutes: Optional[int] = None
    status: Optional[TaskStatus] = None
    rehearsal_id: Optional[int] = None


class PracticeTask(PracticeTaskBase):
    """
    Full task response with progress tracking.
    Includes calculated readiness score and practice history.
    """
    id: int
    user_id: int
    ensemble_id: Optional[int] = None
    rehearsal_id: Optional[int] = None
    assigned_by: Optional[int] = None  # Teacher who assigned this task
    total_time_practiced: int
    practice_count: int
    status: TaskStatus
    readiness_score: float
    created_at: datetime
    # Include rehearsal info if linked
    rehearsal: Optional[Rehearsal] = None

    class Config:
        from_attributes = True


# =============================================================================
# SESSION TASK SCHEMAS (the link between sessions and tasks)
# =============================================================================

class SessionTaskCreate(BaseModel):
    """
    When ending a session, specify which tasks you practiced.
    Each entry says "I spent X minutes on task Y"
    """
    task_id: int
    minutes_spent: int


class SessionTask(SessionTaskCreate):
    """Full session-task link with IDs"""
    id: int
    session_id: int

    class Config:
        from_attributes = True


# =============================================================================
# PRACTICE SESSION SCHEMAS
# =============================================================================

class PracticeSessionBase(BaseModel):
    """Core session data - when it happened and how long"""
    start_time: datetime
    duration_minutes: int


class PracticeSessionCreate(BaseModel):
    """
    Creating a session - simplified for the timer flow.
    Start time and duration are calculated when timer stops.
    Tasks can be added as a list with time breakdown.
    """
    user_id: int
    start_time: datetime
    duration_minutes: int
    notes: Optional[str] = None
    # Quality ratings (usually added at end of session)
    focus_rating: Optional[int] = None
    progress_rating: Optional[int] = None
    energy_rating: Optional[int] = None
    # Which tasks were practiced and for how long
    tasks: Optional[List[SessionTaskCreate]] = []


class PracticeSessionUpdate(BaseModel):
    """
    Updating a session - typically to add quality ratings.
    Called when user completes the end-of-session form.
    """
    focus_rating: Optional[int] = None
    progress_rating: Optional[int] = None
    energy_rating: Optional[int] = None
    notes: Optional[str] = None


class PracticeSession(PracticeSessionBase):
    """Full session response with all data"""
    id: int
    user_id: int
    focus_rating: Optional[int] = None
    progress_rating: Optional[int] = None
    energy_rating: Optional[int] = None
    notes: Optional[str] = None
    points_earned: int
    created_at: datetime
    session_tasks: List[SessionTask] = []

    class Config:
        from_attributes = True


# =============================================================================
# GROUP CHALLENGE SCHEMAS
# =============================================================================

class GroupChallengeBase(BaseModel):
    """Core challenge fields - what's the goal and when"""
    title: str
    description: Optional[str] = None
    goal_type: ChallengeGoalType
    goal_value: int
    start_date: date
    end_date: date


class GroupChallengeCreate(GroupChallengeBase):
    """Creating a challenge for an ensemble"""
    ensemble_id: int


class GroupChallengeUpdate(BaseModel):
    """Updating a challenge - typically just status"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ChallengeStatus] = None


class GroupChallenge(GroupChallengeBase):
    """Full challenge response"""
    id: int
    ensemble_id: int
    status: ChallengeStatus
    created_at: datetime

    class Config:
        from_attributes = True


class ChallengeProgress(BaseModel):
    """
    Challenge progress for UI display.
    Shows how many members have completed and who.
    """
    challenge: GroupChallenge
    total_members: int
    completed_count: int
    completed_by: List[User]
    user_completed: bool  # Did the current user complete it?


# =============================================================================
# BADGE SCHEMAS
# =============================================================================

class BadgeBase(BaseModel):
    """Badge type identifier"""
    badge_type: str


class Badge(BadgeBase):
    """Full badge with user and timestamp"""
    id: int
    user_id: int
    earned_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# LEADERBOARD SCHEMAS
# =============================================================================

class LeaderboardEntry(BaseModel):
    """
    Single entry in the weekly leaderboard.
    Shows user info and their weekly practice stats.
    """
    rank: int
    user: User
    weekly_minutes: int
    weekly_points: int


class Leaderboard(BaseModel):
    """Full leaderboard with all entries"""
    entries: List[LeaderboardEntry]
    period_start: date
    period_end: date


# =============================================================================
# AUTH SCHEMAS
# =============================================================================

class LoginRequest(BaseModel):
    """Simple login - just email for MVP (no passwords for hackathon)"""
    email: EmailStr


class LoginResponse(BaseModel):
    """Login response with user data (no tokens for MVP simplicity)"""
    user: User
    message: str = "Login successful"


# =============================================================================
# CALENDAR EVENT SCHEMAS
# =============================================================================

class CalendarEventBase(BaseModel):
    """Core calendar event fields"""
    title: str
    event_type: CalendarEventType = CalendarEventType.OTHER
    date: datetime
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class CalendarEventCreate(CalendarEventBase):
    """Creating a calendar event - must specify user"""
    user_id: int


class CalendarEventUpdate(BaseModel):
    """Updating a calendar event - all fields optional"""
    title: Optional[str] = None
    event_type: Optional[CalendarEventType] = None
    date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class CalendarEvent(CalendarEventBase):
    """Full calendar event response"""
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# TEACHER NOTE SCHEMAS
# =============================================================================

class TeacherNoteBase(BaseModel):
    """Core note fields"""
    content: str


class TeacherNoteCreate(TeacherNoteBase):
    """Creating a note - must specify recipient"""
    recipient_id: int


class TeacherNoteUpdate(BaseModel):
    """Updating a note - typically just marking as read"""
    is_read: Optional[bool] = None


class TeacherNote(TeacherNoteBase):
    """Full note response"""
    id: int
    sender_id: int
    recipient_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# STUDENT SUMMARY SCHEMA (for teacher dashboard)
# =============================================================================

class StudentSummary(BaseModel):
    """Summary of a student's practice for teacher view"""
    user: User
    weekly_minutes: int
    streak_count: int
    total_sessions_this_week: int
    last_practice_date: Optional[date] = None