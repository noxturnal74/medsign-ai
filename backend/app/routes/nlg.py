from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.nlg_service import NLGService

router = APIRouter()
nlg_service = NLGService()


class RecommendResponse(BaseModel):
    word: str
    recommendations: List[str]


class SentenceRequest(BaseModel):
    words: List[str] = Field(..., description="Kumpulan kata gesture yang dideteksi")


class SentenceResponse(BaseModel):
    words: List[str]
    sentence: str


class SimplifyRequest(BaseModel):
    text: str


class SimplifyResponse(BaseModel):
    original: str
    simplified: str


class LogItemRequest(BaseModel):
    role: str
    text: str
    timestamp: str = ""


class SummarizeRequest(BaseModel):
    logs: List[LogItemRequest]


class SummarizeResponse(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str
    full_text: str
    llm_used: bool


class RefineRequest(BaseModel):
    text: str = Field(..., description="Input teks/fragmen kata pasien yang ingin diperbaiki")


class RefineResponse(BaseModel):
    original: str
    refined_sentence: str
    confidence: str
    follow_up: List[str]
    llm_used: bool


@router.get("/nlg/recommend", response_model=RecommendResponse)
def get_recommendations(word: str):
    recs = nlg_service.recommend_next_words(word)
    return RecommendResponse(word=word, recommendations=recs)


@router.post("/nlg/simplify-speech", response_model=SimplifyResponse)
def simplify_speech(request: SimplifyRequest):
    simplified = nlg_service.simplify_doctor_speech(request.text)
    return SimplifyResponse(original=request.text, simplified=simplified)


@router.post("/nlg/generate-sentence", response_model=SentenceResponse)
def generate_sentence(request: SentenceRequest):
    if not request.words:
        return SentenceResponse(words=[], sentence="")
    sentence = nlg_service.generate_medical_sentence(request.words)
    return SentenceResponse(words=request.words, sentence=sentence)


@router.post("/nlg/refine-sentence", response_model=RefineResponse)
async def refine_sentence(request: RefineRequest):
    """
    AI Sentence Refinement: ubah fragmen kata pasien menjadi kalimat lengkap
    tanpa menambah informasi medis yang tidak disebutkan pasien.
    GPT-4o-mini jika OPENAI_API_KEY tersedia, fallback ke template engine.
    """
    if not request.text.strip():
        raise HTTPException(status_code=422, detail="Teks tidak boleh kosong.")
    result = await nlg_service.refine_sentence(request.text)
    return RefineResponse(
        original=request.text,
        refined_sentence=result["refined_sentence"],
        confidence=result["confidence"],
        follow_up=result["follow_up"],
        llm_used=result["llm_used"],
    )


@router.post("/nlg/summarize", response_model=SummarizeResponse)
async def summarize_consultation(request: SummarizeRequest):
    """
    AI Notetaker: rangkum percakapan dokter-pasien ke SOAP Note.
    GPT-4o-mini jika tersedia, fallback ke keyword extraction.
    """
    logs_dicts = [{"role": l.role, "text": l.text, "timestamp": l.timestamp} for l in request.logs]
    result = await nlg_service.summarize_session(logs_dicts)
    return SummarizeResponse(**result)
