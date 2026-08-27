import json
import re
from pathlib import Path
from fastapi import HTTPException
from pydantic import Field
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.ml.labels import load_label_items

router = APIRouter()

def _read_labels():
    backend_dir = Path(__file__).resolve().parents[2]
    labels_path = backend_dir / "data" / "metadata" / "labels.json"
    if not labels_path.exists():
        raise HTTPException(status_code=500, detail="labels.json tidak ditemukan")
    with labels_path.open("r", encoding="utf-8") as f:
        return json.load(f), labels_path

def _write_labels(config, labels_path):
    with labels_path.open("w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

class VocabularyItem(BaseModel):
    id: int
    word: str
    display: str
    category: str
    emergency: bool
    folder_path: Optional[str] = None

class VocabularyResponse(BaseModel):
    total: int
    words: List[VocabularyItem]

@router.get("/vocabulary", response_model=VocabularyResponse)
def get_vocabulary():
    vocabulary = [
        {
            "id": int(item["id"]) + 1,
            "word": item["slug"],
            "display": item.get("display", item["slug"].replace("_", " ").replace("-", " ").title()),
            "category": item.get("category", "clinical"),
            "emergency": bool(item.get("emergency", False)),
            "folder_path": item.get("folder_path", ""),
        }
        for item in load_label_items()
    ]
    return VocabularyResponse(total=len(vocabulary), words=vocabulary)


class AddVocabularyRequest(BaseModel):
    word: str = Field(..., description="Kata/slug baru")
    display: Optional[str] = Field(default=None, description="Nama tampilan")
    category: str = Field(..., description="Kategori kata")
    emergency: bool = Field(default=False)
    folder_path: Optional[str] = Field(default="", description="Path folder dataset")

@router.post("/vocabulary")
def add_vocabulary(request: AddVocabularyRequest):
    word_clean = request.word.strip().lower()
    if not word_clean:
        raise HTTPException(status_code=400, detail="Kata tidak boleh kosong")
    if not re.match(r"^[a-z0-9_-]+$", word_clean):
        raise HTTPException(status_code=400, detail="Kata hanya boleh berisi karakter alfanumerik, hyphen, atau underscore")

    config, labels_path = _read_labels()
    labels = config.get("labels", [])

    for item in labels:
        if item["slug"] == word_clean:
            raise HTTPException(status_code=400, detail=f"Kata '{word_clean}' sudah terdaftar")

    new_id = len(labels)
    category_slug = request.category.strip().lower().replace(" & ", "_").replace(" / ", "_").replace(" ", "_")
    display_name = request.display.strip() if request.display else word_clean.replace("_", " ").replace("-", " ").title()

    new_item = {
        "id": new_id,
        "slug": word_clean,
        "display": display_name,
        "category": category_slug,
        "emergency": request.emergency,
        "folder_path": request.folder_path or "",
    }

    labels.append(new_item)
    config["labels"] = labels
    _write_labels(config, labels_path)

    return {
        "status": "success",
        "message": f"Kata '{word_clean}' berhasil ditambahkan",
        "item": {"id": new_id + 1, "word": word_clean, "display": display_name, "category": category_slug, "emergency": request.emergency, "folder_path": request.folder_path or ""}
    }


class EditVocabularyRequest(BaseModel):
    display: Optional[str] = None
    category: Optional[str] = None
    emergency: Optional[bool] = None
    folder_path: Optional[str] = None

@router.put("/vocabulary/{word_slug}")
def edit_vocabulary(word_slug: str, request: EditVocabularyRequest):
    config, labels_path = _read_labels()
    labels = config.get("labels", [])

    target = None
    for item in labels:
        if item["slug"] == word_slug:
            target = item
            break

    if not target:
        raise HTTPException(status_code=404, detail=f"Kata '{word_slug}' tidak ditemukan")

    if request.display is not None:
        target["display"] = request.display.strip()
    if request.category is not None:
        target["category"] = request.category.strip().lower().replace(" & ", "_").replace(" / ", "_").replace(" ", "_")
    if request.emergency is not None:
        target["emergency"] = request.emergency
    if request.folder_path is not None:
        target["folder_path"] = request.folder_path

    _write_labels(config, labels_path)

    return {
        "status": "success",
        "message": f"Kata '{word_slug}' berhasil diperbarui",
        "item": {
            "id": target["id"] + 1,
            "word": target["slug"],
            "display": target.get("display", ""),
            "category": target.get("category", ""),
            "emergency": target.get("emergency", False),
            "folder_path": target.get("folder_path", ""),
        }
    }


@router.delete("/vocabulary/{word_slug}")
def delete_vocabulary(word_slug: str):
    config, labels_path = _read_labels()
    labels = config.get("labels", [])

    new_labels = [item for item in labels if item["slug"] != word_slug]
    if len(new_labels) == len(labels):
        raise HTTPException(status_code=404, detail=f"Kata '{word_slug}' tidak ditemukan")

    config["labels"] = new_labels
    _write_labels(config, labels_path)

    return {"status": "success", "message": f"Kata '{word_slug}' berhasil dihapus"}
