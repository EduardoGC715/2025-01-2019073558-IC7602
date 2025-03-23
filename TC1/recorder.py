import pyaudio
import wave
import numpy as np
import threading
import time
import os
from scipy import signal
import queue


class AudioRecorder:
    def __init__(self):
        self.format = pyaudio.paInt16
        self.channels = 1
        self.rate = 44100
        self.chunk = 1024
        self.frames = []
        self.is_recording = False
        self.is_paused = False
        self.audio = pyaudio.PyAudio()
        self.stream = None
        self.queue = queue.Queue()

    def start_recording(self):
        """Inicia la grabación de audio"""
        if self.is_recording:
            print("La grabación ya está en curso")
            return

        self.frames = []
        self.is_recording = True
        self.is_paused = False

        # Iniciamos la grabación en un hilo separado
        threading.Thread(target=self._record).start()
        print("Grabación iniciada")

    def _record(self):
        """Proceso interno de grabación"""
        self.stream = self.audio.open(
            format=self.format,
            channels=self.channels,
            rate=self.rate,
            input=True,
            frames_per_buffer=self.chunk,
        )

        while self.is_recording:
            if not self.is_paused:
                try:
                    data = self.stream.read(self.chunk)
                    # Convert data to numpy array for processing
                    data_array = np.frombuffer(data, dtype=np.int16)
                    self.frames.append(data_array)  # Store as numpy array
                    self.queue.put_nowait(data_array)  # Put numpy array in queue
                except Exception as e:
                    print(f"Error durante la grabación: {e}")
                    break
            else:
                time.sleep(0.1)  # Pausa para reducir uso de CPU

        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None

    def pause_recording(self):
        """Pausa la grabación en curso"""
        if self.is_recording and not self.is_paused:
            self.is_paused = True
            print("Grabación pausada")

    def resume_recording(self):
        """Reanuda la grabación pausada"""
        if self.is_recording and self.is_paused:
            self.is_paused = False
            print("Grabación reanudada")

    def stop_recording(self):
        """Detiene la grabación"""
        self.is_recording = False
        print("Grabación detenida")

    def _convert_frames_to_array(self, frames):
        """Convierte los frames de bytes a array numpy para procesamiento"""
        return np.frombuffer(b"".join(frames), dtype=np.int16)

    def _convert_array_to_frames(self, array):
        """Convierte el array numpy a frames de bytes"""
        return array.astype(np.int16).tobytes()

    def save_recording(self):
        """Guarda la grabación como archivo WAV con procesamiento opcional"""
        if not self.frames:
            print("No hay audio para guardar")
            return False

        processed_frames = self.frames
        filename = f"recording-{time.strftime('%Y%m%d-%H%M%S')}.wav"
        # Guardamos el archivo WAV
        wf = wave.open(filename, "wb")
        wf.setnchannels(self.channels)
        wf.setsampwidth(self.audio.get_sample_size(self.format))
        wf.setframerate(self.rate)
        wf.writeframes(b"".join(processed_frames))
        wf.close()

        print(f"Audio guardado como {filename}")
        return True

    def close(self):
        """Libera recursos"""
        if self.is_recording:
            self.stop_recording()
        self.audio.terminate()
        print("Recursos liberados")
