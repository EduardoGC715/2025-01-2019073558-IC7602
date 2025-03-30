import matplotlib.pyplot as plt
from matplotlib.widgets import Button
import numpy as np
import pyaudio
import pickle
import threading
import time
from scipy.fft import rfft, rfftfreq


class AudioPlayer:
    def __init__(self, atm_file):
        """
        Carga datos desde un archivo .atm y configura la interfaz para reproducir audio
        y visualizar su forma de onda y espectro de frecuencia.
        """
        # Cargar archivo Autrum
        with open(atm_file, "rb") as f:
            data = pickle.load(f)

        # Extraer parámetros de audio y frames
        self.rate = data["rate"]
        self.channels = data["channels"]
        self.sample_width = data["sample_width"]
        self.frames = data["frames"]
        # Concatenar en un solo array para la reproducción
        self.audio_array = (
            np.concatenate(self.frames) if self.frames else np.array([], dtype=np.int16)
        )

        # FFT data guardada
        self.fft_data = data.get("fft_data", {})
        if self.fft_data:
            self.fft_data["x_frequency"] = np.array(self.fft_data["x_frequency"])
            self.fft_data["y_frequency"] = np.array(self.fft_data["y_frequency"])

        # Parámetros para reproducción
        self.is_playing = False
        self.is_paused = False
        self.current_pos = 0  # Índice de muestra actual
        self.chunk = 1024  # Tamaño de bloque de reproducción
        self.play_thread = None  # Hilo de reproducción

        # Configuración para la visualización
        self.MAX_FREQUENCY = 4000  # Límite de frecuencia a mostrar
        self.MAX_SECONDS = 2  # Mostrar últimos 2 segundos en el gráfico

        # Crear figura y ejes de Matplotlib
        self.fig, (self.ax_time, self.ax_freq) = plt.subplots(2, 1, figsize=(10, 8))
        plt.subplots_adjust(bottom=0.3, hspace=0.4)
        self.fig.canvas.manager.set_window_title("Autrum - Reproductor de Audio")

        # Dominio de tiempo
        self.ax_time.set_title("Audio en tiempo real (Dominio del Tiempo)")
        self.ax_time.set_xlabel("Tiempo (s)")
        self.ax_time.set_ylabel("Amplitud")
        (self.line_time,) = self.ax_time.plot([], [])

        # Dominio de frecuencia
        self.ax_freq.set_title("Audio en tiempo real (Dominio de Frecuencia)")
        self.ax_freq.set_xlabel("Frecuencia (Hz)")
        self.ax_freq.set_ylabel("Magnitud")
        (self.line_freq,) = self.ax_freq.plot([], [])

        # Botones de control
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

        # Detectar zoom/pan en el eje de tiempo
        self.ax_time.callbacks.connect("xlim_changed", self.on_xlim_changed)
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
            toolbar = self.fig.canvas.manager.toolbar
            if toolbar is not None:
                toolbar.mode = ""
            self.timer.start()
            print("Reproducción reanudada.")

    def stop_playback(self, event):
        """Detiene la reproducción por completo."""
        if self.is_playing:
            self.is_playing = False
            self.timer.stop()
            print("Reproducción detenida.")

    def update_plot(self):
        """Actualiza los gráficos de tiempo y frecuencia."""
        if self.audio_array.size == 0 and self.is_paused:
            return

        # No actualizar si ya terminó
        if not self.is_playing and self.current_pos >= len(self.audio_array):
            self.timer.stop()
            return

        # Determinar posición actual
        current_pos = self.current_pos

        # Fragmento del audio que se despliega
        audio_segment = self.audio_array[:current_pos]

        if audio_segment.size == 0:
            self.fig.canvas.draw_idle()
            return

        duration = len(audio_segment) / self.rate
        times = np.linspace(0, duration, len(audio_segment))

        self.line_time.set_data(times, audio_segment)

        # Ajustar límites del eje de tiempo si está en modo zoom
        toolbar = self.fig.canvas.manager.toolbar
        if toolbar is not None and toolbar.mode != "":
            self.is_paused = True
        else:
            self.ax_time.set_xlim(0, max(duration, 0.01))
            self.ax_time.set_ylim(
                np.min(audio_segment) - 500, np.max(audio_segment) + 500
            )

        # Calcular fft para el segmento de audio
        yf = np.abs(rfft(audio_segment))
        xf = rfftfreq(len(audio_segment), d=1.0 / self.rate)

        # Truncar hasta MAX_FREQUENCY.
        mask = xf <= self.MAX_FREQUENCY
        xf = xf[mask]
        yf = yf[mask]

        self.line_freq.set_data(xf, yf)
        self.ax_freq.set_xlim(0, self.MAX_FREQUENCY)
        self.ax_freq.set_ylim(0, np.max(yf) * 1.1 if np.max(yf) > 0 else 1)

        self.fig.canvas.draw_idle()

    def on_xlim_changed(self, ax):
        """Callback que actualiza el gráfico de frecuencia cuando cambia el zoom en el dominio del tiempo.
        Esto es para que si se hace zoom en el gráfico de tiempo, se haga zoom en el gráfico de frecuencia también.
        """
        if self.is_paused or not self.is_playing:
            # Límites de tiempo actuales
            t_min, t_max = self.ax_time.get_xlim()

            total_samples = len(self.audio_array)
            total_duration = total_samples / self.rate

            times_full = np.linspace(0, total_duration, total_samples)

            idx_min = np.searchsorted(times_full, t_min)
            idx_max = np.searchsorted(times_full, t_max)

            zoom_audio = self.audio_array[idx_min:idx_max]
            if zoom_audio.size == 0:
                return

            num_frames = len(zoom_audio)
            y_frequency = np.abs(rfft(zoom_audio))
            x_frequency = rfftfreq(num_frames, d=1.0 / self.rate)
            # Truncar hasta MAX_FREQUENCY.
            mask = x_frequency <= self.MAX_FREQUENCY
            x_frequency = x_frequency[mask]
            y_frequency = y_frequency[mask]

            self.line_freq.set_data(x_frequency, y_frequency)
            self.ax_freq.set_xlim(0, self.MAX_FREQUENCY)
            self.ax_freq.set_ylim(
                0, np.max(y_frequency) * 1.1 if np.max(y_frequency) > 0 else 1
            )

            self.fig.canvas.draw_idle()

    def on_close(self, event):
        """Al cerrar la ventana, asegurarse de liberar recursos."""
        self.timer.stop()
        self.stop_playback(None)  # Detener si está reproduciendo
        self.p.terminate()
        print("Cerrando AudioPlayer.")

    def run(self):
        """Inicia el loop de Matplotlib."""
        plt.show()
