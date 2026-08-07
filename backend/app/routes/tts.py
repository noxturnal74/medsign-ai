from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from app.tts.services import TTSService

router = APIRouter()
tts_service = TTSService()

class TTSSynthesizeRequest(BaseModel):
    text: str
    provider: str = "sapi"
    voice: str = "Microsoft Andika"
    rate: float = 1.0
    pitch: float = 1.0

@router.get("/tts/providers")
def get_providers():
    try:
        return tts_service.get_providers_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tts/voices")
def get_voices(provider: str = "sapi"):
    try:
        return tts_service.get_voices(provider)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts/synthesize")
def synthesize_speech(request: TTSSynthesizeRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    try:
        audio_path, stats = tts_service.synthesize(
            text=request.text,
            provider=request.provider,
            voice=request.voice,
            rate=request.rate,
            pitch=request.pitch
        )
        
        # We append stats details to headers
        headers = {
            "X-TTS-Provider": stats["provider"],
            "X-TTS-Voice": stats["voice"],
            "X-TTS-Cache-Hit": str(stats["cache_hit"]),
            "X-TTS-Gen-Time-Ms": str(stats["generation_time_ms"]),
            "X-TTS-Audio-Size": str(stats["audio_size_bytes"]),
            "Access-Control-Expose-Headers": "X-TTS-Provider, X-TTS-Voice, X-TTS-Cache-Hit, X-TTS-Gen-Time-Ms, X-TTS-Audio-Size"
        }
        
        return FileResponse(
            path=audio_path,
            media_type="audio/wav",
            filename="speech.wav",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")
