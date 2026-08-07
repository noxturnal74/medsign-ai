import subprocess
import os
from app.tts.providers.base import BaseTTSProvider

class SapiTTSProvider(BaseTTSProvider):
    @property
    def name(self) -> str:
        return "sapi"

    @property
    def display_name(self) -> str:
        return "Windows SAPI (Offline)"

    def get_status(self) -> str:
        return "Connected" if os.name == 'nt' else "Unsupported"

    def get_voices(self) -> list:
        return [
            {"name": "Microsoft Andika", "lang": "id-ID", "gender": "Laki-laki", "style": "Standard", "region": "Indonesia", "type": "Offline"},
            {"name": "Microsoft Ardi", "lang": "id-ID", "gender": "Laki-laki", "style": "Standard", "region": "Indonesia", "type": "Offline"},
            {"name": "Microsoft David", "lang": "en-US", "gender": "Laki-laki", "style": "Standard", "region": "United States", "type": "Offline"},
            {"name": "Microsoft Zira", "lang": "en-US", "gender": "Perempuan", "style": "Standard", "region": "United States", "type": "Offline"}
        ]

    def synthesize(self, text: str, voice: str, rate: float, pitch: float, output_path: str) -> bool:
        sapi_rate = int((rate - 1.0) * 10)
        sapi_rate = max(-10, min(10, sapi_rate))
        
        # Clean text to avoid script injection
        safe_text = text.replace("'", "''").replace("\n", " ")
        
        ps_code = f"""
        Add-Type -AssemblyName System.Speech;
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
        $voice = $synth.GetInstalledVoices() | Where-Object {{ $_.VoiceInfo.Name -like "*{voice}*" }} | Select-Object -First 1;
        if ($voice) {{
            $synth.SelectVoice($voice.VoiceInfo.Name);
        }}
        $synth.Rate = {sapi_rate};
        $synth.SetOutputToWaveFile('{output_path}');
        $synth.Speak('{safe_text}');
        $synth.Dispose();
        """
        try:
            subprocess.run(["powershell", "-Command", ps_code], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return os.path.exists(output_path)
        except Exception as e:
            print(f"SAPI synthesis failed: {e}")
            return False
