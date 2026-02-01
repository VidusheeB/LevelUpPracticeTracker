"""
=============================================================================
CRUD.PY - Database Operations (Create, Read, Update, Delete)
=============================================================================
This file contains all the database operations for PracticeBeats.

WHY SEPARATE FROM ROUTES:
- Keeps main.py clean and focused on HTTP handling
- Makes database logic reusable
- Easier to test business logic in isolation
- Clear separation of concerns

FUNCTION NAMING:
- create_xxx: Insert new record
- get_xxx: Fetch single record by ID
- get_xxxs: Fetch multiple records (often with filters)
- update_xxx: Modify existing record
- delete_xxx: Remove record

SPECIAL FUNCTIONS:
- calculate_points: Gamification point calculation
- update_streak: Streak maintenance logic
- calculate_readiness: Task readiness algorithm
- check_and_award_badges: Badge earning logic
=============================================================================
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import List, Optional
import random
import string

import models
import schemas


# =============================================================================
# ENSEMBLE OPERATIONS
# =============================================================================

def generate_ensemble_code(db: Session) -> str:
    """Generate a unique 8-digit ensemble code."""
    while True:
        code = ''.join(random.choices(string.digits, k=8))
        existing = db.query(models.Ensemble).filter(models.Ensemble.ensemble_code == code).first()
        if not existing:
            return code


def create_ensemble(db: Session, ensemble: schemas.EnsembleCreate) -> models.Ensemble:
    """
    Create a new ensemble (music group).
    Generates a unique 8-digit code for joining.
    Returns the created ensemble with its new ID.
    """
    db_ensemble = models.Ensemble(
        name=ensemble.name,
        type=ensemble.type,
        ensemble_code=generate_ensemble_code(db)
    )
    db.add(db_ensemble)
    db.commit()
    db.refresh(db_ensemble)  # Refresh to get the auto-generated ID
    return db_ensemble


def get_ensemble(db: Session, ensemble_id: int) -> Optional[models.Ensemble]:
    """Get a single ensemble by ID, or None if not found."""
    return db.query(models.Ensemble).filter(models.Ensemble.id == ensemble_id).first()


def get_ensemble_by_code(db: Session, ensemble_code: str) -> Optional[models.Ensemble]:
    """Get an ensemble by its code, or None if not found."""
    return db.query(models.Ensemble).filter(models.Ensemble.ensemble_code == ensemble_code).first()


def get_ensemble_members(db: Session, ensemble_id: int) -> List[models.User]:
    """Get all users who belong to an ensemble."""
    return db.query(models.User).filter(models.User.ensemble_id == ensemble_id).all()


def join_ensemble(db: Session, user_id: int, ensemble_code: str) -> Optional[models.Ensemble]:
    """
    Join a user to an ensemble using an ensemble code.
    Returns the ensemble if successful, None if code doesn't exist.
    """
    ensemble = get_ensemble_by_code(db, ensemble_code)
    if not ensemble:
        return None
    
    user = get_user(db, user_id)
    if user:
        user.ensemble_id = ensemble.id
        db.commit()
        db.refresh(user)
    
    return ensemble


# =============================================================================
# USER OPERATIONS
# =============================================================================

def generate_teacher_code(db: Session) -> str:
    """Generate a unique 6-digit teacher code."""
    while True:
        code = ''.join(random.choices(string.digits, k=6))
        existing = db.query(models.User).filter(models.User.teacher_code == code).first()
        if not existing:
            return code


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """
    Create a new user account.
    Initializes gamification stats to starting values.
    If role is TEACHER, generates a unique teacher code.
    If teacher_code_to_join is provided, links to that teacher.
    """
    # Generate teacher code if this is a teacher
    teacher_code = None
    if user.role == models.UserRole.TEACHER:
        teacher_code = generate_teacher_code(db)

    # Find teacher if student provides a code
    teacher_id = None
    if user.teacher_code_to_join:
        teacher = db.query(models.User).filter(
            models.User.teacher_code == user.teacher_code_to_join
        ).first()
        if teacher:
            teacher_id = teacher.id

    db_user = models.User(
        name=user.name,
        email=user.email,
        instrument=user.instrument,
        section=user.section,
        ensemble_id=user.ensemble_id,
        weekly_goal_minutes=user.weekly_goal_minutes or 300,
        streak_count=0,
        total_points=0,
        level=1,
        role=user.role,
        teacher_code=teacher_code,
        teacher_id=teacher_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    """Get a single user by ID."""
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Get a user by email address (for login)."""
    return db.query(models.User).filter(models.User.email == email).first()


