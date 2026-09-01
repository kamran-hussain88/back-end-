from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app import models, schemas, auth
from app.serializers import serialize_post

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("", response_model=schemas.PostOut, status_code=201)
def create_post(
    payload: schemas.PostCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    post = models.Post(
        author_id=current_user.id,
        type=payload.type,
        content=payload.content.strip(),
        anonymous=(payload.type == "confession"),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return serialize_post(post)


@router.get("", response_model=list[schemas.PostOut])
def list_posts(db: Session = Depends(get_db)):
    posts = db.query(models.Post).order_by(desc(models.Post.created_at)).all()
    return [serialize_post(p) for p in posts]


@router.post("/{post_id}/react", response_model=schemas.PostOut)
def react_to_post(
    post_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id == current_user.id:
        raise HTTPException(status_code=400, detail="Can't co-sign your own post")

    existing = (
        db.query(models.Reaction)
        .filter(models.Reaction.post_id == post_id, models.Reaction.user_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already co-signed")

    db.add(models.Reaction(user_id=current_user.id, post_id=post_id))
    db.commit()
    db.refresh(post)
    return serialize_post(post)
