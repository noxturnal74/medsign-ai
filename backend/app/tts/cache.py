import os
import hashlib
from pathlib import Path

class TTSCache:
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_hash(self, text: str, provider: str, voice: str, rate: float, pitch: float) -> str:
        # Create a unique SHA256 key based on speech parameters
        payload = f"{text}_{provider}_{voice}_{rate}_{pitch}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def get(self, text: str, provider: str, voice: str, rate: float, pitch: float) -> str | None:
        key = self._get_hash(text, provider, voice, rate, pitch)
        file_path = self.cache_dir / f"{key}.wav"
        if file_path.exists():
            print(f"[TTS_CACHE] Hit! Key: {key}")
            return str(file_path)
        print(f"[TTS_CACHE] Miss! Key: {key}")
        return None

    def put(self, text: str, provider: str, voice: str, rate: float, pitch: float, temp_path: str) -> str:
        key = self._get_hash(text, provider, voice, rate, pitch)
        dest_path = self.cache_dir / f"{key}.wav"
        if os.path.exists(temp_path):
            os.rename(temp_path, str(dest_path))
        return str(dest_path)

    def clear(self) -> None:
        for f in self.cache_dir.glob("*.wav"):
            try:
                f.unlink()
            except Exception:
                pass
