# AI Smart Sentence Recommendation — Clinical Communication Guidelines

> Dokumen ini adalah **North Star** fitur AI Sentence Refinement di MedSign AI.
> Setiap perubahan pada `nlg_service.py`, `/nlg/refine-sentence`, dan UI Refinement Panel
> harus dikembalikan ke prinsip-prinsip di sini.

---

## Objective

Design and implement an AI-powered sentence recommendation system that helps patients express
their symptoms more clearly by transforming fragmented words, short phrases, or speech-to-text
results into complete, natural, and medically appropriate sentences.

This feature is intended to improve communication between patients and healthcare professionals
while preserving the patient's original meaning.

**The AI must NEVER diagnose, assume, or invent information.**

---

## Core Principle

The AI should only improve **how** the patient's message is written.

**Must NOT:**
- Add new symptoms
- Add durations that were never mentioned
- Add pain levels
- Add diagnoses
- Add medications
- Add body locations not mentioned
- Change the original meaning

**Should only:**
- Reconstruct fragmented words
- Improve grammar
- Improve readability
- Improve sentence flow
- Remove unnecessary repetition
- Keep the patient's intent exactly the same

---

## Examples

**Example 1**
- Input: `knee pain stairs morning`
- Output: `I have pain in my knee, especially when walking down the stairs in the morning.`

**Example 2**
- Input: `head dizzy nausea since yesterday`
- Output: `I have been experiencing dizziness accompanied by nausea since yesterday.`

**Example 3**
- Input: `cough two weeks night`
- Output: `I have had a cough for about two weeks, and it becomes worse at night.`

**Example 4**
- Input: `can't sleep chest tight`
- Output: `I have difficulty sleeping because my chest feels tight.`

---

## AI Recommendation Flow

```
Patient enters text / gestures detected
        ↓
Debounce ~1200ms after last input
        ↓
POST /api/v1/nlg/refine-sentence
        ↓
Show loading: "✨ Improving your description…"
        ↓
Display Refinement Panel:
  - refined_sentence (editable textarea)
  - confidence badge (very_high / high / medium / low)
  - follow-up questions (if confidence ≤ medium)
  - compare mode (original vs AI)
        ↓
Patient reviews → edits if needed → Preview TTS → Kirim
        ↓
Kirim → addLogEntry → DoctorView
```

**Never overwrite the user's original input automatically.**

---

## Refinement Panel — UI Spec

| Elemen | Keterangan |
|---|---|
| Header | "✨ AI Sentence Refinement" + confidence badge + model badge |
| Compare toggle | Tampilkan diff original vs hasil AI |
| Textarea | Editable sebelum submit |
| Transparency note | "AI hanya memperbaiki susunan kalimat. Tidak ada diagnosis…" |
| Follow-up block | Muncul jika confidence medium/low — opsional |
| Tombol Preview | TTS pratinjau sebelum commit |
| Tombol Ulang | Regenerate dari input awal |
| Tombol Kirim | Push ke sessionLog + DoctorView, clear sentence |
| Tombol Buang | Dismiss tanpa efek samping |

---

## Evidence-Based Design Requirements

Fitur ini mengikuti prinsip komunikasi pasien dan literasi kesehatan yang sudah terbukti secara internasional.

### 1. Plain Language

AI menyusun ulang deskripsi pasien yang terputus menjadi bahasa sehari-hari yang jelas
tanpa memasukkan jargon medis.

**Jangan** mengganti kata sederhana pasien dengan terminologi medis kompleks.

- ✅ `I have pain in my chest when I breathe.`
- ❌ `The patient presents with pleuritic thoracic pain.`

**Reference:** CDC Plain Language Guidance · AHRQ Health Literacy Toolkit

---

### 2. Preserve Patient Intent

AI **tidak boleh**:
- mengarang gejala
- menyimpulkan diagnosis
- memperkirakan tingkat keparahan
- menebak durasi
- merekomendasikan obat
- merekomendasikan tindakan

Kalimat yang ditulis ulang harus mempertahankan **persis** apa yang dikomunikasikan pasien.

---

### 3. Writing Assistant, Not Medical Assistant

AI hanya bertindak sebagai **writing assistant**.

Tanggung jawabnya:
- memperbaiki tata bahasa
- memperbaiki alur kalimat
- menyusun ulang ucapan yang terfragmentasi
- meningkatkan keterbacaan
- mengorganisir ide

AI **tidak boleh** memberikan:
- diagnosis
- saran medis
- resep
- rekomendasi darurat

---

### 4. Confidence-Based Suggestions

