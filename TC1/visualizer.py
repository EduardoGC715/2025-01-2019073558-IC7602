import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from scipy.fft import fft
import queue


class AudioVisualizer:
    def __init__(self, recorder):
        self.recorder = recorder

        plt.style.use("dark_background")
        self.fig, (self.ax1, self.ax2) = plt.subplots(2, 1, figsize=(10, 8))
        (self.line_time,) = self.ax1.plot([], [], lw=1)
        (self.line_freq,) = self.ax2.plot([], [], lw=1)

        self.ax1.set_title("Señal en Tiempo Real")
        self.ax1.set_xlabel("Tiempo")
        self.ax1.set_ylabel("Amplitud")

        self.ax2.set_title("Espectro de Frecuencia")
        self.ax2.set_xlabel("Frecuencia (Hz)")
        self.ax2.set_ylabel("Magnitud")

        self.fig.canvas.mpl_connect("key_press_event", self.on_key)

    def on_key(self, event):
        if event.key == "a":
            self.recorder.start_recording()
        elif event.key == "p":
            self.recorder.pause_recording()
        elif event.key == "r":
            self.recorder.resume_recording()
        elif event.key == "x":
            self.recorder.stop_recording()
        elif event.key == "w":
            self.recorder.save_recording("grabacion.wav")

    def update_plot(self, frame):
        try:
            data = self.recorder.q.get_nowait()

            # Ensure data is in the correct format for plotting
            if isinstance(data, np.ndarray):
                x_time = np.arange(len(data)) / self.recorder.rate
                self.ax1.set_xlim(0, len(data) / self.recorder.rate)
                self.ax1.set_ylim(-1, 1)
                self.line_time.set_data(x_time, data)

                fft_data = fft(data)
                freq = np.fft.fftfreq(len(data), 1 / self.recorder.rate)
                self.ax2.set_xlim(0, self.recorder.rate / 2)
                self.ax2.set_ylim(0, np.abs(fft_data).max())
                self.line_freq.set_data(
                    freq[: len(freq) // 2], np.abs(fft_data)[: len(freq) // 2]
                )

        except queue.Empty:
            pass
        return self.line_time, self.line_freq

    def run(self):
        ani = FuncAnimation(
            self.fig, self.update_plot, interval=20, blit=True, cache_frame_data=False
        )
        plt.show()
