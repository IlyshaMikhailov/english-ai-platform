"""Authentication endpoints: register, login, OAuth2 token, and demo sign-in."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.db.seed import ensure_admin_user, ensure_demo_user, seed_topics_and_tasks
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import TokenResponse, UserLoginRequest, UserRegisterRequest
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Register a new learner account and return an access token."""
    existing = await db.execute(
        select(User).where(
            or_(User.email == payload.email, User.username == payload.username)
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or username already exists.",
        )

    user = User(
        username=payload.username.strip(),
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        level=payload.level,
        is_first_login=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


async def _authenticate_user(
    db: AsyncSession, identifier: str, password: str
) -> User:
    normalized = identifier.strip()
    result = await db.execute(
        select(User).where(
            or_(
                User.email == normalized.lower(),
                User.username == normalized,
            )
        )
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate with username or email and password."""
    user = await _authenticate_user(db, payload.identifier, payload.password)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/token")
async def login_oauth2_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """OAuth2-compatible password token endpoint for OpenAPI Swagger UI."""
    user = await _authenticate_user(db, form_data.username, form_data.password)
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/demo", response_model=TokenResponse)
async def demo_login(db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Sign in as the seeded demo learner (creating demo data if empty)."""
    user = await ensure_demo_user(db)
    await seed_topics_and_tasks(db)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/admin-demo", response_model=TokenResponse)
async def admin_demo_login(db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Sign in as the seeded administrator."""
    admin = await ensure_admin_user(db)
    token = create_access_token(admin.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(admin))
