import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button
from scipy.fft import rfft, rfftfreq
import queue
from tkinter import filedialog, messagebox


class AudioAnalyzer:
    def __init__(self, recorder, streaming, filename=None):
        self.MAX_FREQUENCY = 4000
        self.MAX_SECONDS = 2
        self.recorder = recorder
        self.streaming = streaming
        self.filename = filename

        # Create a figure with adjusted bottom for button space.
        self.fig, (self.ax_time, self.ax_freq) = plt.subplots(2, 1, figsize=(10, 8))
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

        if streaming:
            # Create button axes in the lower part of the figure.
            ax_start = plt.axes([0.05, 0.1, 0.10, 0.075])
            ax_pause = plt.axes([0.2, 0.1, 0.10, 0.075])
            ax_resume = plt.axes([0.35, 0.1, 0.10, 0.075])
            ax_stop = plt.axes([0.5, 0.1, 0.10, 0.075])
            ax_save = plt.axes([0.65, 0.1, 0.1, 0.075])  # Adjust position as needed

            self.btn_start = Button(ax_start, "Iniciar")
            self.btn_pause = Button(ax_pause, "Pausar")
            self.btn_resume = Button(ax_resume, "Reanudar")
            self.btn_stop = Button(ax_stop, "Detener")
            self.btn_save = Button(ax_save, "Guardar")
            # Connect buttons to callback functions.
            self.btn_start.on_clicked(self.start_recording)
            self.btn_pause.on_clicked(self.pause_recording)
            self.btn_resume.on_clicked(self.resume_recording)
            self.btn_stop.on_clicked(self.stop_recording)
            self.btn_save.on_clicked(self.save_recording)
        else:
            self.recorder.load_audio_file(filename)

        ax_export = plt.axes([0.8, 0.1, 0.1, 0.075])
        self.btn_export = Button(ax_export, "Exportar")
        self.btn_export.on_clicked(self.export_data)

        # Use a Matplotlib timer to update the plot regularly.
        self.timer = self.fig.canvas.new_timer(interval=100)
        self.timer.add_callback(self.update_plot)
        self.timer.start()

        # Connect the time domain plot to the frequency domain plot.
        self.ax_time.callbacks.connect("xlim_changed", self.on_xlim_changed)

        # Ensure we close resources when the figure is closed.
        self.fig.canvas.mpl_connect("close_event", self.on_close)

        self.is_zooming = False

    def start_recording(self, event):
        self.recorder.start_recording()
        self.btn_start.label.set_text("Recording...")
        self.fig.canvas.draw_idle()

    def pause_recording(self, event):
        self.recorder.pause_recording()
        self.btn_pause.label.set_text("Paused")
        self.fig.canvas.draw_idle()

    def resume_recording(self, event):
        self.recorder.resume_recording()
        self.btn_pause.label.set_text("Pause")
        self.fig.canvas.draw_idle()

    def stop_recording(self, event):
        self.recorder.stop_recording()
        self.btn_start.label.set_text("Start")
        self.fig.canvas.draw_idle()

    def save_recording(self, event):
        if self.recorder.frames:
            self.recorder.save_recording()
        else:
            messagebox.showerror("Guardar grabación", "No hay datos para guardar.")

    def export_data(self, event):
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
            print("No chunks to process.")
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
        print(self.is_zooming)
        if self.recorder.is_paused or not self.recorder.is_recording:
            print("HERE")
            try:
                # Concatenate full audio data.
                full_audio_array = np.concatenate(self.recorder.frames)
                total_samples = len(full_audio_array)
                total_duration = total_samples / self.recorder.rate

                # Create a time vector for the full audio.
                times_full = np.linspace(0, total_duration, total_samples)

                # Get the current x-axis limits (in seconds) from the time plot.
                t_min, t_max = self.ax_time.get_xlim()

                # Find the indices in the full time array corresponding to the limits.
                idx_min = np.searchsorted(times_full, t_min)
                idx_max = np.searchsorted(times_full, t_max)

                # Extract the zoomed portion of the audio.
                zoom_audio = full_audio_array[idx_min:idx_max]
                if len(zoom_audio) == 0:
                    return
                print("HERE 2.5")
                # Compute FFT for the zoomed portion.
                num_frames = len(zoom_audio)
                y_frequency = np.abs(rfft(zoom_audio))
                x_frequency = rfftfreq(num_frames, d=1.0 / self.recorder.rate)

                # Truncate frequencies to self.MAX_FREQUENCY
                mask = x_frequency <= self.MAX_FREQUENCY
                x_frequency = x_frequency[mask]
                y_frequency = y_frequency[mask]
                print("HERE 3")
                # Update the frequency domain plot.
                self.line_freq.set_data(x_frequency, y_frequency)
                # You might want to update the limits accordingly.
                self.ax_freq.set_xlim(0, self.recorder.rate / 2)
                self.ax_freq.set_ylim(
                    0, np.max(y_frequency) * 1.1 if np.max(y_frequency) > 0 else 1
                )
                print("HERE 4")
                self.fig.canvas.draw_idle()
            except Exception as e:
                print("Error updating frequency plot on zoom:", e)

    def on_close(self, event):
        self.timer.stop()
        self.recorder.close()

    def run(self):
        plt.show()
