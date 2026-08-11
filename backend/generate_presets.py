import os
import wave
import struct
import math

def generate_tone_wav(filepath, duration_sec=2.0, freq=440.0, sample_rate=16000, stress_factor=1.0):
    """Generates a simple synthesized tone WAV file with pitch modulation to simulate audio."""
    num_samples = int(duration_sec * sample_rate)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with wave.open(filepath, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            t = i / sample_rate
            # Modulation based on stress factor to give distinct sound profiles
            freq_mod = freq + math.sin(2 * math.pi * 5 * t) * (20 * stress_factor)
            sample = math.sin(2 * math.pi * freq_mod * t) * 0.3
            
            # Convert float sample [-1, 1] to 16-bit signed integer
            packed_sample = struct.pack('<h', int(sample * 32767))
            wav_file.writeframes(packed_sample)

if __name__ == '__main__':
    presets_dir = os.path.join(os.path.dirname(__file__), 'presets')
    os.makedirs(presets_dir, exist_ok=True)
    
    # Calm tone: smooth, lower pitch (300 Hz)
    generate_tone_wav(os.path.join(presets_dir, 'calm.wav'), duration_sec=2.5, freq=300.0, stress_factor=0.5)
    # Tired tone: slow, slightly fluctuating tone (220 Hz)
    generate_tone_wav(os.path.join(presets_dir, 'tired.wav'), duration_sec=3.0, freq=220.0, stress_factor=1.2)
    # Stressed tone: higher pitch, rapid modulation (600 Hz)
    generate_tone_wav(os.path.join(presets_dir, 'stressed.wav'), duration_sec=2.0, freq=600.0, stress_factor=3.0)

    print(f"Generated presets in {presets_dir}")
