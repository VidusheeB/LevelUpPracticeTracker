"""
=============================================================================
MODELS.PY - SQLAlchemy Database Models
=============================================================================
This file defines all the database tables for PracticeBeats.

MODEL OVERVIEW (and their relationships):
- Ensemble: A music group (jazz band, orchestra, etc.)
- User: Musicians who practice and belong to ensembles
- Rehearsal: Scheduled ensemble rehearsals with dates/locations
- PracticeTask: Things to practice (pieces, scales, etc.)
- PracticeSession: A logged practice session with duration and ratings
- SessionTask: Links sessions to tasks (many-to-many relationship)
- GroupChallenge: Team challenges like "everyone practice 30min today"
- ChallengeCompletion: Tracks who completed a challenge
- Badge: Achievement badges earned by users

RELATIONSHIP MAP:
    Ensemble (1) ──────┬───── (many) User
                       ├───── (many) Rehearsal
                       └───── (many) GroupChallenge

    User (1) ──────────┬───── (many) PracticeSession
                       ├───── (many) PracticeTask
                       ├───── (many) Badge
                       └───── (many) ChallengeCompletion

    PracticeSession (1) ──── (many) SessionTask ──── (many) PracticeTask

    Rehearsal (1) ────────── (many) PracticeTask

GAMIFICATION ELEMENTS:
- streak_count: Consecutive days of practice
- total_points: Accumulated XP from practice sessions
- level: Calculated from total_points
- readiness_score: How prepared you are for a piece (0-100)
=============================================================================
"""

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, Date, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base


# -----------------------------------------------------------------------------
# ENUM DEFINITIONS
# -----------------------------------------------------------------------------
# Using Python enums makes the code cleaner and catches typos at runtime

class TaskCategory(str, enum.Enum):
    """Categories for practice tasks - helps organize what you're working on"""
    REPERTOIRE = "repertoire"       # Pieces you're learning/performing
    TECHNIQUE = "technique"         # Scales, arpeggios, exercises
    SIGHT_READING = "sight_reading" # Reading new music
    SECTION_WORK = "section_work"   # Ensemble-specific parts


class TaskStatus(str, enum.Enum):
    """Progress status for practice tasks"""
    NOT_STARTED = "not_started"  # Haven't touched it yet
    IN_PROGRESS = "in_progress"  # Working on it
    READY = "ready"              # Performance-ready


class ChallengeGoalType(str, enum.Enum):
    """Types of group challenges - different ways teams can compete"""
    INDIVIDUAL_MINUTES = "individual_minutes"     # Each person practices X minutes
    ALL_MEMBERS_PRACTICE = "all_members_practice" # Everyone practices today
    SECTION_COMPETITION = "section_competition"   # Brass vs Woodwind etc


class ChallengeStatus(str, enum.Enum):
    """Status of a group challenge"""
    ACTIVE = "active"       # Currently running
    COMPLETED = "completed" # Successfully finished
    EXPIRED = "expired"     # Time ran out


class CalendarEventType(str, enum.Enum):
    """Types of calendar events users can create"""
    PRACTICE_REMINDER = "practice_reminder"  # Scheduled practice time
    LESSON = "lesson"                        # Music lesson
    PERFORMANCE = "performance"              # Concert, recital, gig
    REHEARSAL = "rehearsal"                  # Ensemble/group rehearsal
    OTHER = "other"                          # Custom event


class UserRole(str, enum.Enum):
    """User account types"""
    STUDENT = "student"    # Student linked to a teacher
    TEACHER = "teacher"    # Teacher with students
    PERSONAL = "personal"  # Solo user, no teacher connection


# -----------------------------------------------------------------------------
# ENSEMBLE MODEL
# -----------------------------------------------------------------------------
class Ensemble(Base):
    """
    An ensemble is a music group that users belong to.

    Examples: "SFJAZZ High School All-Stars", "Community Orchestra"

    This is the top-level grouping - users join ensembles, and the ensemble
    has rehearsals and challenges that members participate in.
    """
    __tablename__ = "ensembles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(100))  # e.g., "jazz band", "orchestra", "choir"
    ensemble_code = Column(String(8), unique=True, nullable=True)  # 8-digit code for joining
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships - these let us easily access related data
    members = relationship("User", back_populates="ensemble")
    rehearsals = relationship("Rehearsal", back_populates="ensemble")
    challenges = relationship("GroupChallenge", back_populates="ensemble")
    tasks = relationship("PracticeTask", back_populates="ensemble")


