import subprocess
import os
import re
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

        # SECURITY: voice & output_path di-whitelist ketat (anti PowerShell injection)
        safe_voice = re.sub(r"[^A-Za-z0-9 ]", "", voice or "")[:64]
        safe_output = output_path if re.match(r"^[A-Za-z]:\\[\w\\ .-]+\.(wav|mp3)$", output_path) else None
        if safe_output is None:
            print("SAPI synthesis blocked: invalid output path")
            return False
        safe_output_escaped = safe_output.replace("'", "''")

        # Clean text to avoid script injection
        safe_text = text.replace("'", "''").replace("\n", " ").replace("`", "''")[:5000]

        ps_code = f"""
        Add-Type -AssemblyName System.Speech;
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
        $voice = $synth.GetInstalledVoices() | Where-Object {{ $_.VoiceInfo.Name -like "*{safe_voice}*" }} | Select-Object -First 1;
        if ($voice) {{
            $synth.SelectVoice($voice.VoiceInfo.Name);
        }}
        $synth.Rate = {int(sapi_rate)};
        $synth.SetOutputToWaveFile('{safe_output_escaped}');
        $synth.Speak('{safe_text}');
        $synth.Dispose();
        """
        try:
            subprocess.run(["powershell", "-Command", ps_code], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return os.path.exists(output_path)
        except Exception as e:
            print(f"SAPI synthesis failed: {e}")
            return False
