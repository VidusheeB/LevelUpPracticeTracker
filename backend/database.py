"""
=============================================================================
DATABASE.PY - Database Connection & Session Management
=============================================================================
This file handles all database connectivity for PracticeBeats.

WHAT IT DOES:
- Creates a SQLite database file (practice_beats.db) in the backend folder
- Sets up SQLAlchemy engine for database operations
- Provides a session factory for creating database sessions
- Defines a dependency function for FastAPI to inject DB sessions into routes

WHY SQLITE:
- Perfect for hackathon/MVP: no server setup, just a file
- Easy to reset/seed data during development
- Can upgrade to PostgreSQL later by just changing the URL

HOW TO USE:
- Import `get_db` in your route files and use as a FastAPI Depends()
- Import `engine` and `Base` in your models file
- Import `SessionLocal` if you need direct session access (like seeding)
=============================================================================
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# -----------------------------------------------------------------------------
# DATABASE URL CONFIGURATION
# -----------------------------------------------------------------------------
# SQLite connection string - creates a file called 'practice_beats.db'
# The 'check_same_thread' arg is needed for SQLite + FastAPI async compatibility
SQLALCHEMY_DATABASE_URL = "sqlite:///./practice_beats.db"

# -----------------------------------------------------------------------------
# ENGINE SETUP
# -----------------------------------------------------------------------------
# The engine is the core interface to the database
# It handles the actual DBAPI connections and pooling
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite
)

# -----------------------------------------------------------------------------
# SESSION FACTORY
# -----------------------------------------------------------------------------
# SessionLocal is a factory that creates new Session objects
# Each session is a "workspace" for database operations
# autocommit=False means we control when changes are saved
# autoflush=False means we control when changes are sent to DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# -----------------------------------------------------------------------------
# BASE CLASS FOR MODELS
# -----------------------------------------------------------------------------
# All our database models will inherit from this Base class
# SQLAlchemy uses this to track all models and create tables
Base = declarative_base()


# -----------------------------------------------------------------------------
# DEPENDENCY INJECTION FOR FASTAPI
# -----------------------------------------------------------------------------
def get_db():
    """
    FastAPI dependency that provides a database session.

    HOW IT WORKS:
    1. Creates a new database session when a request comes in
    2. Yields it to the route handler (so it can use it)
    3. Automatically closes the session when the request is done

    USAGE IN ROUTES:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()

    WHY THIS PATTERN:
    - Ensures each request gets its own fresh session
    - Guarantees cleanup even if an error occurs (finally block)
    - Standard FastAPI pattern for dependency injection
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
