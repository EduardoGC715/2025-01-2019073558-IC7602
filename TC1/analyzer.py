import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button
from scipy.fft import rfft, rfftfreq
import queue
from tkinter import filedialog, messagebox


class AudioAnalyzer:
    """Clase para analizar audio en tiempo real o desde un archivo .atm.
    Permite visualizar la señal en el dominio del tiempo y la frecuencia."""

    def __init__(self, recorder, streaming, filename=None):
        """Constructor que recibe un objeto AudioRecorder para grabar audio,
        una bandera de si va a grabar en tiempo real (streaming) o no (batch),
        y el nombre del archivo que se va a cargar si es de tipo batch."""
        self.MAX_FREQUENCY = 4000
        self.MAX_SECONDS = 2
        self.recorder = recorder
        self.streaming = streaming
        self.filename = filename

        # Figura para los gráfics de dominio de tiempo y frecuencia
        self.fig, (self.ax_time, self.ax_freq) = plt.subplots(2, 1, figsize=(10, 8))
        self.fig.canvas.manager.set_window_title("Autrum - Analizador")

        plt.subplots_adjust(bottom=0.3, hspace=0.4)

        # Dominio de tiempo
        self.ax_time.set_title("Real-time Audio Signal (Time Domain)")
        self.ax_time.set_xlabel("Time (s)")
        self.ax_time.set_ylabel("Amplitude")
        (self.line_time,) = self.ax_time.plot([], [])

        # Dominio de frecuencia
        self.ax_freq.set_title("Real-time Audio Signal (Frequency Domain)")
        self.ax_freq.set_xlabel("Frequency (Hz)")
        self.ax_freq.set_ylabel("Magnitude")
        (self.line_freq,) = self.ax_freq.plot([], [])

        if streaming:
            # Agregar botones para iniciar, pausar, reanudar y detener la grabación
            ax_start = plt.axes([0.05, 0.1, 0.10, 0.075])
            ax_pause = plt.axes([0.2, 0.1, 0.10, 0.075])
            ax_resume = plt.axes([0.35, 0.1, 0.10, 0.075])
            ax_stop = plt.axes([0.5, 0.1, 0.10, 0.075])
            ax_save = plt.axes([0.65, 0.1, 0.1, 0.075])

            self.btn_start = Button(ax_start, "Iniciar")
            self.btn_pause = Button(ax_pause, "Pausar")
            self.btn_resume = Button(ax_resume, "Reanudar")
            self.btn_stop = Button(ax_stop, "Detener")
            self.btn_save = Button(ax_save, "Guardar")

            # Enlazar botones a funciones
            self.btn_start.on_clicked(self.start_recording)
            self.btn_pause.on_clicked(self.pause_recording)
            self.btn_resume.on_clicked(self.resume_recording)
            self.btn_stop.on_clicked(self.stop_recording)
            self.btn_save.on_clicked(self.save_recording)
        else:
            self.recorder.load_audio_file(filename)

        # Agregar botón para exportar a Autrum
        ax_export = plt.axes([0.8, 0.1, 0.1, 0.075])
        self.btn_export = Button(ax_export, "Exportar")
        self.btn_export.on_clicked(self.export_data)

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
        self.btn_pause.label.set_text("Paused")
        self.fig.canvas.draw_idle()

    def resume_recording(self, event):
        """Reanuda la grabación de audio."""
        self.recorder.resume_recording()
        self.btn_pause.label.set_text("Pause")
        self.fig.canvas.draw_idle()

    def stop_recording(self, event):
        """Detiene la grabación de audio."""
        self.recorder.stop_recording()
        self.btn_start.label.set_text("Start")
        self.fig.canvas.draw_idle()

    def save_recording(self, event):
        """Guarda la grabación de audio en un archivo WAV."""
        if self.recorder.frames:
            self.recorder.save_recording()
        else:
            messagebox.showerror("Guardar grabación", "No hay datos para guardar.")

    def export_data(self, event):
        """Exporta los datos de audio a un archivo Autrum.
        Solicita el nombre del archivo y ejecuta la función del objeto AudioRecorder"""
        if (
            not self.recorder.is_recording
            and len(self.recorder.frames) > 0
            and len(self.recorder.fft_data) > 0
        ):
            filename = filedialog.asksaveasfilename(
                title="Exportar datos de Autrum",
                defaultextension=".atm",
                filetypes=[("Autrum Files", "*.atm")],
            )
            self.recorder.export_autrum(filename)
        else:
            messagebox.showerror(
                "Exportar datos de Autrum",
                "No hay datos para exportar. Por favor, detenga la grabación y espere a que se procese.",
            )

    def update_plot(self):
        """Actualiza el gráfico de audio en tiempo real."""
        new_chunks = []

        while not self.recorder.queue.empty():
            try:
                new_chunks.append(self.recorder.queue.get_nowait())
            except queue.Empty:
                break

        if len(new_chunks) == 0:
            # Si no hay nuevos chunks de datos para procesar en la cola, no actualiza el gráfico.
            print("No chunks to process.")
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
                self.streaming and len(full_audio_array) > max_samples
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
        if self.recorder.is_paused or not self.recorder.is_recording:
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
        self.timer.stop()
        self.recorder.close()

    def run(self):
        plt.show()
