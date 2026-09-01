import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.serializers import serialize_user

router = APIRouter(tags=["members"])

GITHUB_API = "https://api.github.com"


def _fetch_github(username: str):
    """Returns (data_dict_or_None, ok_bool). Never raises — network/GitHub
    issues degrade gracefully, matching the original frontend's behavior of
    joining without GitHub data if the lookup fails."""
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(f"{GITHUB_API}/users/{username}")
            if resp.status_code != 200:
                return None, False
            d = resp.json()
            return {
                "repo_count": d.get("public_repos", 0),
                "followers": d.get("followers", 0),
                "avatar_url": d.get("avatar_url"),
            }, True
    except httpx.HTTPError:
        return None, False


@router.post("/join", response_model=schemas.JoinResponse, status_code=201)
def join(payload: schemas.JoinRequest, db: Session = Depends(get_db)):
    github_username = None
    github_fields = {"repo_count": 0, "followers": 0, "avatar_url": None}
    warning = None

    if payload.github and payload.github.strip():
        data, ok = _fetch_github(payload.github.strip())
        if ok:
            github_username = payload.github.strip()
            github_fields = data
        else:
            warning = "Couldn't verify that GitHub username — joining without it for now."

    member_no = db.query(models.User).count() + 1
    user = models.User(
        name=payload.name.strip(),
        college=payload.college,
        github_username=github_username,
        member_no=member_no,
        **github_fields,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": serialize_user(user), "warning": warning}


@router.get("/me", response_model=schemas.MeResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    reacted_ids = [r.post_id for r in current_user.reactions_given]
    return {**serialize_user(current_user), "reactedPostIds": reacted_ids}


@router.post("/me/github/refresh", response_model=schemas.UserOut)
def refresh_github(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.github_username:
        raise HTTPException(status_code=400, detail="No GitHub username linked to this profile")

    data, ok = _fetch_github(current_user.github_username)
    if not ok:
        raise HTTPException(status_code=502, detail="Couldn't reach GitHub right now")

    current_user.repo_count = data["repo_count"]
    current_user.followers = data["followers"]
    current_user.avatar_url = data["avatar_url"]
    db.commit()
    db.refresh(current_user)
    return serialize_user(current_user)


@router.delete("/me", status_code=204)
def leave(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(current_user)
    db.commit()


@router.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return [serialize_user(u) for u in db.query(models.User).all()]
