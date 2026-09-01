from app import models


def ms(dt) -> int:
    return int(dt.timestamp() * 1000)


def serialize_user(user: models.User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "college": user.college,
        "github": user.github_username,
        "repoCount": user.repo_count,
        "followers": user.followers,
        "avatarUrl": user.avatar_url,
        "memberNo": user.member_no,
        "joinedAt": ms(user.created_at),
    }


def serialize_post(post: models.Post) -> dict:
    return {
        "id": post.id,
        "authorId": post.author_id,
        "type": post.type,
        "content": post.content,
        "anonymous": post.anonymous,
        "reactions": len(post.reactions),
        "createdAt": ms(post.created_at),
    }
