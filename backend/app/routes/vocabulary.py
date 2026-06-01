from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()

# Vocabulary list from requirements
VOCABULARY = [
  { "id": 1, "word": "sakit", "category": "Keluhan", "emergency": False },
  { "id": 2, "word": "nyeri", "category": "Keluhan", "emergency": False },
  { "id": 3, "word": "sesak", "category": "Keluhan", "emergency": True },
  { "id": 4, "word": "batuk", "category": "Keluhan", "emergency": False },
  { "id": 5, "word": "demam", "category": "Keluhan", "emergency": False },
  { "id": 6, "word": "pusing", "category": "Keluhan", "emergency": False },
  { "id": 7, "word": "mual", "category": "Keluhan", "emergency": False },
  { "id": 8, "word": "muntah", "category": "Keluhan", "emergency": False },
  { "id": 9, "word": "diare", "category": "Keluhan", "emergency": False },
  { "id": 10, "word": "lemas", "category": "Keluhan", "emergency": False },

  { "id": 11, "word": "kepala", "category": "Lokasi Tubuh", "emergency": False },
  { "id": 12, "word": "dada", "category": "Lokasi Tubuh", "emergency": True },
  { "id": 13, "word": "perut", "category": "Lokasi Tubuh", "emergency": False },
  { "id": 14, "word": "tenggorokan", "category": "Lokasi Tubuh", "emergency": False },
  { "id": 15, "word": "tangan", "category": "Lokasi Tubuh", "emergency": False },
  { "id": 16, "word": "kaki", "category": "Lokasi Tubuh", "emergency": False },
  { "id": 17, "word": "punggung", "category": "Lokasi Tubuh", "emergency": False },
  { "id": 18, "word": "mata", "category": "Lokasi Tubuh", "emergency": False },
  { "id": 19, "word": "telinga", "category": "Lokasi Tubuh", "emergency": False },
  { "id": 20, "word": "leher", "category": "Lokasi Tubuh", "emergency": False },

  { "id": 21, "word": "ya", "category": "Respons", "emergency": False },
  { "id": 22, "word": "tidak", "category": "Respons", "emergency": False },
  { "id": 23, "word": "sakit sekali", "category": "Respons", "emergency": True },
  { "id": 24, "word": "lebih baik", "category": "Respons", "emergency": False },
  { "id": 25, "word": "lebih buruk", "category": "Respons", "emergency": True },

  { "id": 26, "word": "tolong", "category": "Darurat", "emergency": True },
  { "id": 27, "word": "tidak bisa bernapas", "category": "Darurat", "emergency": True },
  { "id": 28, "word": "nyeri dada", "category": "Darurat", "emergency": True },
  { "id": 29, "word": "pingsan", "category": "Darurat", "emergency": True },
  { "id": 30, "word": "bantuan segera", "category": "Darurat", "emergency": True },

  { "id": 31, "word": "buka mulut", "category": "Instruksi Dokter", "emergency": False },
  { "id": 32, "word": "tarik napas", "category": "Instruksi Dokter", "emergency": False },
  { "id": 33, "word": "tahan napas", "category": "Instruksi Dokter", "emergency": False },
  { "id": 34, "word": "duduk", "category": "Instruksi Dokter", "emergency": False },
  { "id": 35, "word": "berdiri", "category": "Instruksi Dokter", "emergency": False }
]

class VocabularyItem(BaseModel):
    id: int
    word: str
    category: str
    emergency: bool

class VocabularyResponse(BaseModel):
    total: int
    words: List[VocabularyItem]

@router.get("/vocabulary", response_model=VocabularyResponse)
def get_vocabulary():
    """Mengambil daftar 35 kosakata medis BISINDO untuk inisialisasi frontend."""
    return VocabularyResponse(
        total=len(VOCABULARY),
        words=VOCABULARY
    )
