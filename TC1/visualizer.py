import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button
from scipy.fft import rfft, rfftfreq
import queue


class AudioVisualizer:
    def __init__(self, recorder):
        self.recorder = recorder
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

        # Create button axes in the lower part of the figure.
        ax_start = plt.axes([0.1, 0.1, 0.15, 0.075])
        ax_pause = plt.axes([0.3, 0.1, 0.15, 0.075])
        ax_resume = plt.axes([0.5, 0.1, 0.15, 0.075])
        ax_stop = plt.axes([0.7, 0.1, 0.15, 0.075])
        ax_save = plt.axes([0.85, 0.1, 0.1, 0.075])  # Adjust position as needed

        self.btn_start = Button(ax_start, "Start")
        self.btn_pause = Button(ax_pause, "Pause")
        self.btn_resume = Button(ax_resume, "Resume")
        self.btn_stop = Button(ax_stop, "Stop")
        self.btn_save = Button(ax_save, "Save")
        # Connect buttons to callback functions.
        self.btn_start.on_clicked(self.start_recording)
        self.btn_pause.on_clicked(self.pause_recording)
        self.btn_resume.on_clicked(self.resume_recording)
        self.btn_stop.on_clicked(self.stop_recording)
        self.btn_save.on_clicked(self.save_recording)

        # Use a Matplotlib timer to update the plot regularly.
        self.timer = self.fig.canvas.new_timer(interval=100)
        self.timer.add_callback(self.update_plot)
        self.timer.start()

        # Ensure we close resources when the figure is closed.
        self.fig.canvas.mpl_connect("close_event", self.on_close)

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
            print("No recording to save.")

    def update_plot(self):
        if self.recorder.frames:
            try:
                # Concatenate frames into one long array.
                audio_array = np.concatenate(self.recorder.frames)

                # Limit to last N samples (e.g. last 2 seconds)
                max_samples = int(self.recorder.rate * 2)
                if len(audio_array) > max_samples:
                    audio_array = audio_array[-max_samples:]
            except Exception as e:
                print("Error concatenating frames:", e)
                audio_array = np.array([])
            if audio_array.size > 0:
                duration = len(audio_array) / self.recorder.rate
                times = np.linspace(0, duration, len(audio_array))
                self.line_time.set_data(times, audio_array)

                # Compute FFT using scipy.fft (for real signals)
                N = len(audio_array)
                yf = np.abs(rfft(audio_array))
                xf = rfftfreq(N, d=1.0 / self.recorder.rate)

                # Only update the axes limits if the user is not zooming or panning.
                toolbar = self.fig.canvas.manager.toolbar
                if toolbar is not None and toolbar.mode != "":
                    # If zoom/pan is active, pause the recording if not already paused.
                    if not self.recorder.is_paused:
                        self.recorder.pause_recording()
                        self.btn_pause.label.set_text("Paused")
                        self.fig.canvas.draw_idle()
                else:
                    self.ax_time.set_xlim(0, max(duration, 1))
                    self.ax_time.set_ylim(
                        np.min(audio_array) - 500, np.max(audio_array) + 500
                    )

                    self.line_freq.set_data(xf, yf)
                    self.ax_freq.set_xlim(0, 4000)
                    self.ax_freq.set_ylim(0, np.max(yf) * 1.1 if np.max(yf) > 0 else 1)

                self.fig.canvas.draw_idle()

    def on_close(self, event):
        self.recorder.close()

    def run(self):
        plt.show()
