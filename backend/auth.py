"""
auth.py — Simple single-user PIN+password authentication for AI-LMIS demo.

Credentials are read from .env:
  ACCESS_PIN      (default: 26246)
  ACCESS_PASSWORD (default: zeroone)

PRODUCTION NOTE: Replace with RBAC, NIC SSO, MFA and audit logging.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    pin: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_HOURS * 3600


# ─── Token helpers ────────────────────────────────────────────────────────────

def _create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """FastAPI dependency — validates JWT and returns user info dict."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc
    return {"sub": sub}


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse, summary="Login with PIN and password")
def login(body: LoginRequest):
    """
    Authenticate with the system PIN and password.
    Returns a JWT bearer token valid for 24 hours.

    Demo credentials:
    - pin: 26246
    - password: zeroone
    """
    if body.pin != settings.ACCESS_PIN or body.password != settings.ACCESS_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN or password.",
        )
    token = _create_token({"sub": f"pin:{body.pin}"})
    return TokenResponse(access_token=token)
