from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseTTSProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        pass

    @abstractmethod
    def get_status(self) -> str:
        # Returns: "Connected", "Offline", "API Key Required", "Not Configured"
        pass

    @abstractmethod
    def get_voices(self) -> List[Dict[str, Any]]:
        # Returns list of dicts: {"name": str, "lang": str, "gender": str, "style": str}
        pass

    @abstractmethod
    def synthesize(self, text: str, voice: str, rate: float, pitch: float, output_path: str) -> bool:
        # Generates audio file at output_path. Returns True if success, False otherwise.
        pass