def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate) -> Optional[models.User]:
    """
    Update user fields.
    Only updates fields that are provided (not None).
    """
    db_user = get_user(db, user_id)
    if not db_user:
        return None

    # Use exclude_none to skip only None values, allowing 0 to be set
    update_data = user_update.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_weekly_minutes(db: Session, user_id: int) -> int:
    """
    Calculate total practice minutes for the current week.
    Week starts on Monday (ISO standard).
    """
    today = date.today()
    # Get Monday of current week
    week_start = today - timedelta(days=today.weekday())

    result = db.query(func.sum(models.PracticeSession.duration_minutes)).filter(
        and_(
            models.PracticeSession.user_id == user_id,
            func.date(models.PracticeSession.start_time) >= week_start
        )
    ).scalar()

    return result or 0


def get_user_stats(db: Session, user_id: int) -> Optional[schemas.UserStats]:
    """
    Get aggregated stats for a user's dashboard.
    Combines stored stats with calculated weekly progress.
    """
    user = get_user(db, user_id)
    if not user:
        return None

    weekly_minutes = get_user_weekly_minutes(db, user_id)
    weekly_progress = (weekly_minutes / user.weekly_goal_minutes * 100) if user.weekly_goal_minutes > 0 else 0

    return schemas.UserStats(
        streak_count=user.streak_count,
        total_points=user.total_points,
        level=user.level,
        weekly_minutes=weekly_minutes,
        weekly_goal_minutes=user.weekly_goal_minutes,
        weekly_progress_percent=min(weekly_progress, 100)  # Cap at 100%
    )


# =============================================================================
# STREAK & POINTS LOGIC (The Gamification Engine!)
# =============================================================================

def update_streak(db: Session, user: models.User) -> None:
    """
    Update user's practice streak based on when they last practiced.

    STREAK RULES:
    - If never practiced before: start streak at 1
    - If already practiced today: no change (can't double-count)
    - If practiced yesterday: increment streak (consecutive!)
    - If more than 1 day gap: reset streak to 1 (broken)

    Called automatically when a practice session is saved.
    """
    today = date.today()

    if not user.last_practice_date:
        # First ever practice - start the streak!
        user.streak_count = 1
    elif user.last_practice_date == today:
        # Already practiced today - no change needed
        pass
    elif user.last_practice_date == today - timedelta(days=1):
        # Consecutive day - streak continues!
        user.streak_count += 1
    else:
        # Streak broken - more than 1 day gap
        user.streak_count = 1

    user.last_practice_date = today


def calculate_points(session: models.PracticeSession, user: models.User) -> int:
    """
    Calculate XP points earned for a practice session.

    POINT FORMULA:
    - Base: 1 point per minute practiced
    - Streak multiplier: 1.0x (no streak) to 2.0x (30+ day streak)
    - Quality bonus: +20% if focus rating >= 4

    This creates incentives to:
    1. Practice longer (more base points)
    2. Maintain streaks (multiplier builds over time)
    3. Practice with focus (quality bonus)
    """
    base_points = session.duration_minutes  # 1 point per minute

    # Streak multiplier - rewards consistency
    if user.streak_count >= 30:
        multiplier = 2.0   # 30+ days: double points!
    elif user.streak_count >= 7:
        multiplier = 1.5   # Week streak: 50% bonus
    elif user.streak_count >= 3:
        multiplier = 1.2   # 3 day streak: 20% bonus
    else:
        multiplier = 1.0   # No streak: base points

    # Quality bonus - rewards focused practice
    if session.focus_rating and session.focus_rating >= 4:
        quality_bonus = 0.2  # 20% bonus for high focus
    else:
        quality_bonus = 0

    total_points = int(base_points * multiplier * (1 + quality_bonus))
    return total_points


