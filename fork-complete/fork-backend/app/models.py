import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    college = Column(String, nullable=False)
    github_username = Column(String, nullable=True)
    repo_count = Column(Integer, default=0)
    followers = Column(Integer, default=0)
    avatar_url = Column(String, nullable=True)
    member_no = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    reactions_given = relationship("Reaction", back_populates="user", cascade="all, delete-orphan")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # build | achievement | referral | confession
    content = Column(Text, nullable=False)
    anonymous = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    author = relationship("User", back_populates="posts")
    reactions = relationship("Reaction", back_populates="post", cascade="all, delete-orphan")


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_user_post_reaction"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="reactions_given")
    post = relationship("Post", back_populates="reactions")
