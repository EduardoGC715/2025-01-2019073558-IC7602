import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button
from scipy.fft import rfft, rfftfreq
import queue
from tkinter import filedialog, messagebox
from comparator_visualizer import AudioComparatorVisualizer


class AudioComparatorRecorder:
    """Clase para grabar audio y visualizarlo en tiempo real.
    Utilizada para grabar la palabra que se va a comparar con el archivo .atm."""

    def __init__(self, recorder, filename=None):
        """Constructor recibe un objeto AudioRecorder para grabar audio y
        el nombre del archivo que se va a comparar."""
        self.MAX_FREQUENCY = 4000
        self.MAX_SECONDS = 2
        self.recorder = recorder
        self.filename = filename
        self.streaming = True

        self.fig, (self.ax_time, self.ax_freq) = plt.subplots(2, 1, figsize=(10, 8))
        self.fig.canvas.manager.set_window_title("Autrum - Comparador")

        plt.subplots_adjust(bottom=0.3, hspace=0.4)

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

        ax_start = plt.axes([0.05, 0.1, 0.10, 0.075])
        ax_pause = plt.axes([0.2, 0.1, 0.10, 0.075])
        ax_resume = plt.axes([0.35, 0.1, 0.10, 0.075])
        ax_stop = plt.axes([0.5, 0.1, 0.10, 0.075])

        # Agregar botón para exportar a Autrum
        self.btn_start = Button(ax_start, "Iniciar")
        self.btn_pause = Button(ax_pause, "Pausar")
        self.btn_resume = Button(ax_resume, "Reanudar")
        self.btn_stop = Button(ax_stop, "Detener y\n continuar")

        self.btn_start.on_clicked(self.start_recording)
        self.btn_pause.on_clicked(self.pause_recording)
        self.btn_resume.on_clicked(self.resume_recording)
        self.btn_stop.on_clicked(self.stop_recording)

        # Actualizar el gráfico cada 100 ms para mostrar la señal en tiempo real
        self.timer = self.fig.canvas.new_timer(interval=100)
        self.timer.add_callback(self.update_plot)
        self.timer.start()

        # Agregar callback para detectar zoom/pan en el eje de tiempo
        self.ax_time.callbacks.connect("xlim_changed", self.on_xlim_changed)

        # Cerrar recursos
        self.fig.canvas.mpl_connect("close_event", self.on_close)

        self.is_zooming = False

    def start_recording(self, event):
        """Inicia la grabación de audio."""
        self.recorder.start_recording()
        self.btn_start.label.set_text("Recording...")
        self.fig.canvas.draw_idle()

    def pause_recording(self, event):
        """Pausa la grabación de audio."""
        self.recorder.pause_recording()
        self.streaming = True
        self.btn_pause.label.set_text("Paused")
        self.fig.canvas.draw_idle()

    def resume_recording(self, event):
        """Reanuda la grabación de audio."""
        self.recorder.resume_recording()
        self.btn_pause.label.set_text("Pause")
        self.fig.canvas.draw_idle()

    def stop_recording(self, event):
        """Detiene la grabación de audio."""
        if len(self.recorder.frames) == 0:
            messagebox.showerror("Error", "No hay audio grabado para comparar.")
            return
        self.recorder.stop_recording()
        self.streaming = False
        plt.close(self.fig)
        visualizer = AudioComparatorVisualizer(self.filename, self.recorder)
        visualizer.run()

    def update_plot(self):
        """Actualiza el gráfico de audio en tiempo real."""
        new_chunks = []

        while not self.recorder.queue.empty():
            try:
                new_chunks.append(self.recorder.queue.get_nowait())
            except queue.Empty:
                break

        if len(new_chunks) == 0:
            return

        self.recorder.frames.extend(new_chunks)
        try:
            # Concatenar todas las tramas en un solo array.
            full_audio_array = np.concatenate(self.recorder.frames)

            # Calcular FFT para los datos de audio completos y guardarlos.
            full_num_frames = len(full_audio_array)
            y_frequency_full = np.abs(rfft(full_audio_array))
            x_frequency_full = rfftfreq(full_num_frames, d=1.0 / self.recorder.rate)
            self.recorder.fft_data = {
                "x_frequency": x_frequency_full.tolist(),
                "y_frequency": y_frequency_full.tolist(),
            }

            # Se limita a los últimos N samples para agilizar el rendimiento del gráfico.
            max_samples = int(self.recorder.rate * self.MAX_SECONDS)
            if (
                len(full_audio_array) > max_samples
            ):  # Si está grabando audio en tiempo real
                audio_array = full_audio_array[-max_samples:]
            else:
                audio_array = full_audio_array

            # Calcular la transformada de Fourier para la ventana de trazado (últimos 2 segundos)
            num_frames = len(audio_array)
            y_frequency = np.abs(rfft(audio_array))
            x_frequency = rfftfreq(num_frames, d=1.0 / self.recorder.rate)
        except Exception as e:
            print("Error concatenating frames:", e)
            audio_array = np.array([])

        if audio_array.size > 0:
            # Actualizar los datos de la señal de audio en el dominio del tiempo y la frecuencia
            # y actualizar los límites de los ejes.
            duration = len(audio_array) / self.recorder.rate
            times = np.linspace(0, duration, len(audio_array))
            self.line_time.set_data(times, audio_array)

            self.is_zooming = False
            self.ax_time.set_xlim(0, max(duration, 1))
            self.ax_time.set_ylim(np.min(audio_array) - 500, np.max(audio_array) + 500)

            self.line_freq.set_data(x_frequency, y_frequency)
            self.ax_freq.set_xlim(0, self.MAX_FREQUENCY)
            self.ax_freq.set_ylim(
                0, np.max(y_frequency) * 1.1 if np.max(y_frequency) > 0 else 1
            )

            self.fig.canvas.draw_idle()

    def on_xlim_changed(self, ax):
        """Callback que actualiza el gráfico de frecuencia cuando cambia el zoom en el dominio del tiempo.
        Esto es para que si se hace zoom en el gráfico de tiempo, se haga zoom en el gráfico de frecuencia también.
        """
        if (self.recorder.is_paused or not self.recorder.is_recording) and hasattr(
            self.recorder, "frames"
        ):
            try:
                # Concatenar el audio.
                full_audio_array = np.concatenate(self.recorder.frames)
                total_samples = len(full_audio_array)
                total_duration = total_samples / self.recorder.rate

                # Crear un array de tiempo completo.
                # Se usa para calcular el tiempo en segundos para cada muestra.
                times_full = np.linspace(0, total_duration, total_samples)

                # Obtener los límites del eje x del gráfico de tiempo.
                t_min, t_max = self.ax_time.get_xlim()

                # Encontrar los índices de los límites en el array de tiempo completo.
                # Esto es para que se pueda hacer zoom en el gráfico de frecuencia también.
                idx_min = np.searchsorted(times_full, t_min)
                idx_max = np.searchsorted(times_full, t_max)

                # Extraer la porción de audio magnificada
                zoom_audio = full_audio_array[idx_min:idx_max]
                if len(zoom_audio) == 0:
                    return
                # Calcular la FFT para la porción de audio magnificada.
                num_frames = len(zoom_audio)
                y_frequency = np.abs(rfft(zoom_audio))
                x_frequency = rfftfreq(num_frames, d=1.0 / self.recorder.rate)

                # Mantener las frecuencias dentro del rango permitido.
                mask = x_frequency <= self.MAX_FREQUENCY
                x_frequency = x_frequency[mask]
                y_frequency = y_frequency[mask]

                # Actualizar datos
                self.line_freq.set_data(x_frequency, y_frequency)
                self.ax_freq.set_xlim(0, self.recorder.rate / 2)
                self.ax_freq.set_ylim(
                    0, np.max(y_frequency) * 1.1 if np.max(y_frequency) > 0 else 1
                )
                self.fig.canvas.draw_idle()
            except Exception as e:
                print("Error updating frequency plot on zoom:", e)

    def on_close(self, event):
        """Cierra la ventana y detiene el AudioRecorder"""
        self.timer.stop()
        self.recorder.close()

    def run(self):
        """Despliega la ventana para grabar audio"""
        plt.show()