def update_user_level(db: Session, user: models.User) -> None:
    """
    Update user level based on total points.
    Simple formula: 100 XP per level.

    Level thresholds:
    - Level 1: 0 XP
    - Level 2: 100 XP
    - Level 3: 200 XP
    - etc.
    """
    new_level = (user.total_points // 100) + 1
    user.level = new_level


# =============================================================================
# PRACTICE SESSION OPERATIONS
# =============================================================================

def create_practice_session(
    db: Session,
    session: schemas.PracticeSessionCreate
) -> models.PracticeSession:
    """
    Create a new practice session and handle all side effects:
    1. Calculate and award points
    2. Update streak
    3. Update user level
    4. Update task practice counts and time
    5. Check for badges

    This is the main "end practice" flow - lots happening here!
    """
    user = get_user(db, session.user_id)
    if not user:
        raise ValueError("User not found")

    # Create the session record
    db_session = models.PracticeSession(
        user_id=session.user_id,
        start_time=session.start_time,
        duration_minutes=session.duration_minutes,
        focus_rating=session.focus_rating,
        progress_rating=session.progress_rating,
        energy_rating=session.energy_rating,
        notes=session.notes
    )

    # Update streak BEFORE calculating points (streak affects multiplier)
    update_streak(db, user)

    # Calculate and store points
    points = calculate_points(db_session, user)
    db_session.points_earned = points
    user.total_points += points

    # Update level based on new point total
    update_user_level(db, user)

    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    # Link tasks to this session and update task stats
    if session.tasks:
        for task_data in session.tasks:
            session_task = models.SessionTask(
                session_id=db_session.id,
                task_id=task_data.task_id,
                minutes_spent=task_data.minutes_spent
            )
            db.add(session_task)

            # Update the task's accumulated practice time
            task = get_task(db, task_data.task_id)
            if task:
                task.total_time_practiced += task_data.minutes_spent
                task.practice_count += 1
                # Auto-update status based on progress
                if task.status == models.TaskStatus.NOT_STARTED:
                    task.status = models.TaskStatus.IN_PROGRESS
                # Recalculate readiness
                task.readiness_score = calculate_task_readiness(db, task)

        db.commit()

    # Check for any badges earned
    check_and_award_badges(db, user, db_session)

    db.refresh(db_session)
    return db_session


def get_practice_session(db: Session, session_id: int) -> Optional[models.PracticeSession]:
    """Get a single practice session by ID."""
    return db.query(models.PracticeSession).filter(
        models.PracticeSession.id == session_id
    ).first()


def get_user_sessions(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 50
) -> List[models.PracticeSession]:
    """
    Get practice sessions for a user with optional date filtering.
    Useful for the calendar view and practice history.
    """
    query = db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == user_id
    )

    if start_date:
        query = query.filter(func.date(models.PracticeSession.start_time) >= start_date)
    if end_date:
        query = query.filter(func.date(models.PracticeSession.start_time) <= end_date)

    return query.order_by(models.PracticeSession.start_time.desc()).limit(limit).all()


def update_practice_session(
    db: Session,
    session_id: int,
    session_update: schemas.PracticeSessionUpdate
) -> Optional[models.PracticeSession]:
    """
    Update a practice session (typically to add quality ratings).
    If focus rating is improved, recalculate points.
    """
    db_session = get_practice_session(db, session_id)
    if not db_session:
        return None

    update_data = session_update.model_dump(exclude_unset=True)

    # Check if we need to recalculate points (focus rating changed)
    old_focus = db_session.focus_rating
    for field, value in update_data.items():
        setattr(db_session, field, value)

    # Recalculate points if focus rating was added/improved
    if 'focus_rating' in update_data and update_data['focus_rating'] != old_focus:
        user = get_user(db, db_session.user_id)
        old_points = db_session.points_earned
        new_points = calculate_points(db_session, user)
        point_diff = new_points - old_points
        db_session.points_earned = new_points
        user.total_points += point_diff
        update_user_level(db, user)

    db.commit()
    db.refresh(db_session)
    return db_session


