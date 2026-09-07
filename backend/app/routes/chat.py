import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
import os

from app.routes.auth import get_current_user

router = APIRouter()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qzodlgnlchvqkeupgpgv.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_h0nGgnUMrRUY7vzytzbcrA_Zy855hyt")

# File fallback storage
BACKEND_DIR = Path(__file__).resolve().parents[2]
CHAT_DIR = BACKEND_DIR / "data" / "chats"
CHAT_DIR.mkdir(parents=True, exist_ok=True)

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str
    role: str
    content: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MessageCreate(BaseModel):
    chat_id: str
    role: str
    content: str

class Chat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    doctor_id: str
    last_message: str = ""
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatCreate(BaseModel):
    patient_id: str
    doctor_id: str

_supabase = None
def _get_supabase():
    global _supabase
    if _supabase is not None:
        return _supabase
    try:
        from supabase import create_client
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        return _supabase
    except Exception:
        return None

def _chat_file(chat_id: str) -> Path:
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in chat_id)
    return CHAT_DIR / f"{safe}.json"

def _load_file_messages(chat_id: str) -> List[dict]:
    p = _chat_file(chat_id)
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []

def _save_file_message(chat_id: str, msg: dict):
    msgs = _load_file_messages(chat_id)
    msgs.append(msg)
    _chat_file(chat_id).write_text(json.dumps(msgs, ensure_ascii=False, indent=2), encoding="utf-8")
    # also update chat meta
    meta_path = CHAT_DIR / f"{chat_id}_meta.json"
    # we store last_message there if needed
    try:
        meta = {}
        if meta_path.exists():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        meta["last_message"] = msg["content"][:80]
        meta["updated_at"] = msg["created_at"]
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

def _try_supabase_history(chat_id: str):
    sb = _get_supabase()
    if not sb:
        return None
    try:
        res = sb.table("chats").select("id").eq("id", chat_id).execute()
        # if chat not found, treat as empty (don't 404)
        if not res.data:
            return []
        msg_res = sb.table("messages").select("*").eq("chat_id", chat_id).order("created_at", desc=False).execute()
        return msg_res.data if msg_res.data else []
    except Exception:
        return None

def _try_supabase_insert(msg_data: dict):
    sb = _get_supabase()
    if not sb:
        return None
    try:
        # ensure chat exists: if not, skip validation and just insert (some RLS may block)
        ins = sb.table("messages").insert(msg_data).execute()
        if ins.data:
            try:
                sb.table("chats").update({"last_message": msg_data["content"][:80], "updated_at": msg_data["created_at"]}).eq("id", msg_data["chat_id"]).execute()
            except Exception:
                pass
            return ins.data[0]
        return None
    except Exception:
        return None

@router.post("/chat/message")
def send_message(message: MessageCreate, current_user: dict = Depends(get_current_user)):
    msg = {
        "id": str(uuid.uuid4()),
        "chat_id": message.chat_id,
        "role": message.role,
        "content": message.content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    # try supabase first
    sb_result = _try_supabase_insert(msg)
    if sb_result is not None:
        return sb_result
    # fallback file
    _save_file_message(message.chat_id, msg)
    return msg

@router.get("/chat/history/{chat_id}")
def get_chat_history(chat_id: str, current_user: dict = Depends(get_current_user)):
    # try supabase
    sb_data = _try_supabase_history(chat_id)
    if sb_data is not None:
        return sb_data
    # fallback file
    return _load_file_messages(chat_id)

@router.post("/chat/create")
def create_chat(chat_data: ChatCreate, current_user: dict = Depends(get_current_user)):
    new_id = str(uuid.uuid4())
    chat = {
        "id": new_id,
        "patient_id": chat_data.patient_id,
        "doctor_id": chat_data.doctor_id,
        "last_message": "",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    sb = _get_supabase()
    if sb:
        try:
            res = sb.table("chats").insert(chat).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass
    # fallback: create empty file for chat
    _chat_file(new_id).write_text("[]", encoding="utf-8")
    (CHAT_DIR / f"{new_id}_meta.json").write_text(json.dumps(chat, ensure_ascii=False, indent=2), encoding="utf-8")
    # also map patientId -> chatId for quick lookup (so GET /chat/patient can fallback)
    return chat

@router.get("/chat/patient/{patient_id}")
def get_patient_chats(patient_id: str, current_user: dict = Depends(get_current_user)):
    sb = _get_supabase()
    if sb:
        try:
            res = sb.table("chats").select("*").eq("patient_id", patient_id).order("updated_at", desc=True).execute()
            if res.data is not None:
                return res.data
        except Exception:
            pass
    # file fallback: scan meta files
    chats = []
    for p in CHAT_DIR.glob("*_meta.json"):
        try:
            j = json.loads(p.read_text(encoding="utf-8"))
            if j.get("patient_id") == patient_id:
                chats.append(j)
        except Exception:
            continue
    chats.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return chats

@router.get("/chat/doctor/{doctor_id}")
def get_doctor_chats(doctor_id: str, current_user: dict = Depends(get_current_user)):
    sb = _get_supabase()
    if sb:
        try:
            res = sb.table("chats").select("*").eq("doctor_id", doctor_id).order("updated_at", desc=True).execute()
            if res.data is not None:
                return res.data
        except Exception:
            pass
    chats = []
    for p in CHAT_DIR.glob("*_meta.json"):
        try:
            j = json.loads(p.read_text(encoding="utf-8"))
            if j.get("doctor_id") == doctor_id:
                chats.append(j)
        except Exception:
            continue
    chats.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return chats


class ChatTitleUpdate(BaseModel):
    title: str

@router.put("/chat/{chat_id}/title")
def update_chat_title(chat_id: str, req: ChatTitleUpdate, current_user: dict = Depends(get_current_user)):
    sb = _get_supabase()
    if sb:
        try:
            sb.table("chats").update({"last_message": req.title}).eq("id", chat_id).execute()
        except Exception:
            pass
    # update in file fallback
    meta_path = CHAT_DIR / f"{chat_id}_meta.json"
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            meta["last_message"] = req.title
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass
    # also update sessions table in SQLite if matching session_id
    from app.db import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE sessions SET summary = ? WHERE id = ?", (req.title, chat_id))
        conn.commit()
        conn.close()
    except Exception:
        pass
    return {"message": "Judul percakapan berhasil diperbarui", "title": req.title}

from app.routes.auth import get_current_user_optional
from typing import Optional

@router.delete("/chat/{chat_id}")
def delete_chat(chat_id: str, current_user: Optional[dict] = Depends(get_current_user_optional)):
    sb = _get_supabase()
    if sb:
        try:
            sb.table("messages").delete().eq("chat_id", chat_id).execute()
            sb.table("chats").delete().eq("id", chat_id).execute()
        except Exception:
            pass
    # delete local files
    f_msg = _chat_file(chat_id)
    if f_msg.exists():
        try:
            f_msg.unlink()
        except Exception:
            pass
    f_meta = CHAT_DIR / f"{chat_id}_meta.json"
    if f_meta.exists():
        try:
            f_meta.unlink()
        except Exception:
            pass
    # also delete from sessions & session_logs if exists
    from app.db import db_delete_session
    try:
        db_delete_session(chat_id)
    except Exception:
        pass
    return {"message": "Riwayat chat berhasil dihapus"}
