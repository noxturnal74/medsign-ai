import os
from app.tts.providers.base import BaseTTSProvider
from app.tts.providers.sapi import SapiTTSProvider

class GoogleTTSProvider(BaseTTSProvider):
    @property
    def name(self) -> str:
        return "google"

    @property
    def display_name(self) -> str:
        return "Google Text-to-Speech"

    def get_status(self) -> str:
        # Check if API Key is configured in environment variables
        has_key = os.getenv("GOOGLE_API_KEY") is not None
        return "Connected" if has_key else "API Key Required"

    def get_voices(self) -> list:
        return [
            {"name": "id-ID-Standard-A", "lang": "id-ID", "gender": "Perempuan", "style": "Standard", "region": "Indonesia", "type": "Cloud"},
            {"name": "id-ID-Wavenet-B", "lang": "id-ID", "gender": "Laki-laki", "style": "Neural", "region": "Indonesia", "type": "Cloud"},
            {"name": "en-US-Neural2-F", "lang": "en-US", "gender": "Perempuan", "style": "Neural", "region": "United States", "type": "Cloud"},
            {"name": "en-US-Wavenet-A", "lang": "en-US", "gender": "Laki-laki", "style": "Neural", "region": "United States", "type": "Cloud"},
            {"name": "ja-JP-Neural2-B", "lang": "ja-JP", "gender": "Laki-laki", "style": "Neural", "region": "Japan", "type": "Cloud"}
        ]

    def synthesize(self, text: str, voice: str, rate: float, pitch: float, output_path: str) -> bool:
        # Fallback to SAPI because of offline environment
        print("Google TTS offline fallback to SAPI")
        sapi = SapiTTSProvider()
        return sapi.synthesize(text, "Andika" if "id-ID" in voice else "David", rate, pitch, output_path)