def delete_practice_session(db: Session, session_id: int) -> bool:
    """
    Delete a practice session.
    Also removes points from user and updates task stats.
    """
    db_session = get_practice_session(db, session_id)
    if not db_session:
        return False

    # Remove points from user
    user = get_user(db, db_session.user_id)
    if user:
        user.total_points = max(0, user.total_points - db_session.points_earned)
        update_user_level(db, user)

    # Update task stats (subtract time)
    for st in db_session.session_tasks:
        task = st.task
        task.total_time_practiced = max(0, task.total_time_practiced - st.minutes_spent)
        task.practice_count = max(0, task.practice_count - 1)

    db.delete(db_session)
    db.commit()
    return True


# =============================================================================
# PRACTICE TASK OPERATIONS
# =============================================================================

def create_task(db: Session, task: schemas.PracticeTaskCreate) -> models.PracticeTask:
    """Create a new practice task."""
    db_task = models.PracticeTask(
        user_id=task.user_id,
        ensemble_id=task.ensemble_id,
        title=task.title,
        category=task.category,
        difficulty=task.difficulty,
        estimated_minutes=task.estimated_minutes,
        rehearsal_id=task.rehearsal_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_task(db: Session, task_id: int) -> Optional[models.PracticeTask]:
    """Get a single task by ID."""
    return db.query(models.PracticeTask).filter(models.PracticeTask.id == task_id).first()


def get_user_tasks(
    db: Session,
    user_id: int,
    status: Optional[models.TaskStatus] = None,
    rehearsal_id: Optional[int] = None
) -> List[models.PracticeTask]:
    """
    Get tasks for a user with optional filters.
    Can filter by status (not_started, in_progress, ready) or by rehearsal.
    Recalculates readiness scores to ensure they're current.
    """
    query = db.query(models.PracticeTask).filter(models.PracticeTask.user_id == user_id)

    if status:
        query = query.filter(models.PracticeTask.status == status)
    if rehearsal_id:
        query = query.filter(models.PracticeTask.rehearsal_id == rehearsal_id)

    tasks = query.order_by(models.PracticeTask.created_at.desc()).all()

    # Recalculate readiness scores to ensure they're current
    for task in tasks:
        task.readiness_score = calculate_task_readiness(db, task)
    db.commit()

    return tasks


def update_task(
    db: Session,
    task_id: int,
    task_update: schemas.PracticeTaskUpdate
) -> Optional[models.PracticeTask]:
    """Update a task's fields."""
    db_task = get_task(db, task_id)
    if not db_task:
        return None

    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)

    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int) -> bool:
    """Delete a task."""
    db_task = get_task(db, task_id)
    if not db_task:
        return False
    db.delete(db_task)
    db.commit()
    return True


# =============================================================================
# READINESS ALGORITHM
# =============================================================================

def calculate_task_readiness(db: Session, task: models.PracticeTask) -> float:
    """
    Calculate how "ready" a user is to perform a task (0-100 score).

    FORMULA:
    - Score = minutes_practiced + cumulative_rating_points
    - Max = estimated_minutes + (num_sessions × 30)
    - Readiness = (score / max) × 100

    Rating points: Each emoji level = 2 points
    - 3 ratings (focus, progress, energy) × 5 max × 2 = 30 points per session
    - Points accumulate across sessions, encouraging reflection each time

    Example (30 min task, 3 sessions with perfect ratings):
    - Score = 30 + (3 × 30) = 120
    - Max = 30 + (3 × 30) = 120
    - Readiness = 100%
    """
    # If task has no estimated time, can't calculate meaningfully
    if task.estimated_minutes <= 0:
        return 0.0

    # Get all sessions for this task
    session_tasks = db.query(models.SessionTask).filter(
        models.SessionTask.task_id == task.id
    ).all()

    # Calculate cumulative rating points from all sessions
    # Each rating level = 2 points (so 5-star = 10 points per rating)
    # Only sessions with at least one rating count toward the max
    cumulative_rating_points = 0
    rated_sessions = 0
    for st in session_tasks:
        session = st.session
        session_has_rating = False
        # Add points for each rating (2 points per level)
        if session.focus_rating:
            cumulative_rating_points += session.focus_rating * 2
            session_has_rating = True
        if session.progress_rating:
            cumulative_rating_points += session.progress_rating * 2
            session_has_rating = True
        if session.energy_rating:
            cumulative_rating_points += session.energy_rating * 2
            session_has_rating = True
        if session_has_rating:
            rated_sessions += 1

    # Calculate score and max
    # Unrated sessions don't penalize - only rated sessions add to max
    score = task.total_time_practiced + cumulative_rating_points
    max_rating_points = rated_sessions * 30  # Only rated sessions count
    max_score = task.estimated_minutes + max_rating_points

    # Avoid division by zero
    if max_score <= 0:
        return 0.0

    # Calculate readiness percentage (cap at 100)
    readiness = (score / max_score) * 100
    return min(readiness, 100.0)


