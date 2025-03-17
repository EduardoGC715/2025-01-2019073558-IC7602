import numpy as np
import sounddevice as sd
import wave
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from scipy.fft import fft
import threading
import queue
import pickle
import sys
import keyboard


class Autrum:
    def __init__(self):
        self.CHUNK = 1024
        self.CHANNELS = 1
        self.RATE = 44100
        self.frames = []
        self.is_recording = False
        self.is_paused = False
        self.stream = None
        self.q = queue.Queue()

        # Visualization setup
        plt.style.use("dark_background")
        self.fig, (self.ax1, self.ax2) = plt.subplots(2, 1, figsize=(10, 8))
        (self.line_time,) = self.ax1.plot([], [], lw=1)
        (self.line_freq,) = self.ax2.plot([], [], lw=1)

        # Axis setup
        self.ax1.set_title("Señal en Tiempo Real")
        self.ax1.set_xlabel("Tiempo")
        self.ax1.set_ylabel("Amplitud")
        self.ax2.set_title("Espectro de Frecuencia")
        self.ax2.set_xlabel("Frecuencia (Hz)")
        self.ax2.set_ylabel("Magnitud")

        # Keyboard control
        self.fig.canvas.mpl_connect("key_press_event", self.on_key)

    def on_key(self, event):
        """Handles key press events in the Matplotlib figure."""
        if event.key == "s":
            self.start_recording()
        elif event.key == "p":
            self.pause_recording()
        elif event.key == "r":
            self.resume_recording()
        elif event.key == "x":
            self.stop_recording()
        elif event.key == "w":
            self.save_atm("recording.atm")

    def audio_callback(self, indata, frames, time, status):
        """Handles incoming audio"""
        if status:
            print(f"Sounddevice Warning: {status}", file=sys.stderr)
        if not self.is_paused and self.is_recording:
            try:
                data = indata[:, 0]  # Take first channel
                self.frames.append(data.copy())
                self.q.put_nowait(data)
            except queue.Full:
                pass  # Avoid blocking if queue is full

    def start_recording(self):
        """Start recording"""
        if self.is_recording:
            print("Recording is already running.")
            return

        self.is_recording = True
        self.is_paused = False
        try:
            self.stream = sd.InputStream(
                channels=self.CHANNELS,
                samplerate=self.RATE,
                blocksize=self.CHUNK,
                callback=self.audio_callback,
            )
            self.stream.start()
            print("Recording started.")
        except Exception as e:
            print(f"Error starting recording: {e}")

    def stop_recording(self):
        """Stop recording"""
        self.is_recording = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        print("Recording stopped.")

    def pause_recording(self):
        """Pause recording"""
        self.is_paused = True
        print("Recording paused.")

    def resume_recording(self):
        """Resume recording"""
        self.is_paused = False
        print("Recording resumed.")

    def update_plot(self, frame):
        """Update real-time plots"""
        try:
            data = self.q.get_nowait()

            # Update time-domain plot
            x_time = np.arange(len(data)) / self.RATE
            self.ax1.set_xlim(0, len(data) / self.RATE)
            self.ax1.set_ylim(-1, 1)
            self.line_time.set_data(x_time, data)

            # Compute and update FFT
            fft_data = fft(data)
            freq = np.fft.fftfreq(len(data), 1 / self.RATE)
            self.ax2.set_xlim(0, self.RATE / 2)
            self.ax2.set_ylim(0, np.abs(fft_data).max())
            self.line_freq.set_data(
                freq[: len(freq) // 2], np.abs(fft_data)[: len(freq) // 2]
            )

        except queue.Empty:
            pass  # Avoid blocking if queue is empty
        return self.line_time, self.line_freq

    def save_atm(self, filename):
        """Save data to .atm file"""
        try:
            data = {
                "audio": np.concatenate(self.frames),
                "sample_rate": self.RATE,
                "fft_data": [np.abs(fft(frame)) for frame in self.frames],
            }
            with open(filename, "wb") as f:
                pickle.dump(data, f)
            print(f"Data saved to {filename}")
        except Exception as e:
            print(f"Error saving file: {e}")

    def listen_keyboard(self):
        """Listen for key presses in the terminal"""
        print(
            "\nPress 's' to Start, 'p' to Pause, 'r' to Resume, 'x' to Stop, 'w' to Save"
        )
        while True:
            key = keyboard.read_event().name
            if key == "s":
                self.start_recording()
            elif key == "p":
                self.pause_recording()
            elif key == "r":
                self.resume_recording()
            elif key == "x":
                self.stop_recording()
            elif key == "w":
                self.save_atm("recording.atm")

    def run_analyzer(self):
        """Run real-time analyzer"""
        ani = FuncAnimation(
            self.fig, self.update_plot, interval=20, blit=True, cache_frame_data=False
        )
        plt.show()


if __name__ == "__main__":
    autrum = Autrum()
    threading.Thread(target=autrum.listen_keyboard, daemon=True).start()

    # Run the analyzer in the main thread
    autrum.run_analyzer()
