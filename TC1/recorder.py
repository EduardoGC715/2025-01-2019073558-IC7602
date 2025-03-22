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
        self.noise_frames = []
        self.has_noise_profile = False
        self.q = queue.Queue()

    def collect_noise(self, seconds=3):
        """Graba el ruido ambiente para crear un perfil"""
        print(f"Grabando ruido ambiente por {seconds} segundos...")
        self.noise_frames = []

        stream = self.audio.open(
            format=self.format,
            channels=self.channels,
            rate=self.rate,
            input=True,
            frames_per_buffer=self.chunk,
        )

        for i in range(0, int(self.rate / self.chunk * seconds)):
            data = stream.read(self.chunk)
            self.noise_frames.append(data)

        stream.stop_stream()
        stream.close()
        self.has_noise_profile = True
        print("Perfil de ruido creado correctamente")

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
                    self.q.put_nowait(data_array)  # Put numpy array in queue
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

    def apply_noise_reduction(self, signal_array, noise_array, reduction_factor=0.7):
        """Aplica reducción de ruido espectral"""
        # Convertimos bytes a datos numéricos
        if noise_array.size == 0:
            return signal_array

        # Calculamos la FFT del ruido
        noise_fft = np.fft.rfft(noise_array)
        noise_power = np.abs(noise_fft) ** 2

        # Calculamos la FFT de la señal
        signal_fft = np.fft.rfft(signal_array)
        signal_power = np.abs(signal_fft) ** 2

        # Calculamos una máscara de supresión espectral
        mask = (
            1 - np.sqrt(noise_power) / (np.sqrt(signal_power) + 1e-6) * reduction_factor
        )
        mask = np.clip(mask, 0.1, 1.0)  # Limitamos entre 0.1 y 1.0

        # Aplicamos la máscara
        signal_fft *= mask

        # Volvemos al dominio del tiempo
        return np.fft.irfft(signal_fft).astype(np.int16)

    def enhance_voice(self, audio_array):
        """Mejora las frecuencias de voz humana"""
        # Aplicamos un filtro pasa banda para frecuencias de voz (300-3400 Hz)
        nyquist = self.rate / 2
        low = 300 / nyquist
        high = 3400 / nyquist
        b, a = signal.butter(4, [low, high], btype="band")
        return signal.lfilter(b, a, audio_array)

    def save_recording(self, filename="grabacion_mejorada.wav", apply_filters=True):
        """Guarda la grabación como archivo WAV con procesamiento opcional"""
        if not self.frames:
            print("No hay audio para guardar")
            return False

        processed_frames = self.frames

        if apply_filters:
            print("Aplicando filtros y mejoras al audio...")

            # Convertimos los frames para procesamiento
            audio_array = self._convert_frames_to_array(self.frames)

            # Reducción de ruido si tenemos un perfil de ruido
            if self.has_noise_profile:
                noise_array = self._convert_frames_to_array(self.noise_frames)
                audio_array = self.apply_noise_reduction(audio_array, noise_array)

            # Mejora de voz
            audio_array = self.enhance_voice(audio_array)

            # Normalización del volumen (evita saturación)
            max_val = np.max(np.abs(audio_array))
            if max_val > 0:
                scale_factor = min(32000 / max_val, 5.0)  # Limitamos la ganancia
                audio_array = audio_array * scale_factor

            # Convertimos de vuelta a bytes
            processed_frames = [self._convert_array_to_frames(audio_array)]

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
