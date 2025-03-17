import pickle
import numpy as np
import matplotlib.pyplot as plt


def load_atm(filename):
    try:
        with open(filename, "rb") as f:
            data = pickle.load(f)

        # Extract stored data
        audio = data["audio"]
        sample_rate = data["sample_rate"]
        fft_data = data["fft_data"]

        print(f"Sample rate: {sample_rate} Hz")
        print(f"Audio length: {len(audio) / sample_rate:.2f} seconds")

        # Plot the audio waveform
        plt.figure(figsize=(10, 5))
        time_axis = np.arange(len(audio)) / sample_rate
        plt.plot(time_axis, audio, label="Audio Signal")
        plt.xlabel("Time (s)")
        plt.ylabel("Amplitude")
        plt.title("Waveform from ATM File")
        plt.legend()
        plt.show()

        # Plot the frequency spectrum
        plt.figure(figsize=(10, 5))
        freq = np.fft.fftfreq(len(audio), 1 / sample_rate)
        plt.plot(freq[: len(freq) // 2], np.abs(fft_data[0])[: len(freq) // 2])
        plt.xlabel("Frequency (Hz)")
        plt.ylabel("Magnitude")
        plt.title("Frequency Spectrum")
        plt.show()

    except Exception as e:
        print(f"Error loading ATM file: {e}")


# Usage
load_atm("recording.atm")