# =============================================================================
# REHEARSAL OPERATIONS
# =============================================================================

def create_rehearsal(db: Session, rehearsal: schemas.RehearsalCreate) -> models.Rehearsal:
    """Create a new rehearsal."""
    db_rehearsal = models.Rehearsal(
        ensemble_id=rehearsal.ensemble_id,
        date=rehearsal.date,
        location=rehearsal.location,
        notes=rehearsal.notes
    )
    db.add(db_rehearsal)
    db.commit()
    db.refresh(db_rehearsal)
    return db_rehearsal


def get_rehearsal(db: Session, rehearsal_id: int) -> Optional[models.Rehearsal]:
    """Get a single rehearsal by ID."""
    return db.query(models.Rehearsal).filter(models.Rehearsal.id == rehearsal_id).first()


def get_ensemble_rehearsals(
    db: Session,
    ensemble_id: int,
    upcoming_only: bool = False,
    limit: Optional[int] = None
) -> List[models.Rehearsal]:
    """
    Get rehearsals for an ensemble.
    If upcoming_only=True, only returns future rehearsals (soonest first).
    If limit is set, returns at most that many (e.g., 3 most recent upcoming).
    """
    query = db.query(models.Rehearsal).filter(models.Rehearsal.ensemble_id == ensemble_id)

    if upcoming_only:
        query = query.filter(models.Rehearsal.date >= datetime.now())

    query = query.order_by(models.Rehearsal.date)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def update_rehearsal(
    db: Session,
    rehearsal_id: int,
    rehearsal_update: schemas.RehearsalUpdate
) -> Optional[models.Rehearsal]:
    """Update rehearsal details."""
    db_rehearsal = get_rehearsal(db, rehearsal_id)
    if not db_rehearsal:
        return None

    update_data = rehearsal_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_rehearsal, field, value)

    db.commit()
    db.refresh(db_rehearsal)
    return db_rehearsal


def delete_rehearsal(db: Session, rehearsal_id: int) -> bool:
    """Delete a rehearsal."""
    db_rehearsal = get_rehearsal(db, rehearsal_id)
    if not db_rehearsal:
        return False
    db.delete(db_rehearsal)
    db.commit()
    return True


# =============================================================================
# GROUP CHALLENGE OPERATIONS
# =============================================================================

def create_challenge(db: Session, challenge: schemas.GroupChallengeCreate) -> models.GroupChallenge:
    """Create a new group challenge."""
    db_challenge = models.GroupChallenge(
        ensemble_id=challenge.ensemble_id,
        title=challenge.title,
        description=challenge.description,
        goal_type=challenge.goal_type,
        goal_value=challenge.goal_value,
        start_date=challenge.start_date,
        end_date=challenge.end_date
    )
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    return db_challenge


def get_challenge(db: Session, challenge_id: int) -> Optional[models.GroupChallenge]:
    """Get a single challenge by ID."""
    return db.query(models.GroupChallenge).filter(
        models.GroupChallenge.id == challenge_id
    ).first()


def get_ensemble_challenges(
    db: Session,
    ensemble_id: int,
    status: Optional[models.ChallengeStatus] = None
) -> List[models.GroupChallenge]:
    """Get challenges for an ensemble, optionally filtered by status."""
    query = db.query(models.GroupChallenge).filter(
        models.GroupChallenge.ensemble_id == ensemble_id
    )

    if status:
        query = query.filter(models.GroupChallenge.status == status)

    return query.order_by(models.GroupChallenge.created_at.desc()).all()


