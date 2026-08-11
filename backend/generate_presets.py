import os
import numpy as np
import soundfile as sf

def generate_dummy_audio():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    presets_dir = os.path.join(backend_dir, "presets")
    os.makedirs(presets_dir, exist_ok=True)
    
    sr = 16000
    duration = 5.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # Generate simple sine waves with slight noise
    # We will write the 4 files defined in our frontend presets
    files = [
        "radio_lap03_turn1.wav",
        "radio_lap07_pitentry.wav",
        "radio_lap09_turn4.wav",
        "radio_lap12_backstraight.wav"
    ]
    
    for filename in files:
        filepath = os.path.join(presets_dir, filename)
        if not os.path.exists(filepath):
            # Generate a 440Hz tone mixed with a tiny bit of white noise
            tone = 0.1 * np.sin(2 * np.pi * 440 * t)
            noise = 0.01 * np.random.randn(len(t))
            data = tone + noise
            # Save as mono float32 WAV
            sf.write(filepath, data, sr)
            print(f"Created dummy audio preset: {filename}")

if __name__ == "__main__":
    generate_dummy_audio()
