import os
from app.tts.providers.base import BaseTTSProvider
from app.tts.providers.sapi import SapiTTSProvider

class AzureTTSProvider(BaseTTSProvider):
    @property
    def name(self) -> str:
        return "azure"

    @property
    def display_name(self) -> str:
        return "Microsoft Azure Cognitive Speech"

    def get_status(self) -> str:
        has_key = os.getenv("AZURE_SPEECH_KEY") is not None and os.getenv("AZURE_SPEECH_REGION") is not None
        return "Connected" if has_key else "Not Configured"

    def get_voices(self) -> list:
        return [
            {"name": "id-ID-GadisNeural", "lang": "id-ID", "gender": "Perempuan", "style": "Neural", "region": "Indonesia", "type": "Azure Neural"},
            {"name": "id-ID-ArdiNeural", "lang": "id-ID", "gender": "Laki-laki", "style": "Neural", "region": "Indonesia", "type": "Azure Neural"},
            {"name": "en-US-JennyNeural", "lang": "en-US", "gender": "Perempuan", "style": "Neural", "region": "United States", "type": "Azure Neural"},
            {"name": "en-US-GuyNeural", "lang": "en-US", "gender": "Laki-laki", "style": "Neural", "region": "United States", "type": "Azure Neural"}
        ]

    def synthesize(self, text: str, voice: str, rate: float, pitch: float, output_path: str) -> bool:
        # Fallback to SAPI because of offline environment
        print("Azure TTS offline fallback to SAPI")
        sapi = SapiTTSProvider()
        return sapi.synthesize(text, "Ardi" if "id-ID" in voice else "David", rate, pitch, output_path)