def complete_challenge(db: Session, challenge_id: int, user_id: int) -> bool:
    """
    Mark a challenge as completed by a user.
    Prevents duplicate completions.
    """
    # Check if already completed
    existing = db.query(models.ChallengeCompletion).filter(
        and_(
            models.ChallengeCompletion.challenge_id == challenge_id,
            models.ChallengeCompletion.user_id == user_id
        )
    ).first()

    if existing:
        return False  # Already completed

    completion = models.ChallengeCompletion(
        challenge_id=challenge_id,
        user_id=user_id
    )
    db.add(completion)
    db.commit()
    return True


def get_challenge_progress(db: Session, challenge_id: int, current_user_id: int) -> schemas.ChallengeProgress:
    """
    Get progress info for a challenge.
    Returns total members, completed count, and who completed it.
    """
    challenge = get_challenge(db, challenge_id)
    if not challenge:
        return None

    # Get all ensemble members
    members = get_ensemble_members(db, challenge.ensemble_id)
    total_members = len(members)

    # Get completions
    completions = db.query(models.ChallengeCompletion).filter(
        models.ChallengeCompletion.challenge_id == challenge_id
    ).all()

    completed_users = [c.user for c in completions]
    user_completed = any(c.user_id == current_user_id for c in completions)

    return schemas.ChallengeProgress(
        challenge=challenge,
        total_members=total_members,
        completed_count=len(completions),
        completed_by=completed_users,
        user_completed=user_completed
    )


# =============================================================================
# LEADERBOARD
# =============================================================================

def get_weekly_leaderboard(db: Session, ensemble_id: int) -> schemas.Leaderboard:
    """
    Get the weekly leaderboard for an ensemble.
    Ranks users by total practice minutes this week.
    """
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    members = get_ensemble_members(db, ensemble_id)

    entries = []
    for member in members:
        # Get weekly minutes
        weekly_minutes = db.query(func.sum(models.PracticeSession.duration_minutes)).filter(
            and_(
                models.PracticeSession.user_id == member.id,
                func.date(models.PracticeSession.start_time) >= week_start,
                func.date(models.PracticeSession.start_time) <= week_end
            )
        ).scalar() or 0

        # Get weekly points
        weekly_points = db.query(func.sum(models.PracticeSession.points_earned)).filter(
            and_(
                models.PracticeSession.user_id == member.id,
                func.date(models.PracticeSession.start_time) >= week_start,
                func.date(models.PracticeSession.start_time) <= week_end
            )
        ).scalar() or 0

        entries.append({
            'user': member,
            'weekly_minutes': weekly_minutes,
            'weekly_points': weekly_points
        })

    # Sort by weekly minutes (descending)
    entries.sort(key=lambda x: x['weekly_minutes'], reverse=True)

    # Add ranks
    leaderboard_entries = [
        schemas.LeaderboardEntry(
            rank=i + 1,
            user=entry['user'],
            weekly_minutes=entry['weekly_minutes'],
            weekly_points=entry['weekly_points']
        )
        for i, entry in enumerate(entries)
    ]

    return schemas.Leaderboard(
        entries=leaderboard_entries,
        period_start=week_start,
        period_end=week_end
    )


# =============================================================================
# BADGE OPERATIONS
# =============================================================================

