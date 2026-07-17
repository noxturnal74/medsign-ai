import json
from pathlib import Path
from fastapi import HTTPException
from pydantic import Field
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
from app.ml.labels import load_label_items

router = APIRouter()

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
    """Mengambil kosakata MVP dari labels.json agar sinkron dengan model clinical."""
    vocabulary = [
        {
            "id": int(item["id"]) + 1,
            "word": item["slug"],
            "category": item.get("category", "clinical"),
            "emergency": bool(item.get("emergency", False)),
        }
        for item in load_label_items()
    ]
    return VocabularyResponse(
        total=len(vocabulary),
        words=vocabulary
    )


class AddVocabularyRequest(BaseModel):
    word: str = Field(..., description="Kata/slug baru")
    category: str = Field(..., description="Kategori kata")
    emergency: bool = Field(default=False)

@router.post("/vocabulary")
def add_vocabulary(request: AddVocabularyRequest):
    word_clean = request.word.strip().lower()
    if not word_clean:
        raise HTTPException(status_code=400, detail="Kata tidak boleh kosong")
        
    # Read labels.json
    backend_dir = Path(__file__).resolve().parents[2]
    labels_path = backend_dir / "data" / "metadata" / "labels.json"
    
    if not labels_path.exists():
        raise HTTPException(status_code=500, detail="labels.json tidak ditemukan")
        
    try:
        with labels_path.open("r", encoding="utf-8") as f:
            config = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membaca labels.json: {str(e)}")
        
    labels = config.get("labels", [])
    
    # Check if exists
    for item in labels:
        if item["slug"] == word_clean:
            raise HTTPException(status_code=400, detail=f"Kata '{word_clean}' sudah terdaftar")
            
    # Add new label
    new_id = len(labels)
    # Convert category name to slug if it's not already
    category_slug = request.category.strip().lower().replace(" & ", "_").replace(" / ", "_").replace(" ", "_")
    
    new_item = {
        "id": new_id,
        "slug": word_clean,
        "display": request.word.strip().capitalize(),
        "category": category_slug,
        "emergency": request.emergency
    }
    
    labels.append(new_item)
    config["labels"] = labels
    
    try:
        with labels_path.open("w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menulis ke labels.json: {str(e)}")
        
    return {
        "status": "success",
        "message": f"Kata '{word_clean}' berhasil ditambahkan ke vocabulary",
        "item": {
            "id": new_id + 1,
            "word": word_clean,
            "category": request.category,
            "emergency": request.emergency
        }
    }
