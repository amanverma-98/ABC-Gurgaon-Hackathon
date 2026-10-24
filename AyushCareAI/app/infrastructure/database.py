"""Database initialisation and session management.

Uses SQLAlchemy async with support for PostgreSQL (production)
and SQLite (development).
"""

from __future__ import annotations

from typing import Optional

import structlog
from sqlalchemy import Column, DateTime, String, Text, Integer, Boolean, JSON, func
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import Settings

logger = structlog.get_logger(__name__)

_engine: Optional[AsyncEngine] = None
_session_factory: Optional[sessionmaker] = None


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""
    pass


# ── ORM Models ───────────────────────────────────────────────────────────

class SessionRecord(Base):
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True)
    patient_id = Column(String(128), nullable=False, index=True)
    facility_id = Column(String(128), default="unassigned")
    language = Column(String(5), default="en")
    intake_pathway = Column(String(20), default="general")
    status = Column(String(20), default="active")
    consent_granted = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, onupdate=func.now())


class ConversationRecord(Base):
    __tablename__ = "conversation_turns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), nullable=False, index=True)
    question_id = Column(String(128), nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=False)
    input_mode = Column(String(20), default="text")
    asr_confidence = Column(String(10), nullable=True)
    phase = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class DocumentRecord(Base):
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True)
    session_id = Column(String(64), nullable=False, index=True)
    filename = Column(String(256), nullable=False)
    document_type = Column(String(30), default="other")
    processing_status = Column(String(30), default="pending")
    ocr_text = Column(Text, nullable=True)
    entities_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class ConsentRecord(Base):
    __tablename__ = "consent_receipts"

    id = Column(String(64), primary_key=True)
    session_id = Column(String(64), nullable=False, index=True)
    scopes_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)


class AuditRecord(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), nullable=True, index=True)
    event_type = Column(String(50), nullable=False)
    actor = Column(String(128), default="system")
    detail = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ── Engine Management ────────────────────────────────────────────────────

async def init_db(settings: Settings) -> None:
    """Initialize the database engine and create tables."""
    global _engine, _session_factory

    _engine = create_async_engine(
        settings.database_url,
        echo=settings.database_echo,
    )
    _session_factory = sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Create tables safely across multiple workers
    try:
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        if "already exists" in str(e).lower():
            logger.info("database_tables_already_exist")
        else:
            raise

    logger.info("database_initialized", url=settings.database_url.split("@")[-1])


async def close_db() -> None:
    """Close the database engine."""
    global _engine
    if _engine:
        await _engine.dispose()
        _engine = None
        logger.info("database_closed")


async def get_db_session() -> AsyncSession:
    """Get a database session for dependency injection."""
    if _session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    async with _session_factory() as session:
        yield session
