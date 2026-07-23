# -*- coding: utf-8 -*-
from __future__ import annotations

class NLGService:
    def __init__(self):
        self.recommendations = {
            "sakit": [
                "sakit kepala", "sakit perut", "sakit dada", "sakit tenggorokan", 
                "terasa sakit", "penyakit", "sakit sejak kapan", "sakit sekali"
            ],
            "obat": [
                "minum obat", "resep obat", "alergi obat", "dosis obat", 
                "efek samping obat", "mengobati", "pengobatan"
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

    def recommend_next_words(self, word: str) -> list[str]:
        word_clean = word.strip().lower()
        if word_clean in self.recommendations:
            return self.recommendations[word_clean]
        return [
            f"meng-{word_clean}", f"di-{word_clean}", f"ber-{word_clean}", 
            f"ter-{word_clean}", f"pen-{word_clean}", f"ke-{word_clean}-an"
        ]

    def generate_medical_sentence(self, words: list[str]) -> str:
        cleaned_words = [w.strip().lower() for w in words if w.strip()]
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
