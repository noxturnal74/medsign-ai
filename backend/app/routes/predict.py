from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time
import random

router = APIRouter()

# Vocabulary list to select prediction from
PREDICTION_WORDS = [
    "sakit", "nyeri", "sesak", "batuk", "demam", "pusing", "mual", "muntah", "diare", "lemas",
    "kepala", "dada", "perut", "tenggorokan", "tangan", "kaki", "punggung", "mata", "telinga", "leher",
    "ya", "tidak", "sakit sekali", "lebih baik", "lebih buruk",
    "tolong", "tidak bisa bernapas", "nyeri dada", "pingsan", "bantuan segera"
]

class LandmarkFrame(BaseModel):
    values: List[float] = Field(..., description="Array dari 63 koordinat float32 hasil normalisasi (21 landmark x 3)")

class PredictRequest(BaseModel):
    frames: List[LandmarkFrame] = Field(..., description="Sequence berisi 30 frame data landmark")

class TopAlternative(BaseModel):
    word: str
    confidence: float

class PredictionResult(BaseModel):
    prediction: str
    confidence: float
    top3: List[TopAlternative]
    mode: str = "demo"
    processing_time_ms: int

@router.post("/predict", response_model=PredictionResult)
def predict_gesture(request: PredictRequest):
    """
    Endpoint untuk menerima sequence 30 frame koordinat landmark tangan
    dan mengembalikan hasil prediksi isyarat BISINDO klinis.
    """
    start_time = time.perf_counter()
    
    # Validasi frame count
    if len(request.frames) != 30:
        raise HTTPException(
            status_code=422,
            detail=f"Jumlah frame tidak valid. Harap kirimkan tepat 30 frame, diterima: {len(request.frames)}"
        )
        
    # Validasi landmark size per frame
    for idx, frame in enumerate(request.frames):
        if len(frame.values) != 63:
            raise HTTPException(
                status_code=422,
                detail=f"Jumlah koordinat pada frame index {idx} tidak valid. Harap kirimkan tepat 63 nilai (21 landmark x 3), diterima: {len(frame.values)}"
            )

    # Pilih kata prediksi secara acak dari database kosakata sebagai demo
    main_pred = random.choice(PREDICTION_WORDS)
    confidence = round(random.uniform(0.72, 0.98), 2)
    
    # Pilih 2 kata alternatif
    alt_pool = [w for w in PREDICTION_WORDS if w != main_pred]
    alt1 = random.choice(alt_pool)
    alt2 = random.choice([w for w in alt_pool if w != alt1])
    
    end_time = time.perf_counter()
    processing_ms = int((end_time - start_time) * 1000) + 15 # Tambah basis overhead inferensi

    return PredictionResult(
        prediction=main_pred,
        confidence=confidence,
        top3=[
            TopAlternative(word=main_pred, confidence=confidence),
            TopAlternative(word=alt1, confidence=round(confidence * 0.75, 2)),
            TopAlternative(word=alt2, confidence=round(confidence * 0.55, 2))
        ],
        mode="demo",
        processing_time_ms=processing_ms
    )
