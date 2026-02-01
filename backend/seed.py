"""
=============================================================================
SEED.PY - Database Seed Script for Demo Data
=============================================================================
This script populates the database with realistic demo data for testing
and demonstrations.

HOW TO RUN:
    cd backend
    python seed.py

WHAT IT CREATES:
    - 1 Ensemble: "SFJAZZ High School All-Stars"
    - 5 Users across different sections (brass, woodwind, rhythm)
    - 2 Upcoming rehearsals
    - Multiple practice tasks per user
    - Practice sessions with varying progress levels
    - 1 Active group challenge
    - Sample badges for some users

This gives you a realistic demo scenario with:
    - Users at different practice levels
    - Some users with high readiness, some with low
    - Active streak users and users who need to get back on track
    - A group challenge partially completed
=============================================================================
"""

from datetime import datetime, date, timedelta
import random

# Import our database and models
from database import SessionLocal, engine
import models

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)


def clear_database(db):
    """Clear all existing data for a fresh seed."""
    print("Clearing existing data...")
    db.query(models.Badge).delete()
    db.query(models.ChallengeCompletion).delete()
    db.query(models.GroupChallenge).delete()
    db.query(models.SessionTask).delete()
    db.query(models.PracticeSession).delete()
    db.query(models.PracticeTask).delete()
    db.query(models.Rehearsal).delete()
    db.query(models.User).delete()
    db.query(models.Ensemble).delete()
    db.commit()


def seed_database():
    """Main seed function - creates all demo data."""
    db = SessionLocal()

    try:
        # Clear existing data first
        clear_database(db)

        print("Creating ensemble...")
        # -------------------------------------------------------------------------
        # CREATE ENSEMBLE
        # -------------------------------------------------------------------------
        from crud import generate_ensemble_code, generate_teacher_code
        
        ensemble = models.Ensemble(
            name="SFJAZZ High School All-Stars",
            type="jazz band",
            ensemble_code=generate_ensemble_code(db)
        )
        db.add(ensemble)
        db.commit()
        db.refresh(ensemble)
        print(f"  Created: {ensemble.name} (ID: {ensemble.id})")
        print(f"  Ensemble Code: {ensemble.ensemble_code}")

        # -------------------------------------------------------------------------
        # CREATE TEACHER
        # -------------------------------------------------------------------------
        print("\nCreating teacher...")
        
        teacher = models.User(
            name="Dr. Maria Santos",
            email="teacher@demo.com",
            instrument="Saxophone",
            section="woodwind",
            role=models.UserRole.TEACHER,
            teacher_code=generate_teacher_code(db),
            ensemble_id=ensemble.id,
            weekly_goal_minutes=0,
            streak_count=0,
            total_points=0,
            level=0,
            last_practice_date=None
        )
        db.add(teacher)
        db.commit()
        db.refresh(teacher)
        print(f"  Created: {teacher.name} (Teacher)")
        print(f"    Teacher Code: {teacher.teacher_code}")

        # -------------------------------------------------------------------------
        # CREATE STUDENTS (NOT LINKED TO TEACHER - BLANK SLATE FOR DEMO)
        # -------------------------------------------------------------------------
        print("\nCreating demo student accounts (not yet linked to teacher)...")
        users_data = [
            {
                "name": "Alex Rivera",
                "email": "alex@demo.com",
                "instrument": "Trumpet",
                "section": "brass",
                "streak_count": 0,
                "total_points": 0,
                "level": 1,
                "last_practice_date": None,
                "role": models.UserRole.PERSONAL
            },
            {
                "name": "Jordan Kim",
                "email": "jordan@demo.com",
                "instrument": "Alto Saxophone",
                "section": "woodwind",
                "streak_count": 0,
                "total_points": 0,
                "level": 1,
                "last_practice_date": None,
                "role": models.UserRole.PERSONAL
            },
            {
                "name": "Sam Chen",
                "email": "sam@demo.com",
                "instrument": "Piano",
                "section": "rhythm",
                "streak_count": 0,
                "total_points": 0,
                "level": 1,
                "last_practice_date": None,
                "role": models.UserRole.PERSONAL
            },
            {
                "name": "Taylor Johnson",
                "email": "taylor@demo.com",
                "instrument": "Drums",
                "section": "rhythm",
                "streak_count": 0,
                "total_points": 0,
                "level": 1,
                "last_practice_date": None,
                "role": models.UserRole.PERSONAL
            },
            {
                "name": "Casey Williams",
                "email": "casey@demo.com",
                "instrument": "Trombone",
                "section": "brass",
                "streak_count": 0,
                "total_points": 0,
                "level": 1,
                "last_practice_date": None,
                "role": models.UserRole.PERSONAL
            }
        ]

        users = []
        for user_data in users_data:
            user = models.User(
                ensemble_id=ensemble.id,
                weekly_goal_minutes=0,  # Users set their own goal
                **user_data
            )
            db.add(user)
            users.append(user)
            print(f"  Created: {user.name} ({user.instrument}) - ready to join teacher")

        db.commit()
        for user in users:
            db.refresh(user)

        # =========================================================================
        # BLANK SLATE - No rehearsals, tasks, sessions, or challenges
        # This allows the demo to show the full flow from scratch
        # =========================================================================
        print("\n✅ Fresh blank slate ready for demo!")

        # =========================================================================
        # SUMMARY
        # =========================================================================

        print("\n" + "=" * 60)
        print("SEED COMPLETE - BLANK SLATE DEMO!")
        print("=" * 60)
        print(f"""
🎵 FRESH DEMO SETUP:

ENSEMBLE:
  Name: SFJAZZ High School All-Stars
  📝 Ensemble Code: {ensemble.ensemble_code}
  👉 Use this code for personal accounts to join

TEACHER ACCOUNT:
  📧 Email: teacher@demo.com
  👩‍🏫 Name: Dr. Maria Santos
  🔐 Teacher Code: {teacher.teacher_code}
  
  ✨ Students: NONE YET (fresh slate!)
  👉 Ready to demo the student joining flow

STUDENT ACCOUNTS (NOT YET LINKED):
  📧 alex@demo.com      (Trumpet)
  📧 jordan@demo.com    (Alto Sax)
  📧 sam@demo.com       (Piano)
  📧 taylor@demo.com    (Drums)
  📧 casey@demo.com     (Trombone)

DEMO FLOW:
1. Teacher login (teacher@demo.com) - show teacher code
2. Student login with teacher code - joins as student
3. Personal login - join ensemble with ensemble code {ensemble.ensemble_code}
4. Create tasks, rehearsals, send notes

CODES TO REMEMBER:
  👩‍🏫 Teacher Code (for students): {teacher.teacher_code}
  👥 Ensemble Code (for personal users): {ensemble.ensemble_code}

NO EXISTING DATA:
  ❌ No practice sessions
  ❌ No tasks
  ❌ No challenges
  ❌ No rehearsals
  ✅ Pure blank slate for fresh demo
""")




    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
