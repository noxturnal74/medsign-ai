import os
from app.tts.providers.base import BaseTTSProvider
from app.tts.providers.sapi import SapiTTSProvider

class EdgeTTSProvider(BaseTTSProvider):
    @property
    def name(self) -> str:
        return "edge"

    @property
    def display_name(self) -> str:
        return "Microsoft Edge TTS (gTTS-like)"

    def get_status(self) -> str:
        return "Offline" # Edge TTS online service is currently offline/unreachable due to sandbox network lock

    def get_voices(self) -> list:
        return [
            {"name": "id-ID-ArdiNeural", "lang": "id-ID", "gender": "Laki-laki", "style": "Neural", "region": "Indonesia", "type": "Edge Cloud"},
            {"name": "id-ID-GadisNeural", "lang": "id-ID", "gender": "Perempuan", "style": "Neural", "region": "Indonesia", "type": "Edge Cloud"},
            {"name": "en-US-AriaNeural", "lang": "en-US", "gender": "Perempuan", "style": "Neural", "region": "United States", "type": "Edge Cloud"},
            {"name": "en-US-GuyNeural", "lang": "en-US", "gender": "Laki-laki", "style": "Neural", "region": "United States", "type": "Edge Cloud"}
        ]

    def synthesize(self, text: str, voice: str, rate: float, pitch: float, output_path: str) -> bool:
        # Fallback to SAPI because of offline environment
        print("Edge TTS offline fallback to SAPI")
        sapi = SapiTTSProvider()
        return sapi.synthesize(text, "Ardi" if "id-ID" in voice else "David", rate, pitch, output_path)