# -----------------------------------------------------------------------------
# USER MODEL
# -----------------------------------------------------------------------------
class User(Base):
    """
    A musician using the app to track their practice.

    GAMIFICATION FIELDS:
    - weekly_goal_minutes: Personal target (default 5 hours = 300 min)
    - streak_count: Days in a row of practice (Duolingo-style!)
    - total_points: XP earned from practice (more for quality, streak bonus)
    - level: Calculated from total_points (100 XP per level)
    - last_practice_date: Used to calculate streak

    SECTION FIELD:
    Used for section-based challenges (brass vs woodwind, etc.)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    instrument = Column(String(100))
    section = Column(String(100))  # "brass", "woodwind", "strings", "rhythm"

    # User role (student, teacher, or personal)
    role = Column(Enum(UserRole), default=UserRole.PERSONAL)

    # Teacher-Student linking
    teacher_code = Column(String(6), unique=True, nullable=True)  # 6-digit code for teachers
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Students link to teacher
    share_practice_with_teacher = Column(Boolean, default=False)  # Student opt-in to share practice log

    # Ensemble membership (optional - solo users can exist)
    ensemble_id = Column(Integer, ForeignKey("ensembles.id"), nullable=True)

    # Gamification & Goals
    weekly_goal_minutes = Column(Integer, default=300)  # 5 hours default
    streak_count = Column(Integer, default=0)
    total_points = Column(Integer, default=0)
    level = Column(Integer, default=1)
    last_practice_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ensemble = relationship("Ensemble", back_populates="members")
    sessions = relationship("PracticeSession", back_populates="user")
    tasks = relationship("PracticeTask", back_populates="user")
    badges = relationship("Badge", back_populates="user")
    challenge_completions = relationship("ChallengeCompletion", back_populates="user")
    calendar_events = relationship("CalendarEvent", back_populates="user")

    # Teacher-Student relationships
    teacher = relationship("User", remote_side=[id], foreign_keys=[teacher_id], backref="students")
    sent_notes = relationship("TeacherNote", foreign_keys="TeacherNote.sender_id", back_populates="sender")
    received_notes = relationship("TeacherNote", foreign_keys="TeacherNote.recipient_id", back_populates="recipient")


# -----------------------------------------------------------------------------
# REHEARSAL MODEL
# -----------------------------------------------------------------------------
class Rehearsal(Base):
    """
    A scheduled ensemble rehearsal.

    Tasks can be linked to rehearsals to track "readiness for this rehearsal."
    The calendar view shows upcoming rehearsals with their linked tasks.

    The days until rehearsal affects readiness urgency - a task for tomorrow's
    rehearsal shows as more urgent than one for next month.
    """
    __tablename__ = "rehearsals"

    id = Column(Integer, primary_key=True, index=True)
    ensemble_id = Column(Integer, ForeignKey("ensembles.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ensemble = relationship("Ensemble", back_populates="rehearsals")
    tasks = relationship("PracticeTask", back_populates="rehearsal")


# -----------------------------------------------------------------------------
# PRACTICE TASK MODEL
# -----------------------------------------------------------------------------
class PracticeTask(Base):
    """
    Something the user needs to practice.

    Examples:
    - "Autumn Leaves - Solo section" (repertoire, linked to rehearsal)
    - "Major scales all keys" (technique, no rehearsal)
    - "Sight-read new chart" (sight_reading)

    READINESS TRACKING:
    - total_time_practiced: Minutes spent on this task overall
    - practice_count: Number of sessions that included this task
    - readiness_score: Calculated 0-100 score (see crud.py for algorithm)

    Tasks can be assigned to a specific rehearsal OR be standalone.
    Rehearsal-linked tasks show urgency based on days until rehearsal.
    """
    __tablename__ = "practice_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ensemble_id = Column(Integer, ForeignKey("ensembles.id"), nullable=True)

    title = Column(String(255), nullable=False)
    category = Column(Enum(TaskCategory), default=TaskCategory.REPERTOIRE)
    difficulty = Column(Integer, default=3)  # 1-5 scale
    estimated_minutes = Column(Integer, default=30)  # How long it should take

    # Progress tracking
    total_time_practiced = Column(Integer, default=0)  # Accumulated minutes
    practice_count = Column(Integer, default=0)  # How many sessions
    status = Column(Enum(TaskStatus), default=TaskStatus.NOT_STARTED)
    readiness_score = Column(Float, default=0.0)  # 0-100 calculated score

    # Optional link to a rehearsal (for "prepare for Thursday's rehearsal")
    rehearsal_id = Column(Integer, ForeignKey("rehearsals.id"), nullable=True)

    # Teacher assignment tracking
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="tasks")
    ensemble = relationship("Ensemble", back_populates="tasks")
    rehearsal = relationship("Rehearsal", back_populates="tasks")
    session_tasks = relationship("SessionTask", back_populates="task")


# -----------------------------------------------------------------------------
# PRACTICE SESSION MODEL
# -----------------------------------------------------------------------------
class PracticeSession(Base):
    """
    A logged practice session - the core of the app!

    When a user hits "Start Practice", we create a session.
    When they stop, we record duration and ask for quality ratings.

    QUALITY RATINGS (1-5 each):
    - focus_rating: How focused were you?
    - progress_rating: Did you make progress?
    - energy_rating: How did you feel?

    These ratings affect readiness calculations and can trigger badges.
    Points are calculated based on duration, quality, and streak multiplier.
    """
    __tablename__ = "practice_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    start_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)

    # Quality ratings (optional, filled in at end of session)
    focus_rating = Column(Integer, nullable=True)     # 1-5
    progress_rating = Column(Integer, nullable=True)  # 1-5
    energy_rating = Column(Integer, nullable=True)    # 1-5

    notes = Column(Text, nullable=True)  # Free-form session notes
    points_earned = Column(Integer, default=0)  # XP earned this session

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="sessions")
    session_tasks = relationship("SessionTask", back_populates="session")


# -----------------------------------------------------------------------------
# SESSION-TASK LINK (Many-to-Many)
# -----------------------------------------------------------------------------
class SessionTask(Base):
    """
    Links practice sessions to tasks (many-to-many with extra data).

    In a single session, you might practice multiple tasks:
    - 15 min on "Autumn Leaves"
    - 10 min on "Major Scales"
    - 5 min on "Sight Reading"

    This table tracks the breakdown of time per task within a session.
    When we calculate task readiness, we sum up all SessionTask entries.
    """
    __tablename__ = "session_tasks"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("practice_sessions.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("practice_tasks.id"), nullable=False)
    minutes_spent = Column(Integer, nullable=False)  # Time on this task in this session

    # Relationships
    session = relationship("PracticeSession", back_populates="session_tasks")
    task = relationship("PracticeTask", back_populates="session_tasks")


# -----------------------------------------------------------------------------
# GROUP CHALLENGE MODEL
# -----------------------------------------------------------------------------
class GroupChallenge(Base):
    """
    Team challenges to encourage group practice.

    Examples:
    - "Everyone practice 30 minutes today" (all_members_practice)
    - "Brass section: total 2 hours this week" (section_competition)
    - "Each person practice Autumn Leaves 3 times" (individual_minutes)

    Challenges have a start/end date and track completion per user.
    When enough members complete it, the challenge status changes to completed.
    """
    __tablename__ = "group_challenges"

    id = Column(Integer, primary_key=True, index=True)
    ensemble_id = Column(Integer, ForeignKey("ensembles.id"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    goal_type = Column(Enum(ChallengeGoalType), nullable=False)
    goal_value = Column(Integer, nullable=False)  # Target (e.g., 30 minutes)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum(ChallengeStatus), default=ChallengeStatus.ACTIVE)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ensemble = relationship("Ensemble", back_populates="challenges")
    completions = relationship("ChallengeCompletion", back_populates="challenge")


# -----------------------------------------------------------------------------
# CHALLENGE COMPLETION MODEL
# -----------------------------------------------------------------------------
class ChallengeCompletion(Base):
    """
    Tracks which users have completed a challenge.

    When a user meets the challenge criteria, we create a completion record.
    This lets us show progress like "3/5 members done" on the UI.
    """
    __tablename__ = "challenge_completions"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("group_challenges.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    challenge = relationship("GroupChallenge", back_populates="completions")
    user = relationship("User", back_populates="challenge_completions")


# -----------------------------------------------------------------------------
# BADGE MODEL
# -----------------------------------------------------------------------------
class Badge(Base):
    """
    Achievement badges for gamification.

    Badge types (examples):
    - "early_bird": Practice before 8am
    - "night_owl": Practice after 10pm
    - "7_day_streak": Week-long streak
    - "30_day_streak": Month-long streak
    - "marathon": 60+ minute session
    - "perfect_focus": 5-star focus rating
    - "first_session": Complete your first practice

    Badges are awarded automatically based on triggers in the business logic.
    """
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_type = Column(String(100), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="badges")


# -----------------------------------------------------------------------------
# CALENDAR EVENT MODEL
# -----------------------------------------------------------------------------
class CalendarEvent(Base):
    """
    Generic calendar events for users.

    Unlike practice sessions (auto-created) or rehearsals (ensemble-based),
    these are user-created events like:
    - Practice reminders ("Practice scales at 5pm")
    - Lessons ("Piano lesson with Mrs. Smith")
    - Performances ("Spring concert")
    - Other custom events
    """
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(255), nullable=False)
    event_type = Column(Enum(CalendarEventType), default=CalendarEventType.OTHER)
    date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)  # Optional end time
    location = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="calendar_events")


# -----------------------------------------------------------------------------
# TEACHER NOTE MODEL
# -----------------------------------------------------------------------------
class TeacherNote(Base):
    """
    Notes exchanged between teachers and students.

    This enables two-way communication:
    - Teacher can send feedback/assignments to students
    - Students can send questions/updates to teacher
    """
    __tablename__ = "teacher_notes"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_notes")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_notes")
