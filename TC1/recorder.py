import pyaudio
import wave
import numpy as np
import threading
import time
import os
from scipy import signal
import queue
import pickle


class AudioRecorder:
    """Clase para grabar audio con el micrófono y procesar archivos WAV."""

    def __init__(self):
        """Inicializa los parámetros de grabación y la cola."""
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
                    # Convertir los datos de bytes a un array numpy
                    data_array = np.frombuffer(data, dtype=np.int16)
                    self.queue.put_nowait(data_array)  # Encolar frame
                except Exception as e:
                    print(f"Error durante la grabación: {e}")
                    break
            else:
                time.sleep(0.1)  # Pausa para reducir uso de CPU

        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None

    def load_audio_file(self, filename):
        """Lee un archivo de audio WAV"""
        if not os.path.exists(filename):
            print("El archivo no existe")
            return False

        threading.Thread(target=self._process_audio_file, args=(filename,)).start()

    def _process_audio_file(self, filename):
        """Procesa un archivo de audio WAV"""
        self.is_recording = True
        wf = wave.open(filename, "rb")
        self.channels = wf.getnchannels()
        self.rate = wf.getframerate()
        self.format = self.audio.get_format_from_width(wf.getsampwidth())
        self.frames = []
        data_array = np.frombuffer(wf.readframes(self.chunk), dtype=np.int16)
        print("Cargando audio...")
        count = 0
        while len(data_array) > 0:
            self.queue.put_nowait(data_array)  # Encolar frame
            data_array = np.frombuffer(wf.readframes(self.chunk), dtype=np.int16)
            count += 1
            print(count)
        wf.close()
        print(f"Audio cargado de {filename}")
        self.is_recording = False

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

    def export_autrum(self, filename=None):
        """Exporta la grabación com un archivo Autrum (.atm)
        El archivo Autrum almacena los parámetros de grabación, los frames de audio y la información
        de la transformada de Fourier"""
        if not filename:
            filename = f"autrum-{time.strftime('%Y%m%d-%H%M%S')}.atm"
        data = {
            "rate": self.rate,
            "channels": self.channels,
            "frames": self.frames,
            "fft_data": getattr(self, "fft_data", {}),
            "sample_width": self.audio.get_sample_size(self.format),
            "format": self.format,
            "chunk": self.chunk,
        }

        with open(filename, "wb") as f:
            pickle.dump(data, f)
        print(f"Autrum file saved as {filename}")

    def close(self):
        """Libera recursos"""
        if self.is_recording:
            self.stop_recording()
        self.audio.terminate()
        print("Recursos liberados")
