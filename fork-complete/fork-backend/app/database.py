import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# DATABASE_URL examples:
#   SQLite (default, zero-setup, great for local dev):
#       sqlite:///./fork.db
#   PostgreSQL (recommended for production):
#       postgresql://user:password@localhost:5432/fork_db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fork.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
