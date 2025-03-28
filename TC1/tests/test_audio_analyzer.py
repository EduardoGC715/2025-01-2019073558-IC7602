import sys
import os

import unittest
import numpy as np
import queue
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from tkinter import messagebox
from matplotlib.backend_bases import Event

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from analyzer import AudioAnalyzer


class MockRecorder:
    def __init__(self):
        self.frames = []
        self.fft_data = {}
        self.queue = queue.Queue()
        self.rate = 8000  # Sample rate
        self.is_recording = False
        self.is_paused = False
        self.saved = False
        self.exported = None
        self.closed = False

    def start_recording(self):
        self.is_recording = True

    def pause_recording(self):
        self.is_paused = True

    def resume_recording(self):
        self.is_paused = False

    def stop_recording(self):
        self.is_recording = False

    def save_recording(self):
        self.saved = True

    def export_autrum(self, filename):
        self.exported = filename

    def load_audio_file(self, filename):
        self.frames = [np.random.randn(self.rate)]

    def close(self):
        self.closed = True


class TestAudioAnalyzer(unittest.TestCase):
    def setUp(self):
        self.recorder = MockRecorder()
        self.analyzer = AudioAnalyzer(self.recorder, streaming=True)

    def tearDown(self):
        plt.close(self.analyzer.fig)

    def test_start_recording(self):
        self.analyzer.start_recording(event=None)
        self.assertTrue(
            self.recorder.is_recording,
            "Recorder debería empezar a grabar.",
        )

    def test_pause_recording(self):
        self.recorder.is_recording = True
        self.analyzer.pause_recording(event=None)
        self.assertTrue(
            self.recorder.is_paused, "Recorder debió haber pausado la grabación."
        )

    def test_resume_recording(self):
        self.recorder.is_paused = True
        self.analyzer.resume_recording(event=None)
        self.assertFalse(self.recorder.is_paused, "Recorder debió reanudar grabación.")

    def test_stop_recording(self):
        self.recorder.is_recording = True
        self.analyzer.stop_recording(event=None)
        self.assertFalse(
            self.recorder.is_recording,
            "Recorder no debería estar grabando después de detener la grabación.",
        )


if __name__ == "__main__":
    unittest.main()
