from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
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

@router.get("/nlg/recommend", response_model=RecommendResponse)
def get_recommendations(word: str):
    """
    Memberikan rekomendasi kata berikutnya berdasarkan KBBI,
    afiksasi formal Bahasa Indonesia, dan konteks medis.
    """
    recs = nlg_service.recommend_next_words(word)
    return RecommendResponse(word=word, recommendations=recs)

class SimplifyRequest(BaseModel):
    text: str

class SimplifyResponse(BaseModel):
    original: str
    simplified: str

@router.post("/nlg/simplify-speech", response_model=SimplifyResponse)
def simplify_speech(request: SimplifyRequest):
    """
    Menyederhanakan transkrip suara dokter dengan menghapus kata-kata
    noise/filler (speech-to-text noise) dan memformalkan kalimat.
    """
    simplified = nlg_service.simplify_doctor_speech(request.text)
    return SimplifyResponse(original=request.text, simplified=simplified)

@router.post("/nlg/generate-sentence", response_model=SentenceResponse)
def generate_sentence(request: SentenceRequest):
    """
    Membangun kalimat formal Bahasa Indonesia dari kumpulan kata gesture
    berdasarkan konteks konsultasi medis tanpa menambah informasi baru.
    """
    if not request.words:
        return SentenceResponse(words=[], sentence="")
    sentence = nlg_service.generate_medical_sentence(request.words)
    return SentenceResponse(words=request.words, sentence=sentence)
