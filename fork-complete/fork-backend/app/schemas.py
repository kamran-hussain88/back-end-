import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class JoinRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    college: str
    github: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    college: str
    github: Optional[str] = None
    repoCount: int
    followers: int
    avatarUrl: Optional[str] = None
    memberNo: int
    joinedAt: int  # epoch ms, matches frontend's Date.now()-style fields


class JoinResponse(BaseModel):
    access_token: str
    user: UserOut
    warning: Optional[str] = None


class MeResponse(UserOut):
    reactedPostIds: List[int] = []


class PostCreate(BaseModel):
    type: str = Field(pattern="^(build|achievement|referral|confession)$")
    content: str = Field(min_length=1, max_length=2000)


class PostOut(BaseModel):
    id: int
    authorId: int
    type: str
    content: str
    anonymous: bool
    reactions: int
    createdAt: int
