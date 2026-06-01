from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal
import time

router = APIRouter()

class LogEntryRequest(BaseModel):
    session_id: Optional[str] = Field(None, description="UUID sesi konsultasi")
    role: Literal["patient", "doctor"] = Field(..., description="Role pengirim pesan")
    text: str = Field(..., description="Teks pesan hasil translasi / ketikan")
    emoji: Optional[str] = Field(None, description="Emoji visualisasi")
    confidence: Optional[float] = Field(None, description="Nilai keyakinan model jika dari isyarat")
    timestamp: str = Field(..., description="Waktu terkirim (ISO 8601 atau locale time)")

class LogEntryResponse(BaseModel):
    id: str
    status: str

@router.post("/session/log", response_model=LogEntryResponse)
def log_session_entry(entry: LogEntryRequest):
    """
    Endpoint untuk menyimpan catatan riwayat percakapan sesi medis tunarungu.
    Di fase demo ini, log dicatat ke standard output (stdout) dan mensimulasikan penyimpanan sukses.
    """
    print(f"[SESSION_LOG] [{entry.timestamp}] {entry.role.upper()}: {entry.text} (Confidence: {entry.confidence})")
    
    # Generate mock ID
    entry_id = f"log_{int(time.time())}_{hash(entry.text) % 1000}"
    
    return LogEntryResponse(
        id=entry_id,
        status="ok"
    )
