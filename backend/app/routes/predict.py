from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.services.slt_adapter import SLTAdapterService

router = APIRouter()

# Dependency provider for SLTAdapterService
def get_slt_service() -> SLTAdapterService:
    return SLTAdapterService()

class LandmarkFrame(BaseModel):
    values: List[float] = Field(..., description="Array dari 63 koordinat float32 (21 landmark x 3)")

class PredictRequest(BaseModel):
    frames: List[LandmarkFrame] = Field(..., description="Sequence berisi 30 frame data landmark")

class TopAlternative(BaseModel):
    word: str
    confidence: float

class PredictionResult(BaseModel):
    prediction: Optional[str]
    confidence: float
    top3: List[TopAlternative]
    mode: str
    processing_time_ms: int

@router.post("/predict", response_model=PredictionResult)
def predict_gesture(request: PredictRequest, service: SLTAdapterService = Depends(get_slt_service)):
    """
    Endpoint untuk menerima sequence 30 frame koordinat landmark tangan
    dan mengembalikan hasil prediksi isyarat BISINDO klinis.
    Terintegrasi dengan adaptasi pustaka sign-language-translator.
    """
    # 1. Validasi frame count
    if len(request.frames) != 30:
        raise HTTPException(
            status_code=422,
            detail=f"Jumlah frame tidak valid. Harap kirimkan tepat 30 frame, diterima: {len(request.frames)}"
        )
        
    # 2. Validasi landmark size per frame
    for idx, frame in enumerate(request.frames):
        if len(frame.values) != 63:
            raise HTTPException(
                status_code=422,
                detail=f"Jumlah koordinat pada frame index {idx} tidak valid. Harap kirimkan tepat 63 nilai (21 landmark x 3), diterima: {len(frame.values)}"
            )

    # 3. Ekstrak data mentah koordinat
    raw_frames = [frame.values for frame in request.frames]

    # 4. Inferensi melalui SLTAdapterService
    result = service.predict_bisindo(raw_frames)
    
    # 5. Threshold Keyakinan (SRS: Jika confidence < 0.65 -> return null / tidak tampil)
    prediction_word = result["prediction"]
    if result["confidence"] < 0.65:
        prediction_word = None

    return PredictionResult(
        prediction=prediction_word,
        confidence=result["confidence"],
        top3=[
            TopAlternative(word=alt["word"], confidence=alt["confidence"])
            for alt in result["top3"]
        ],
        mode=result["mode"],
        processing_time_ms=result["processing_time_ms"]
    )
