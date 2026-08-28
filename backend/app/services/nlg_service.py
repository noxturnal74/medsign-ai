# -*- coding: utf-8 -*-
from __future__ import annotations
import re
import os
import json
import requests

_SYSTEM_PROMPT = (
    "Anda adalah AI asisten penerjemah medis bahasa isyarat BISINDO. "
    "Tugas Anda adalah merapikan kata-kata acak/fragmen kata dari pasien menjadi satu kalimat "
    "bahasa Indonesia yang wajar, santun, dan gramatikal. "
    "Hanya gunakan informasi dari kata-kata yang diberikan. "
    "Jangan menambah diagnosis, obat, atau informasi medis lain. "
    "Output harus berupa JSON dengan key: refined_sentence, confidence (high/medium/low), "
    "dan follow_up (daftar 1-3 pertanyaan klinis lanjutan jika kalimat kurang jelas)."
)

class NLGService:
    def __init__(self):
        self._client = None
        self._model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key and openai_key != "sk-your-key-here":
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=openai_key)
            except Exception as e:
                print(f"[NLG] Gagal inisialisasi OpenAI client: {e}")
        self.recommendations = {
            "sakit": [
                "sakit kepala", "sakit perut", "sakit dada", "sakit sejak kapan", "sakit saat bergerak",
                "terasa sakit", "sakit sekali"
            ],
            "obat": [
                "obat ini", "harga obat", "resep obat", "minum obat", "efek samping obat"
            ],
            "periksa": [
                "periksa dokter", "pemeriksaan fisik", "diperiksa", "ruang periksa"
            ],
            "sembuh": [
                "sembuh total", "menyembuhkan", "kesembuhan", "segera sembuh"
            ],
            "resep": [
                "resep dokter", "menebus resep", "tulis resep"
            ],
            "alergi": [
                "alergi obat", "alergi makanan", "reaksi alergi", "mengalami alergi"
            ],
            "demam": [
                "demam tinggi", "mengalami demam", "demam sejak kemarin"
            ],
            "sesak": [
                "sesak napas", "sesak dada", "terasa sesak", "mengalami sesak"
            ],
            "napas": [
                "sesak napas", "tarik napas", "bernapas", "pernapasan"
            ],
            "dada": [
                "nyeri dada", "sakit dada", "bagian dada", "sesak dada"
            ],
            "tenggorokan": [
                "sakit tenggorokan", "tenggorokan kering", "gatal tenggorokan"
            ],
            "pusing": [
                "pusing kepala", "terasa pusing", "pusing sekali"
            ],
            "tensi": [
                "tensi darah", "ukur tensi", "tensi tinggi", "tensi rendah"
            ],
            "darah": [
                "tekanan darah", "darah tinggi", "darah rendah", "pendarahan"
            ],
            "makan": [
                "makan pagi", "makan siang", "makan malam", "sebelum makan", "sesudah makan"
            ],
            "minum": [
                "minum obat", "minum air", "cara minum"
            ],
            "hamil": [
                "ibu hamil", "kehamilan", "hamil muda"
            ],
            "boleh": [
                "apakah boleh", "boleh minum", "boleh makan"
            ],
            "berapa": [
                "berapa hari", "berapa kali", "berapa banyak", "harga berapa"
            ],
            "kapan": [
                "sejak kapan", "mulai kapan"
            ],
            "diare": [
                "mengalami diare", "diare cair", "diare anak"
            ],
            "mual": [
                "merasa mual", "mual muntah", "mual pagi"
            ],
            "muntah": [
                "mual muntah", "muntah cairan", "muntah darah"
            ],
            "lemas": [
                "badan lemas", "terasa lemas", "lemas sekali"
            ],
            "gatal": [
                "gatal kulit", "terasa gatal", "gatal alergi"
            ],
            "nyeri": [
                "nyeri dada", "nyeri perut", "nyeri sendi", "terasa nyeri"
            ],
            "bpjs": [
                "kartu bpjs", "bpjs kesehatan", "bisa bpjs"
            ],
            "rujukan": [
                "surat rujukan", "rujukan puskesmas", "minta rujukan"
            ]
        }
        
        self.sentence_templates = [
            {
                "keys": {"hamil", "obat", "aman"},
                "template": "Apakah obat ini aman dikonsumsi selama kehamilan?"
            },
            {
                "keys": {"hamil", "boleh", "obat"},
                "template": "Apakah obat ini aman untuk ibu hamil?"
            },
            {
                "keys": {"berapa", "obat", "ini"},
                "template": "Berapa harga obat ini?"
            },
            {
                "keys": {"demam", "dua", "hari"},
                "template": "Saya sudah mengalami demam selama dua hari."
            },
            {
                "keys": {"sakit", "dua", "hari"},
                "template": "Saya merasakan sakit ini selama dua hari."
            },
            {
                "keys": {"sesak", "dua", "hari"},
                "template": "Saya merasa sesak napas selama dua hari."
            },
            {
                "keys": {"muntah", "dua", "hari"},
                "template": "Saya sudah muntah-muntah selama dua hari."
            },
            {
                "keys": {"diare", "dua", "hari"},
                "template": "Saya mengalami diare selama dua hari."
            },
            {
                "keys": {"kepala", "sakit"},
                "template": "Saya mengalami sakit kepala."
            },
            {
                "keys": {"dada", "sakit"},
                "template": "Saya merasakan sakit pada bagian dada."
            },
            {
                "keys": {"perut", "sakit"},
                "template": "Saya mengalami sakit perut."
            },
            {
                "keys": {"sesak", "napas"},
                "template": "Saya mengalami sesak napas."
            },
            {
                "keys": {"alergi", "obat"},
                "template": "Saya memiliki alergi terhadap obat."
            },
            {
                "keys": {"nyeri", "dada"},
                "template": "Saya mengalami nyeri dada."
            },
            {
                "keys": {"tensi", "tinggi"},
                "template": "Tekanan darah saya tinggi."
            },
            {
                "keys": {"mual", "muntah"},
                "template": "Saya merasa mual dan muntah."
            },
            {
                "keys": {"gatal", "kulit"},
                "template": "Kulit saya terasa gatal."
            },
            {
                "keys": {"surat", "rujukan"},
                "template": "Saya membawa surat rujukan."
            },
            {
                "keys": {"resep", "obat"},
                "template": "Saya ingin menebus resep obat."
            },
            {
                "keys": {"alergi", "makanan"},
                "template": "Saya memiliki alergi terhadap makanan."
            },
            {
                "keys": {"tidak", "bisa"},
                "template": "Saya tidak bisa melakukannya."
            },
            {
                "keys": {"bantuan", "segera"},
                "template": "Saya membutuhkan bantuan segera."
            },
            {
                "keys": {"sakit", "sekali"},
                "template": "Rasa sakit yang saya rasakan sangat parah."
            },
            {
                "keys": {"lebih", "baik"},
                "template": "Keadaan saya terasa lebih baik."
            },
            {
                "keys": {"lebih", "buruk"},
                "template": "Keadaan saya terasa lebih buruk."
            }
        ]

    def simplify_doctor_speech(self, raw_text: str) -> str:
        text = raw_text.strip().lower()
        if not text:
            return ""
        
        # Remove common Indonesian filler words and speech-to-text noise
        fillers = [
            r"\bah\b", r"\beh\b", r"\buh\b", r"\boh\b", r"\bum\b", r"\bhm+\b", r"\bee+\b",
            r"\banu\b", r"\bapaan\b", r"\bsih\b", r"\bdong\b", r"\bdeh\b", r"\bya\b",
            r"\bkan\b", r"\blah\b", r"\bkok\b", r"\bgitu\b", r"\bkayak\b", r"\bkayaknya\b",
            r"\baduh\b", r"\bwaduh\b", r"\bapa namanya\b", r"\bdan lain-lain\b", r"\bdll\b"
        ]
        for pattern in fillers:
            text = re.sub(pattern, "", text)
            
        # Standardize informal words to medical-formal Indonesian
        replacements = {
            "ga": "tidak",
            "gak": "tidak",
            "ndak": "tidak",
            "udah": "sudah",
            "aja": "saja",
            "kalo": "kalau",
            "gimana": "bagaimana",
            "capek": "lelah",
            "ilang": "hilang",
            "nyeri sekali": "sakit sekali"
        }
        for k, v in replacements.items():
            text = re.sub(r"\b" + k + r"\b", v, text)
            
        # Deduplicate consecutive identical words
        words = text.split()
        unique_words = []
        for w in words:
            if not unique_words or unique_words[-1] != w:
                unique_words.append(w)
        
        text = " ".join(unique_words)
        
        # Capitalize and add proper punctuation
        if text:
            text = text.capitalize()
            if not text.endswith((".", "?", "!")):
                text += "."
        return text

    def recommend_next_words(self, word: str) -> list[str]:
        word_clean = word.strip().lower()
        if word_clean in self.recommendations:
            return self.recommendations[word_clean]
        return [
            f"meng-{word_clean}", f"di-{word_clean}", f"ber-{word_clean}", 
            f"ter-{word_clean}", f"pen-{word_clean}", f"ke-{word_clean}-an"
        ]

    def generate_medical_sentence(self, words: list[str]) -> str:
        cleaned_words = [w.strip().replace('_', ' ') for w in words if w.strip()]
        if not cleaned_words:
            return ""
        
        word_set = set(cleaned_words)
        
        for t in self.sentence_templates:
            if t["keys"].issubset(word_set):
                return t["template"]
        
        pronouns = [w for w in cleaned_words if w in {"saya", "anda", "dia", "mereka", "kita", "kami"}]
        symptoms = [w for w in cleaned_words if w in {
            "sakit", "demam", "batuk", "flu", "pilek", "pusing", "mual", "muntah", "diare", 
            "lemas", "gatal", "nyeri", "sesak", "alergi", "nyeri dada", "asma"
        }]
        body_parts = [w for w in cleaned_words if w in {
            "kepala", "dada", "perut", "tenggorokan", "tangan", "kaki", "punggung", "mata", 
            "telinga", "leher", "pinggang", "gigi", "kulit"
        }]
        questions = [w for w in cleaned_words if w in {"berapa", "kapan", "apakah", "boleh", "bagaimana", "mana"}]
        actions = [w for w in cleaned_words if w in {"minum", "makan", "periksa", "resep", "tensi", "bpjs", "rujukan", "bantuan"}]
        time_durations = [w for w in cleaned_words if w in {"hari", "minggu", "bulan", "kemarin", "pagi", "siang", "malam"}]
        numbers = [w for w in cleaned_words if w in {"satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"}]
        
        subj = "Saya"
        if pronouns:
            subj = pronouns[0].capitalize()
            
        duration_str = ""
        if time_durations:
            num_str = ""
            if numbers:
                num_str = numbers[0] + " "
            duration_str = f" selama {num_str}{time_durations[0]}"
            if time_durations[0] in {"kemarin", "pagi", "siang", "malam"}:
                duration_str = f" sejak {time_durations[0]}"

        action_str = ""
        if actions:
            act = actions[0]
            if act == "minum":
                action_str = "perlu meminum"
            elif act == "makan":
                action_str = "sebelum/sesudah makan"
            elif act == "periksa":
                action_str = "ingin memeriksakan diri"
            elif act == "resep":
                action_str = "ingin menebus resep"
            elif act == "tensi":
                action_str = "ingin mengukur tensi darah"
            else:
                action_str = f"melakukan {act}"

        if symptoms:
            sym = symptoms[0]
            bp_str = f" di bagian {body_parts[0]}" if body_parts else ""
            
            if questions:
                q = questions[0]
                if q == "berapa":
                    return f"Sudah berapa lama Anda mengalami {sym}{bp_str}?"
                elif q == "kapan":
                    return f"Sejak kapan Anda merasakan {sym}{bp_str}?"
                elif q == "apakah" or q == "boleh":
                    return f"Apakah wajar jika saya mengalami {sym}{bp_str}?"
            
            if action_str:
                return f"{subj} {action_str} karena mengalami {sym}{bp_str}{duration_str}."
            
            return f"{subj} mengalami {sym}{bp_str}{duration_str}."
            
        if actions:
            act = actions[0]
            if questions:
                q = questions[0]
                if q == "berapa":
                    return f"Berapa kali saya harus {act} ini?"
                elif q == "boleh" or q == "apakah":
                    return f"Apakah saya boleh {act} ini?"
            return f"{subj} {action_str or act}{duration_str}."
            
        if questions:
            q = questions[0]
            words_joined = " ".join(cleaned_words)
            return f"Mohon maaf dokter, bagaimana dengan {words_joined}?"
            
        words_formal = [w.capitalize() for w in cleaned_words]
        return " ".join(words_formal) + "."


    
    async def _call_llm(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str | None:
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key and gemini_key != "your-gemini-key-here":
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_key}"
                headers = {"Content-Type": "application/json"}
                payload = {
                    "systemInstruction": {
                        "parts": [{"text": system_prompt}]
                    },
                    "contents": [{
                        "parts": [{"text": user_prompt}]
                    }],
                    "generationConfig": {}
                }
                if json_mode:
                    payload["generationConfig"]["responseMimeType"] = "application/json"
                    
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return text
                else:
                    print(f"[NLG] Gemini API error: {res.status_code} - {res.text}")
            except Exception as e:
                print(f"[NLG] Gemini request failed: {e}")
                
        if self._client:
            try:
                response = self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={"type": "json_object"} if json_mode else None,
                    temperature=0.3,
                    max_tokens=500,
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"[NLG] OpenAI request failed: {e}")
                
        return None

    async def refine_sentence(self, text: str) -> dict:
        """
        Refine fragmented patient input into a complete, natural sentence.
        Returns: {refined_sentence, confidence, follow_up, llm_used}
        Falls back to template engine if OpenAI unavailable.
        """
        text = text.strip()
        if not text:
            return {"refined_sentence": "", "confidence": "low", "follow_up": [], "llm_used": False}

        # ?? HOTFIX GUARD FOR DUPLICATE TEMPLATE CONCATENATIONS ??
        def generate_recommendation_HOTFIX(raw_text, refined):
            if not refined:
                return raw_text
            # Guard 1: prevent double prefix concatenation
            prefix_words = ["saya", "merasakan", "mengalami", "terasa"]
            for p in prefix_words:
                if raw_text.lower().startswith(p) and refined.lower().replace(raw_text.lower(), "").strip().startswith(p):
                    return raw_text
            # Guard 2: prevent repetitive word phrases
            words = refined.lower().split()
            if len(words) != len(set(words)) and (len(words) - len(set(words))) > 2:
                return raw_text
            return refined

        llm_response = await self._call_llm(_SYSTEM_PROMPT, text, json_mode=True)
        if llm_response:
            try:
                parsed = json.loads(llm_response)
                refined = parsed.get("refined_sentence", text)
                return {
                    "refined_sentence": generate_recommendation_HOTFIX(text, refined),
                    "confidence": parsed.get("confidence", "medium"),
                    "follow_up": parsed.get("follow_up", [])[:3],
                    "llm_used": True,
                }
            except Exception as e:
                print(f"[NLG] LLM refine error, falling back to template: {e}")

        # ?? fallback: template engine ??
        words = text.split()
        fallback_sentence = self.generate_medical_sentence(words)
        word_count = len(words)
        confidence = "high" if word_count >= 4 else ("medium" if word_count >= 2 else "low")
        follow_up = []
        if confidence in ("low", "medium"):
            follow_up = [
                "Sejak kapan keluhan ini muncul?",
                "Bagian tubuh mana yang terasa tidak nyaman?",
                "Apakah ada gejala lain yang menyertai?",
            ]
        return {
            "refined_sentence": generate_recommendation_HOTFIX(text, fallback_sentence),
            "confidence": confidence,
            "follow_up": follow_up[:3],
            "llm_used": False,
        }
  

    async def summarize_session(self, logs: list) -> dict:
        if not logs:
            empty_msg = "Belum ada riwayat percakapan untuk diringkas."
            return {
                "subjective": empty_msg,
                "objective": empty_msg,
                "assessment": empty_msg,
                "plan": empty_msg,
                "full_text": empty_msg,
                "llm_used": False
            }

        conversation = "\n".join([f"{l.get('role', 'unknown').capitalize()}: {l.get('text', '')}" for l in logs])
        
        system_prompt = (
            "Anda adalah AI Notetaker Klinis. Rangkum percakapan medis antara Dokter dan Pasien "
            "ke dalam format Rencana Medis SOAP (Subjective, Objective, Assessment, Plan) dalam format JSON. "
            "Gunakan bahasa Indonesia yang formal, ringkas, dan profesional. "
            "Jangan menambahkan diagnosis atau informasi medis yang tidak disebutkan dalam percakapan.\n"
            "Format JSON output harus memiliki key: subjective, objective, assessment, plan."
        )
        
        user_prompt = f"Percakapan:\n{conversation}"
        
        llm_response = await self._call_llm(system_prompt, user_prompt, json_mode=True)
        if llm_response:
            try:
                parsed = json.loads(llm_response)
                subjective = parsed.get("subjective", "")
                objective = parsed.get("objective", "")
                assessment = parsed.get("assessment", "")
                plan = parsed.get("plan", "")
                
                full_text = (
                    f"### 📋 LAPORAN MEDIS AI (SOAP NOTE)\n\n"
                    f"**S — Subjective (Keluhan Pasien):**\n{subjective}\n\n"
                    f"**O — Objective (Instruksi & Observasi Dokter):**\n{objective}\n\n"
                    f"**A — Assessment (Evaluasi/Diagnosis):**\n{assessment}\n\n"
                    f"**P — Plan (Rencana Tindak Lanjut):**\n{plan}"
                )
                
                return {
                    "subjective": subjective,
                    "objective": objective,
                    "assessment": assessment,
                    "plan": plan,
                    "full_text": full_text,
                    "llm_used": True
                }
            except Exception as e:
                print(f"[NLG] Failed to parse LLM SOAP response: {e}")
                
        patient_messages = [l.get("text", "") for l in logs if l.get("role") == "patient"]
        doctor_messages = [l.get("text", "") for l in logs if l.get("role") == "doctor"]
        
        gejala = []
        for msg in patient_messages:
            words = re.findall(r"\b(sakit|pusing|demam|nyeri|sesak|tenggorokan|batuk|flu|gatal|mual|muntah)\b", msg.lower())
            gejala.extend(words)
        gejala = list(set(gejala))
        
        resep = []
        for msg in doctor_messages:
            if any(w in msg.lower() for w in ["obat", "resep", "minum", "dosis", "tablet", "kapsul", "sirup", "salam", "pagi", "malam"]):
                resep.append(msg)
                
        subjective = f"Keluhan utama terdeteksi: {', '.join(gejala).upper() if gejala else '-'}\n" + "\n".join([f"- {m}" for m in patient_messages])
        objective = f"Anjuran/Resep: {', '.join(resep) if resep else '-'}\n" + "\n".join([f"- {m}" for m in doctor_messages if m not in resep])
        
        patient_text_all = "".join(patient_messages).lower()
        if "dada" in patient_text_all or "sesak" in patient_text_all:
            assessment = "Keluhan sesak atau nyeri dada (Suspek gangguan kardiovaskular/pernapasan)."
            plan = "Rujuk untuk pemeriksaan EKG/fisik jantung segera."
        elif "tensi" in patient_text_all or "darah" in patient_text_all:
            assessment = "Keluhan terkait tekanan darah (Suspek hiatus/hipertensi)."
            plan = "Pantau tekanan darah berkala, edukasi pola hidup sehat."
        else:
            assessment = "Pemeriksaan umum pasca konsultasi."
            plan = "Edukasi kepatuhan minum obat sesuai dosis dokter."
            
        full_text = (
            f"### 📋 LAPORAN MEDIS AI (SOAP NOTE - Fallback Mode)\n\n"
            f"**S — Subjective:**\n{subjective}\n\n"
            f"**O — Objective:**\n{objective}\n\n"
            f"**A — Assessment:**\n{assessment}\n\n"
            f"**P — Plan:**\n{plan}"
        )
        
        return {
            "subjective": subjective,
            "objective": objective,
            "assessment": assessment,
            "plan": plan,
            "full_text": full_text,
            "llm_used": False
        }
