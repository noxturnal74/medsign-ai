import os
import time
from pathlib import Path
from typing import List, Dict, Any, Tuple
from app.tts.providers.google import GoogleTTSProvider
from app.tts.providers.edge import EdgeTTSProvider
from app.tts.providers.azure import AzureTTSProvider
from app.tts.providers.sapi import SapiTTSProvider
from app.tts.cache import TTSCache

class TTSService:
    def __init__(self):
        backend_dir = Path(__file__).resolve().parents[3]
        self.cache = TTSCache(backend_dir / "data" / "tts_cache")
        
        # Instantiate providers
        self.providers = {
            "sapi": SapiTTSProvider(),
            "google": GoogleTTSProvider(),
            "edge": EdgeTTSProvider(),
            "azure": AzureTTSProvider()
        }

    def get_providers_status(self) -> List[Dict[str, Any]]:
        status_list = []
        for name, p in self.providers.items():
            voices = p.get_voices()
            status_list.append({
                "name": p.name,
                "display_name": p.display_name,
                "status": p.get_status(),
                "voice_count": len(voices),
                "supported_languages": list(set(v["lang"] for v in voices)),
                "avg_latency_ms": 150 if name == "sapi" else 850
            })
        return status_list

    def get_voices(self, provider: str) -> List[Dict[str, Any]]:
        p = self.providers.get(provider)
        if not p:
            return []
        return p.get_voices()

    def synthesize(self, text: str, provider: str, voice: str, rate: float, pitch: float) -> Tuple[str, Dict[str, Any]]:
        # 1. Check Cache
        cached_file = self.cache.get(text, provider, voice, rate, pitch)
        if cached_file:
            stats = {
                "provider": provider,
                "voice": voice,
                "text": text,
                "cache_hit": True,
                "audio_size_bytes": os.path.getsize(cached_file),
                "generation_time_ms": 0
            }
            return cached_file, stats

        # 2. Cache Miss: Synthesize
        p = self.providers.get(provider)
        if not p:
            # Fallback to SAPI
            p = self.providers["sapi"]
            provider = "sapi"

        temp_output = str(self.cache.cache_dir / "temp_synth.wav")
        if os.path.exists(temp_output):
            try:
                os.unlink(temp_output)
            except Exception:
                pass

        start_time = time.time()
        success = p.synthesize(text, voice, rate, pitch, temp_output)
        elapsed_time_ms = int((time.time() - start_time) * 1000)

        if not success or not os.path.exists(temp_output):
            raise Exception(f"Voice synthesis failed on provider {provider}")

        # Save to cache
        cached_file = self.cache.put(text, provider, voice, rate, pitch, temp_output)
        
        stats = {
            "provider": provider,
            "voice": voice,
            "text": text,
            "cache_hit": False,
            "audio_size_bytes": os.path.getsize(cached_file),
            "generation_time_ms": elapsed_time_ms
        }
        return cached_file, stats
