import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Button
from scipy.fft import fft
import queue


class AudioVisualizer:
    def __init__(self, recorder):
        self.recorder = recorder
        # Create a figure with adjusted bottom for button space.
        self.fig, self.ax = plt.subplots(figsize=(10, 5))
        plt.subplots_adjust(bottom=0.3)
        self.ax.set_title("Real-time Audio Signal")
        self.ax.set_xlabel("Time (s)")
        self.ax.set_ylabel("Amplitude")
        (self.line,) = self.ax.plot([], [])

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
            except Exception as e:
                print("Error concatenating frames:", e)
                audio_array = np.array([])
            if audio_array.size > 0:
                duration = len(audio_array) / self.recorder.rate
                times = np.linspace(0, duration, len(audio_array))
                self.line.set_data(times, audio_array)
                # Only update the axes limits if the user is not zooming or panning.
                toolbar = self.fig.canvas.manager.toolbar
                if toolbar is not None and toolbar.mode != "":
                    # If zoom/pan is active, pause the recording if not already paused.
                    if not self.recorder.is_paused:
                        self.recorder.pause_recording()
                        self.btn_pause.label.set_text("Paused")
                        self.fig.canvas.draw_idle()
                else:
                    self.ax.set_xlim(0, max(duration, 1))
                    self.ax.set_ylim(
                        np.min(audio_array) - 500, np.max(audio_array) + 500
                    )
                self.fig.canvas.draw_idle()

    def on_close(self, event):
        self.recorder.close()

    def run(self):
        plt.show()