def check_and_award_badges(
    db: Session,
    user: models.User,
    session: models.PracticeSession
) -> List[models.Badge]:
    """
    Check if a user earned any badges from their latest session.
    Awards badges automatically based on various criteria.

    BADGE TYPES:
    - first_session: Complete your first practice
    - streak_3: 3-day streak
    - streak_7: Week-long streak
    - streak_30: Month-long streak
    - marathon: 60+ minute session
    - perfect_focus: 5-star focus rating
    - early_bird: Practice before 8am
    - night_owl: Practice after 10pm
    """
    new_badges = []

    def award_badge(badge_type: str):
        # Check if already has this badge
        existing = db.query(models.Badge).filter(
            and_(
                models.Badge.user_id == user.id,
                models.Badge.badge_type == badge_type
            )
        ).first()
        if not existing:
            badge = models.Badge(user_id=user.id, badge_type=badge_type)
            db.add(badge)
            new_badges.append(badge)

    # First session badge
    session_count = db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == user.id
    ).count()
    if session_count == 1:
        award_badge("first_session")

    # Streak badges
    if user.streak_count >= 3:
        award_badge("streak_3")
    if user.streak_count >= 7:
        award_badge("streak_7")
    if user.streak_count >= 30:
        award_badge("streak_30")

    # Marathon badge (60+ minutes)
    if session.duration_minutes >= 60:
        award_badge("marathon")

    # Perfect focus badge
    if session.focus_rating == 5:
        award_badge("perfect_focus")

    # Time-based badges
    session_hour = session.start_time.hour
    if session_hour < 8:
        award_badge("early_bird")
    if session_hour >= 22:
        award_badge("night_owl")

    db.commit()
    return new_badges


def get_user_badges(db: Session, user_id: int) -> List[models.Badge]:
    """Get all badges earned by a user."""
    return db.query(models.Badge).filter(models.Badge.user_id == user_id).all()


# =============================================================================
# CALENDAR EVENT OPERATIONS
# =============================================================================

def create_calendar_event(db: Session, event: schemas.CalendarEventCreate) -> models.CalendarEvent:
    """Create a new calendar event."""
    db_event = models.CalendarEvent(
        user_id=event.user_id,
        title=event.title,
        event_type=event.event_type,
        date=event.date,
        end_date=event.end_date,
        location=event.location,
        notes=event.notes
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def get_calendar_event(db: Session, event_id: int) -> Optional[models.CalendarEvent]:
    """Get a single calendar event by ID."""
    return db.query(models.CalendarEvent).filter(models.CalendarEvent.id == event_id).first()


def get_user_calendar_events(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    event_type: Optional[models.CalendarEventType] = None
) -> List[models.CalendarEvent]:
    """Get calendar events for a user with optional filters."""
    query = db.query(models.CalendarEvent).filter(models.CalendarEvent.user_id == user_id)

    if start_date:
        query = query.filter(func.date(models.CalendarEvent.date) >= start_date)
    if end_date:
        query = query.filter(func.date(models.CalendarEvent.date) <= end_date)
    if event_type:
        query = query.filter(models.CalendarEvent.event_type == event_type)

    return query.order_by(models.CalendarEvent.date).all()


def update_calendar_event(
    db: Session,
    event_id: int,
    event_update: schemas.CalendarEventUpdate
) -> Optional[models.CalendarEvent]:
    """Update a calendar event."""
    db_event = get_calendar_event(db, event_id)
    if not db_event:
        return None

    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_event, field, value)

    db.commit()
    db.refresh(db_event)
    return db_event


def delete_calendar_event(db: Session, event_id: int) -> bool:
    """Delete a calendar event."""
    db_event = get_calendar_event(db, event_id)
    if not db_event:
        return False
    db.delete(db_event)
    db.commit()
    return True


# =============================================================================
# TEACHER-STUDENT OPERATIONS
# =============================================================================

def get_teacher_by_code(db: Session, teacher_code: str) -> Optional[models.User]:
    """Get a teacher by their unique code."""
    return db.query(models.User).filter(
        and_(
            models.User.teacher_code == teacher_code,
            models.User.role == models.UserRole.TEACHER
        )
    ).first()


def link_student_to_teacher(db: Session, student_id: int, teacher_code: str) -> Optional[models.User]:
    """Link a student to a teacher using the teacher's code."""
    student = get_user(db, student_id)
    if not student:
        return None

    teacher = get_teacher_by_code(db, teacher_code)
    if not teacher:
        return None

    student.teacher_id = teacher.id
    student.role = models.UserRole.STUDENT
    db.commit()
    db.refresh(student)
    return student


def get_teacher_students(db: Session, teacher_id: int) -> List[models.User]:
    """Get all students linked to a teacher."""
    return db.query(models.User).filter(
        models.User.teacher_id == teacher_id
    ).all()


