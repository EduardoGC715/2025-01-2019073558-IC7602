import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button
from scipy.fft import rfft, rfftfreq
import queue
from tkinter import filedialog, messagebox
from comparator_visualizer import AudioComparatorVisualizer


class AudioComparatorRecorder:
    def __init__(self, recorder, filename=None):
        self.MAX_FREQUENCY = 4000
        self.MAX_SECONDS = 2
        self.recorder = recorder
        self.filename = filename
        self.streaming = True

        self.fig, (self.ax_time, self.ax_freq) = plt.subplots(2, 1, figsize=(10, 8))
        self.fig.canvas.manager.set_window_title("Autrum - Analizador")

        plt.subplots_adjust(bottom=0.3, hspace=0.4)

        # Time domain plot
        self.ax_time.set_title("Real-time Audio Signal (Time Domain)")
        self.ax_time.set_xlabel("Time (s)")
        self.ax_time.set_ylabel("Amplitude")
        (self.line_time,) = self.ax_time.plot([], [])

        # Frequency domain plot
        self.ax_freq.set_title("Real-time Audio Signal (Frequency Domain)")
        self.ax_freq.set_xlabel("Frequency (Hz)")
        self.ax_freq.set_ylabel("Magnitude")
        (self.line_freq,) = self.ax_freq.plot([], [])

        ax_start = plt.axes([0.05, 0.1, 0.10, 0.075])
        ax_pause = plt.axes([0.2, 0.1, 0.10, 0.075])
        ax_resume = plt.axes([0.35, 0.1, 0.10, 0.075])
        ax_stop = plt.axes([0.5, 0.1, 0.10, 0.075])

        self.btn_start = Button(ax_start, "Iniciar")
        self.btn_pause = Button(ax_pause, "Pausar")
        self.btn_resume = Button(ax_resume, "Reanudar")
        self.btn_stop = Button(ax_stop, "Detener y continuar")

        self.btn_start.on_clicked(self.start_recording)
        self.btn_pause.on_clicked(self.pause_recording)
        self.btn_resume.on_clicked(self.resume_recording)
        self.btn_stop.on_clicked(self.stop_recording)

        self.timer = self.fig.canvas.new_timer(interval=100)
        self.timer.add_callback(self.update_plot)
        self.timer.start()

        self.ax_time.callbacks.connect("xlim_changed", self.on_xlim_changed)

        self.fig.canvas.mpl_connect("close_event", self.on_close)

        self.is_zooming = False

    def start_recording(self, event):
        self.recorder.start_recording()
        self.btn_start.label.set_text("Recording...")
        self.fig.canvas.draw_idle()

    def pause_recording(self, event):
        self.recorder.pause_recording()
        self.streaming = True
        self.btn_pause.label.set_text("Paused")
        self.fig.canvas.draw_idle()

    def resume_recording(self, event):
        self.recorder.resume_recording()
        self.btn_pause.label.set_text("Pause")
        self.fig.canvas.draw_idle()

    def stop_recording(self, event):
        self.recorder.stop_recording()
        self.streaming = False
        plt.close(self.fig)
        visualizer = AudioComparatorVisualizer(self.filename, self.recorder)
        visualizer.run()

    def update_plot(self):
        new_chunks = []

        while not self.recorder.queue.empty():
            try:
                new_chunks.append(self.recorder.queue.get_nowait())
            except queue.Empty:
                break

        if len(new_chunks) == 0:
            # Only update the axes limits if the user is not zooming or panning.
            # toolbar = self.fig.canvas.manager.toolbar
            # if toolbar is not None and toolbar.mode != "":
            #     # If zoom/pan is active, pause the recording if not already paused.
            #     self.is_zooming = True
            #     if not self.recorder.is_paused:
            #         self.recorder.pause_recording()
            #         if self.streaming:
            #             self.btn_pause.label.set_text("Paused")
            #         self.fig.canvas.draw_idle()
            return

        self.recorder.frames.extend(new_chunks)
        try:
            # Concatenate all frames into one full array.
            full_audio_array = np.concatenate(self.recorder.frames)

            # Compute FFT for the full audio data and save it.
            full_num_frames = len(full_audio_array)
            y_frequency_full = np.abs(rfft(full_audio_array))
            x_frequency_full = rfftfreq(full_num_frames, d=1.0 / self.recorder.rate)
            self.recorder.fft_data = {
                "x_frequency": x_frequency_full.tolist(),
                "y_frequency": y_frequency_full.tolist(),
            }

            # Limit to last N samples (e.g., last 2 seconds) for plotting.
            max_samples = int(self.recorder.rate * self.MAX_SECONDS)
            if (
                self.streaming and len(full_audio_array) > max_samples
            ):  # If recording audio in real-time
                audio_array = full_audio_array[-max_samples:]
            else:
                audio_array = full_audio_array

            # Compute FFT for the plotting window (last 2 seconds)
            num_frames = len(audio_array)
            y_frequency = np.abs(rfft(audio_array))
            x_frequency = rfftfreq(num_frames, d=1.0 / self.recorder.rate)
        except Exception as e:
            print("Error concatenating frames:", e)
            audio_array = np.array([])

        if audio_array.size > 0:
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
        """Callback that updates the frequency plot when time-domain zoom changes."""
        if (self.recorder.is_paused or not self.recorder.is_recording) and hasattr(self.recorder, 'frames'):
            try:
                # Verificar que haya frames para concatenar
                if not self.recorder.frames:
                    return
                    
                # Concatenate full audio data.
                full_audio_array = np.concatenate(self.recorder.frames)
                total_samples = len(full_audio_array)
                
                if total_samples == 0:
                    print("Array de audio vacío después de concatenar")
                    return
                    
                total_duration = total_samples / self.recorder.rate

                # Create a time vector for the full audio.
                times_full = np.linspace(0, total_duration, total_samples)

                # Get the current x-axis limits (in seconds) from the time plot.
                t_min, t_max = self.ax_time.get_xlim()

                # Verificar que los límites sean válidos
                if t_min >= total_duration or t_max <= 0:
                    print("Límites de tiempo fuera del rango de audio")
                    return

                # Ajustar los límites para que estén dentro del rango válido
                t_min = max(0, t_min)
                t_max = min(total_duration, t_max)

                # Find the indices in the full time array corresponding to the limits.
                idx_min = max(0, np.searchsorted(times_full, t_min))
                idx_max = min(total_samples, np.searchsorted(times_full, t_max))

                # Verificar que el rango sea válido
                if idx_min >= idx_max:
                    print("Rango de índices inválido:", idx_min, idx_max)
                    return

                # Extract the zoomed portion of the audio.
                zoom_audio = full_audio_array[idx_min:idx_max]
                if len(zoom_audio) == 0:
                    print("Array de zoom vacío")
                    return

                # Compute FFT for the zoomed portion.
                num_frames = len(zoom_audio)
                y_frequency = np.abs(rfft(zoom_audio))
                x_frequency = rfftfreq(num_frames, d=1.0 / self.recorder.rate)

                # Truncate frequencies to self.MAX_FREQUENCY
                mask = x_frequency <= self.MAX_FREQUENCY
                x_frequency = x_frequency[mask]
                y_frequency = y_frequency[mask]

                # Update the frequency domain plot.
                self.line_freq.set_data(x_frequency, y_frequency)
                
                # You might want to update the limits accordingly.
                self.ax_freq.set_xlim(0, min(self.MAX_FREQUENCY, self.recorder.rate / 2))
                
                if len(y_frequency) > 0 and np.max(y_frequency) > 0:
                    self.ax_freq.set_ylim(0, np.max(y_frequency) * 1.1)
                else:
                    self.ax_freq.set_ylim(0, 1)

                self.fig.canvas.draw_idle()
            except Exception as e:
                print("Error updating frequency plot on zoom:", e)
                import traceback
                traceback.print_exc()

    def on_close(self, event):
        self.timer.stop()
        self.recorder.close()

    def run(self):
        plt.show()
