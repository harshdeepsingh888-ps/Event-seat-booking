from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.auth import UserCreate, LoginRequest, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token

class AuthService:
    @staticmethod
    async def register_user(db: AsyncSession, payload: UserCreate) -> UserResponse:
        stmt = select(User).where(User.email == payload.email)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already registered"
            )

        hashed_pwd = hash_password(payload.password)
        user = User(
            email=payload.email,
            hashed_password=hashed_pwd,
            full_name=payload.full_name,
            role=payload.role.upper() if payload.role else "USER"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            created_at=user.created_at
        )

    @staticmethod
    async def login_user(db: AsyncSession, payload: LoginRequest) -> TokenResponse:
        stmt = select(User).where(User.email == payload.email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        token = create_access_token(subject=user.id, role=user.role)
        user_res = UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            created_at=user.created_at
        )
        return TokenResponse(access_token=token, token_type="bearer", user=user_res)