Jika confidence **low**, jangan menulis ulang teks ambigu secara percaya diri.

Tampilkan sebagai gantinya:
> "Your description may be incomplete. Consider adding more information."

Contoh follow-up questions (opsional, max 3):
- Sejak kapan keluhan ini muncul?
- Bagian tubuh mana yang terasa sakit?
- Apakah ada yang memperburuk keluhan?
- Apakah ada yang memperingan keluhan?
- Apakah ada keluhan lain yang menyertai?

---

### 5. Human-in-the-Loop

Pasien selalu memegang kendali. Rekomendasi AI **tidak pernah** menimpa input asli secara otomatis.

Workflow wajib:
```
Original Input → AI Recommendation → Compare → Patient Review → Apply → Submit
```

---

### 6. Transparency

Setiap rekomendasi harus menyertakan catatan:
> "AI improved the wording for clarity while preserving your original meaning."

Jangan menyiratkan bahwa rekomendasi telah diverifikasi secara medis.

---

### 7. Privacy

- Data pasien tidak disimpan secara permanen kecuali pengguna mengaktifkan histori.
- Jika layanan cloud AI digunakan: informasikan pengguna, dapatkan persetujuan sebelum mengirim teks, proses data secara aman.
- **MedSign AI saat ini menggunakan OpenAI API (`gpt-4o-mini`).** Jika API key tidak tersedia, fallback ke template engine lokal.

---

### 8. Accessibility

Support:
- keyboard navigation
- screen readers
- high contrast
- large text mode
- responsive layouts
- speech input (Web Speech API)

---

## AI Prompt (Internal — nlg_service.py)

```
You are an AI medical writing assistant.
Your task is to improve how patients describe their symptoms.

Rules:
- Preserve the patient's original meaning exactly.
- Never invent symptoms, diagnoses, medications, durations, severity, or medical facts.
- Never provide medical advice.
- Convert fragmented phrases into complete, natural, grammatically correct sentences.
- Improve readability and clarity only.
- Keep the same language as the user's input.
- Return only one improved sentence unless multiple paragraphs are provided.
- Do not include explanations.
- Do not include bullet points.
- Do not mention that AI modified the sentence.

Return JSON: { "refined_sentence": "...", "confidence": "very_high|high|medium|low", "follow_up": [...] }
```

---

## Performance Requirements

- Recommendation generation: ≤ 2 detik
- Run asynchronously — never freeze the interface
- Cancel previous requests when user continues typing (debounce)
- Cache repeated requests jika diperlukan

---

## Error Handling

Gracefully handle:
- No internet / API unavailable
- Timeout / Rate limit
- Authentication failure (invalid API key)
- Server unavailable

Jika generation gagal:
> "Unable to generate a recommendation. Please try again."

Selalu tampilkan tombol Retry.

---

## Medical Safety — Forbidden Outputs

AI **tidak boleh** menghasilkan:
- Possible diagnosis
- Disease names
- Treatment plans
- Medication recommendations
- Emergency advice
- Medical assumptions

❌ `"You probably have pneumonia."`
❌ `"This appears to be appendicitis."`
✅ `"I have had a fever and cough since yesterday."`

---

## References

- [CDC – Plain Language Materials & Resources](https://www.cdc.gov/health-literacy/php/develop-materials/plain-language.html)
- [AHRQ – Health Literacy Universal Precautions Toolkit (Teach-Back)](https://www.ahrq.gov/health-literacy/improve/precautions/tool5.html)
- [AHRQ – Teach-Back Intervention Guide](https://www.ahrq.gov/patient-safety/reports/engage/interventions/teachback.html)
- [AHRQ – TeamSTEPPS Teach-Back Communication Tool](https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/teachback.html)
- [AAP – Plain Language Communication Strategies](https://www.aap.org/en/patient-care/healthy-active-living-for-families/communicating-with-families/plain-language/)

---

## Future Enhancements (Optional Modules)

Arsitektur harus memungkinkan integrasi di masa depan:

- Medical entity extraction (symptoms, duration, body location)
- FHIR/HL7 interoperability
- ICD-10 dan SNOMED CT mapping
- Clinical note generation (SOAP format)
- Physician review mode
- Multilingual medical communication
- Voice-to-SOAP workflow
- AI-assisted intake forms

**Penting:** Modul-modul ini bersifat opsional dan tidak boleh mengubah prinsip inti bahwa
AI menyusun ulang input pasien tanpa menambah atau menyimpulkan informasi medis.

---

*Terakhir diperbarui: 2026-08-08 | Maintainer: Albert William Saputra*
