"""File storage for uploaded documents.

Supports local filesystem storage with directory creation.
"""

from __future__ import annotations

import os
from pathlib import Path
from pathlib import PurePath
from typing import Optional

import structlog

from app.config import Settings

logger = structlog.get_logger(__name__)

_upload_dir: Optional[Path] = None


async def init_storage(settings: Settings) -> None:
    """Initialize the upload directory."""
    global _upload_dir
    _upload_dir = Path(settings.upload_dir)
    _upload_dir.mkdir(parents=True, exist_ok=True)
    logger.info("storage_initialized", upload_dir=str(_upload_dir))


def get_upload_dir() -> Path:
    """Get the upload directory path."""
    if _upload_dir is None:
        raise RuntimeError("Storage not initialized.")
    return _upload_dir


async def save_file(session_id: str, filename: str, content: bytes) -> Path:
    """Save an uploaded file to the session directory.

    Returns:
        Path to the saved file.
    """
    session_dir = get_upload_dir() / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = PurePath(str(filename)).name or 'document'
    filepath = session_dir / safe_filename
    filepath.write_bytes(content)

    logger.info(
        "file_saved",
        session_id=session_id,
        filename=filename,
        size_bytes=len(content),
    )
    return filepath


async def get_file(session_id: str, filename: str) -> Optional[bytes]:
    """Read a saved file."""
    filepath = get_upload_dir() / session_id / filename
    if filepath.exists():
        return filepath.read_bytes()
    return None


async def delete_session_files(session_id: str) -> None:
    """Delete all files for a session."""
    import shutil
    session_dir = get_upload_dir() / session_id
    if session_dir.exists():
        shutil.rmtree(session_dir)
        logger.info("session_files_deleted", session_id=session_id)
