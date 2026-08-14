import os
import asyncio
import edge_tts
from app.tts.providers.base import BaseTTSProvider
from app.tts.providers.sapi import SapiTTSProvider

class EdgeTTSProvider(BaseTTSProvider):
    @property
    def name(self) -> str:
        return "edge"

    @property
    def display_name(self) -> str:
        return "Microsoft Edge TTS (Gratis)"

    def get_status(self) -> str:
        return "Online"

    def get_voices(self) -> list:
        return [
            {"name": "id-ID-ArdiNeural", "lang": "id-ID", "gender": "Laki-laki", "style": "Neural", "region": "Indonesia", "type": "Edge Cloud"},
            {"name": "id-ID-GadisNeural", "lang": "id-ID", "gender": "Perempuan", "style": "Neural", "region": "Indonesia", "type": "Edge Cloud"},
            {"name": "en-US-AriaNeural", "lang": "en-US", "gender": "Perempuan", "style": "Neural", "region": "United States", "type": "Edge Cloud"},
            {"name": "en-US-GuyNeural", "lang": "en-US", "gender": "Laki-laki", "style": "Neural", "region": "United States", "type": "Edge Cloud"}
        ]

    def synthesize(self, text: str, voice: str, rate: float, pitch: float, output_path: str) -> bool:
        rate_val = int((rate - 1.0) * 100)
        rate_str = f"{rate_val:+d}%" if rate_val != 0 else "+0%"
        
        pitch_val = int((pitch - 1.0) * 100)
        pitch_str = f"{pitch_val:+d}Hz" if pitch_val != 0 else "+0Hz"
        
        async def run_synth():
            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate_str,
                pitch=pitch_str
            )
            await communicate.save(output_path)
            
        try:
            asyncio.run(run_synth())
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                return True
        except Exception as e:
            print(f"Edge TTS online failed ({e}), falling back to SAPI...")
            
        sapi = SapiTTSProvider()
        fallback_voice = "Ardi" if "id-ID" in voice else "David"
        return sapi.synthesize(text, fallback_voice, rate, pitch, output_path)
