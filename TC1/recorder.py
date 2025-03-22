import numpy as np
import sounddevice as sd
import queue
import sys
from filters import lowpass_filter
from utils import save_as_wav


class AudioRecorder:
    def __init__(self):
        self.CHUNK = 1024
        self.CHANNELS = 1
        self.RATE = 44100
        self.frames = []
        self.is_recording = False
        self.is_paused = False
        self.stream = None
        self.q = queue.Queue()

    def audio_callback(self, indata, frames, time, status):
        if status:
            print(f"Sounddevice Warning: {status}", file=sys.stderr)
        if not self.is_paused and self.is_recording:
            try:
                data = indata[:, 0]  # Primer canal
                filtered_data = lowpass_filter(data, cutoff=3000, fs=self.RATE)
                self.frames.append(filtered_data.copy())
                self.q.put_nowait(filtered_data)
            except queue.Full:
                pass

    def start_recording(self):
        if self.is_recording:
            print("Recording is already running.")
            return

        self.is_recording = True
        self.is_paused = False
        try:
            self.stream = sd.InputStream(
                channels=self.CHANNELS,
                samplerate=self.RATE,
                blocksize=self.CHUNK,
                callback=self.audio_callback,
            )
            self.stream.start()
            print("Recording started.")
        except Exception as e:
            print(f"Error starting recording: {e}")

    def stop_recording(self):
        self.is_recording = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        print("Recording stopped.")

    def pause_recording(self):
        self.is_paused = True
        print("Recording paused.")

    def resume_recording(self):
        self.is_paused = False
        print("Recording resumed.")

    def save_recording(self, filename="grabacion.wav"):
        save_as_wav(filename, self.frames, self.CHANNELS, self.RATE)