def get_student_summary(db: Session, student_id: int) -> Optional[schemas.StudentSummary]:
    """Get a summary of a student's practice for teacher dashboard."""
    student = get_user(db, student_id)
    if not student:
        return None

    # If student hasn't opted to share practice, return zeros for practice-derived stats
    if not student.share_practice_with_teacher:
        return schemas.StudentSummary(
            user=student,
            weekly_minutes=0,
            streak_count=0,
            total_sessions_this_week=0,
            last_practice_date=None
        )

    weekly_minutes = get_user_weekly_minutes(db, student_id)

    # Count sessions this week
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    sessions_this_week = db.query(models.PracticeSession).filter(
        and_(
            models.PracticeSession.user_id == student_id,
            func.date(models.PracticeSession.start_time) >= week_start
        )
    ).count()

    return schemas.StudentSummary(
        user=student,
        weekly_minutes=weekly_minutes,
        streak_count=student.streak_count,
        total_sessions_this_week=sessions_this_week,
        last_practice_date=student.last_practice_date
    )


def get_student_activity_log(
    db: Session,
    student_id: int,
    limit: int = 20
) -> List[models.PracticeSession]:
    """
    Get recent practice sessions for a student.
    Only returns data if the student has opted in to share (share_practice_with_teacher=True).
    """
    student = get_user(db, student_id)
    if not student or not student.share_practice_with_teacher:
        return []
    return db.query(models.PracticeSession).filter(
        models.PracticeSession.user_id == student_id
    ).order_by(models.PracticeSession.start_time.desc()).limit(limit).all()


def assign_task_to_student(
    db: Session,
    teacher_id: int,
    student_id: int,
    task: schemas.PracticeTaskBase
) -> models.PracticeTask:
    """Assign a practice task to a student from a teacher."""
    db_task = models.PracticeTask(
        user_id=student_id,
        title=task.title,
        category=task.category,
        difficulty=task.difficulty,
        estimated_minutes=task.estimated_minutes,
        assigned_by=teacher_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


# =============================================================================
# TEACHER NOTE OPERATIONS
# =============================================================================

def create_teacher_note(
    db: Session,
    sender_id: int,
    note: schemas.TeacherNoteCreate
) -> models.TeacherNote:
    """Create a note from teacher to student or vice versa."""
    db_note = models.TeacherNote(
        sender_id=sender_id,
        recipient_id=note.recipient_id,
        content=note.content
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


def get_notes_between_users(
    db: Session,
    user1_id: int,
    user2_id: int,
    limit: int = 50
) -> List[models.TeacherNote]:
    """Get notes exchanged between two users (conversation view)."""
    return db.query(models.TeacherNote).filter(
        ((models.TeacherNote.sender_id == user1_id) & (models.TeacherNote.recipient_id == user2_id)) |
        ((models.TeacherNote.sender_id == user2_id) & (models.TeacherNote.recipient_id == user1_id))
    ).order_by(models.TeacherNote.created_at.desc()).limit(limit).all()


def get_user_unread_notes(db: Session, user_id: int) -> List[models.TeacherNote]:
    """Get unread notes for a user."""
    return db.query(models.TeacherNote).filter(
        and_(
            models.TeacherNote.recipient_id == user_id,
            models.TeacherNote.is_read == False
        )
    ).order_by(models.TeacherNote.created_at.desc()).all()


def mark_note_as_read(db: Session, note_id: int) -> Optional[models.TeacherNote]:
    """Mark a note as read."""
    note = db.query(models.TeacherNote).filter(models.TeacherNote.id == note_id).first()
    if not note:
        return None
    note.is_read = True
    db.commit()
    db.refresh(note)
    return note


def mark_notes_as_read(db: Session, user_id: int, sender_id: int) -> int:
    """Mark all notes from a sender to a user as read. Returns count marked."""
    result = db.query(models.TeacherNote).filter(
        and_(
            models.TeacherNote.recipient_id == user_id,
            models.TeacherNote.sender_id == sender_id,
            models.TeacherNote.is_read == False
        )
    ).update({models.TeacherNote.is_read: True})
    db.commit()
    return result
