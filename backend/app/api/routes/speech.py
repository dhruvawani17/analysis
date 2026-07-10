import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.config import settings
from app.api.deps import get_current_user
from app.db.models import User

router = APIRouter()

GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


@router.post("")
async def speech_to_text(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Transcribe audio using Groq Whisper Large V3."""
    if not settings.groq_api_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    # Read audio bytes
    audio_bytes = await file.read()

    # Validate file size (max 25MB)
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large (max 25MB)")

    # Determine content type and filename
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "webm"
    media_type_map = {
        "webm": "audio/webm",
        "mp4": "audio/mp4",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        "flac": "audio/flac",
    }
    media_type = media_type_map.get(ext, file.content_type or "audio/webm")
    filename = f"audio.{ext}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_STT_URL,
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                },
                files={
                    "file": (filename, audio_bytes, media_type),
                },
                data={
                    "model": "whisper-large-v3",
                    "temperature": 0,
                    "response_format": "verbose_json",
                },
            )

        if response.status_code != 200:
            error_detail = response.text
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Groq STT API error: {error_detail}",
            )

        result = response.json()
        text = result.get("text", "")

        return {"text": text, "language": result.get("language", "en")}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="STT request timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")
