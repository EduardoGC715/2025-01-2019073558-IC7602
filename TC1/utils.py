import wave
import numpy as np


def save_as_wav(filename, frames, channels, rate):
    if not frames:
        print("No hay datos para guardar.")
        return

    audio_data = np.concatenate(frames)
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)  # 2 bytes para float32
        wf.setframerate(rate)
        wf.writeframes(audio_data.astype(np.float32).tobytes())

    print(f"Grabación guardada como {filename}")
