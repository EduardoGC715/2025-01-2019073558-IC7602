import matplotlib.pyplot as plt
from matplotlib.widgets import Button
import numpy as np
import pyaudio
import pickle
import threading
import time
from scipy.fft import rfft, rfftfreq


class AudioComparatorVisualizer:
    def __init__(self, atm_file, recorder):
        """
        Carga datos desde un archivo .atm y configura la interfaz para reproducir audio
        y visualizar su forma de onda y espectro de frecuencia.
        """
        self.recorder = recorder

        # --- Load .atm data ---
        with open(atm_file, "rb") as f:
            data = pickle.load(f)

        # Extraer parámetros de audio y frames
        self.rate = data["rate"]
        self.channels = data["channels"]
        self.sample_width = data["sample_width"]
        self.frames = data["frames"]  # list of NumPy arrays
        # Concatenar en un solo array para la reproducción
        self.audio_array = (
            np.concatenate(self.frames) if self.frames else np.array([], dtype=np.int16)
        )

        # FFT data guardada
        self.fft_data = data.get("fft_data", {})

        # Parámetros para reproducción
        self.is_playing = False
        self.is_paused = False
        self.current_pos = 0  # Índice de muestra actual
        self.chunk = 1024  # Tamaño de bloque de reproducción
        self.play_thread = None  # Hilo de reproducción

        # Configuración para la visualización
        self.MAX_FREQUENCY = 4000  # Límite de frecuencia a mostrar
        self.MAX_SECONDS = 2  # Mostrar últimos 2 segundos en el gráfico

        # --- Crear figura y ejes ---
        self.fig, (self.ax_time, self.ax_freq) = plt.subplots(2, 1, figsize=(10, 8))
        plt.subplots_adjust(bottom=0.3, hspace=0.4)
        self.fig.canvas.set_window_title("Autrum - Reproductor de Audio")

        # Eje de tiempo
        self.ax_time.set_title("Audio Player (Time Domain)")
        self.ax_time.set_xlabel("Time (s)")
        self.ax_time.set_ylabel("Amplitude")
        (self.line_time,) = self.ax_time.plot([], [])

        # Eje de frecuencia
        self.ax_freq.set_title("Audio Player (Frequency Domain)")
        self.ax_freq.set_xlabel("Frequency (Hz)")
        self.ax_freq.set_ylabel("Magnitude")
        (self.line_freq,) = self.ax_freq.plot([], [])

        # --- Botones ---
        ax_play = plt.axes([0.05, 0.1, 0.1, 0.075])
        ax_pause = plt.axes([0.2, 0.1, 0.1, 0.075])
        ax_resume = plt.axes([0.35, 0.1, 0.1, 0.075])
        ax_stop = plt.axes([0.5, 0.1, 0.1, 0.075])

        self.btn_play = Button(ax_play, "Reproducir")
        self.btn_pause = Button(ax_pause, "Pausar")
        self.btn_resume = Button(ax_resume, "Reanudar")
        self.btn_stop = Button(ax_stop, "Detener")

        self.btn_play.on_clicked(self.start_playback)
        self.btn_pause.on_clicked(self.pause_playback)
        self.btn_resume.on_clicked(self.resume_playback)
        self.btn_stop.on_clicked(self.stop_playback)

        # Timer para actualizar el gráfico
        self.timer = self.fig.canvas.new_timer(interval=100)  # ms
        self.timer.add_callback(self.update_plot)
        self.timer.start()

        # Detectar zoom/pan en el eje de tiempo
        self.ax_time.callbacks.connect("xlim_changed", self.on_xlim_changed)
        self.is_zooming = False

        # Cerrar la figura limpia el audio
        self.fig.canvas.mpl_connect("close_event", self.on_close)

        # PyAudio setup (creamos PyAudio pero abrimos stream en _playback_thread)
        self.p = pyaudio.PyAudio()

    def start_playback(self, event):
        """Inicia la reproducción de audio en un hilo separado."""
        if self.is_playing:
            print("Ya está reproduciendo.")
            return
        if self.audio_array.size == 0:
            print("No hay audio para reproducir.")
            return

        self.is_playing = True
        self.is_paused = False
        self.current_pos = 0
        self.timer.start()
        self.play_thread = threading.Thread(target=self._playback_thread, daemon=True)
        self.play_thread.start()
        print("Reproducción iniciada.")

    def _playback_thread(self):
        """Hilo interno que envía audio a la salida en tiempo real."""
        stream = self.p.open(
            format=self.p.get_format_from_width(self.sample_width),
            channels=self.channels,
            rate=self.rate,
            output=True,
        )

        total_samples = len(self.audio_array)

        while self.is_playing and self.current_pos < total_samples:
            if self.is_paused:
                time.sleep(0.1)
                continue

            # Determinar cuántas muestras quedan
            end_pos = min(self.current_pos + self.chunk, total_samples)
            # Extraer ese bloque
            block = self.audio_array[self.current_pos : end_pos]
            # Convertir a bytes y escribir al stream
            stream.write(block.tobytes())

            self.current_pos = end_pos
            # Podrías dormir, pero stream.write() generalmente bloquea el tiempo suficiente

        # Si llegamos al final o se detuvo la reproducción
        stream.stop_stream()
        stream.close()

        print("Reproducción terminada.")
        self.is_playing = False

    def pause_playback(self, event):
        """Pausa la reproducción."""
        if self.is_playing and not self.is_paused:
            self.is_paused = True
            self.timer.stop()
            print("Reproducción pausada.")

    def resume_playback(self, event):
        """Reanuda la reproducción."""
        if self.is_playing and self.is_paused:
            self.is_paused = False
            self.timer.start()
            print("Reproducción reanudada.")

    def stop_playback(self, event):
        """Detiene la reproducción por completo."""
        if self.is_playing:
            self.is_playing = False
            self.timer.stop()
            print("Reproducción detenida.")

    def update_plot(self):
        # If there's no audio, do nothing.
        if self.audio_array.size == 0:
            return

        # Stop updating if playback is finished.
        if not self.is_playing and self.current_pos >= len(self.audio_array):
            self.timer.stop()
            return

        # Determine how many samples have been played.
        current_pos = self.current_pos

        # Choose the window to display: from the beginning until the current position.
        audio_segment = self.audio_array[:current_pos]

        # Avoid FFT on an empty segment.
        if audio_segment.size == 0:
            self.fig.canvas.draw_idle()
            return

        # Total duration of the segment.
        duration = len(audio_segment) / self.rate
        times = np.linspace(0, duration, len(audio_segment))

        # Update time-domain plot.
        self.line_time.set_data(times, audio_segment)

        # Auto-adjust axes if not zooming.
        toolbar = self.fig.canvas.manager.toolbar
        if toolbar is not None and toolbar.mode != "":
            self.is_zooming = True
        else:
            self.is_zooming = False
            self.ax_time.set_xlim(0, max(duration, 0.01))
            self.ax_time.set_ylim(
                np.min(audio_segment) - 500, np.max(audio_segment) + 500
            )

        # Compute FFT for the current window.
        yf = np.abs(rfft(audio_segment))
        xf = rfftfreq(len(audio_segment), d=1.0 / self.rate)

        # Truncate to self.MAX_FREQUENCY.
        mask = xf <= self.MAX_FREQUENCY
        xf = xf[mask]
        yf = yf[mask]

        self.line_freq.set_data(xf, yf)
        self.ax_freq.set_xlim(0, self.MAX_FREQUENCY)
        self.ax_freq.set_ylim(0, np.max(yf) * 1.1 if np.max(yf) > 0 else 1)

        self.fig.canvas.draw_idle()

    def on_xlim_changed(self, ax):
        """Callback al hacer zoom/pan en el dominio del tiempo."""
        # Si quieres recalcular la FFT en la porción visible, puedes hacerlo aquí.
        if self.is_zooming:
            # Implementa la lógica de re-FFT si deseas
            pass

    def on_close(self, event):
        """Al cerrar la ventana, asegurarse de liberar recursos."""
        self.timer.stop()
        self.stop_playback(None)  # Detener si está reproduciendo
        self.p.terminate()
        print("Cerrando AudioPlayer.")

    def run(self):
        """Inicia el loop de Matplotlib."""
        plt.show()
