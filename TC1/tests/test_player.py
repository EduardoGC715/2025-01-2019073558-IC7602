import sys
import os
import unittest
from unittest.mock import MagicMock, patch
import numpy as np
import matplotlib
import sounddevice as sd


matplotlib.use("Agg")
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from player import AudioPlayer


class MockAudioPlayer:
    def __init__(self):
        self.rate = 8000
        self.channels = 2
        self.sample_width = 2
        self.frames = [np.random.randn(self.rate)]
        self.audio_array = np.zeros(44100, dtype=np.int16)
        self.is_playing = False
        self.is_paused = False
        self.current_pos = 0
        self.chunk = 1024
        self.play_thread = None
        self.timer = MagicMock()

    def start_playback(self, event=None):
        if self.is_playing:
            return
        self.is_playing = True
        try:
            sd.play(self.audio_array, samplerate=44100)
        except Exception:
            pass

    def _playback_thread(self):
        while self.is_playing and self.current_pos < len(self.audio_array):
            if self.is_paused:
                time.sleep(0.1)
                continue

            self.current_pos += self.chunk

        self.is_playing = False

    def pause_playback(self, event):
        self.is_paused = True

    def resume_playback(self, event):
        self.is_paused = False

    def stop_playback(self, event):
        self.is_playing = False


class TestAudioPlayer(unittest.TestCase):
    def setUp(self):
        self.patcher_sd = patch("sounddevice.play", MagicMock())
        self.patcher_sd.start()

        self.mock_player = AudioPlayer("test.atm")
        self.mock_player.audio_array = np.zeros(44100, dtype=np.int16)

    def tearDown(self):
        self.patcher_sd.stop()

    def test_start_playback(self):
        print(f"Antes de iniciar: is_playing = {self.mock_player.is_playing}")
        self.mock_player.start_playback(event=None)
        print(f"Después de iniciar: is_playing = {self.mock_player.is_playing}")
        self.assertTrue(
            self.mock_player.is_playing, "El reproductor debe comenzar a reproducir."
        )

    def test_pause_playback(self):
        self.mock_player.start_playback(event=None)
        self.mock_player.pause_playback(event=None)
        self.assertTrue(
            self.mock_player.is_paused, "El reproductor debe estar pausado."
        )

    def test_resume_playback(self):
        self.mock_player.start_playback(event=None)
        self.mock_player.is_paused = True
        self.mock_player.resume_playback(event=None)
        self.assertFalse(
            self.mock_player.is_paused, "El reproductor debe reanudar la reproducción."
        )

    def test_stop_playback(self):
        self.mock_player.start_playback(event=None)
        self.mock_player.stop_playback(event=None)
        self.assertFalse(
            self.mock_player.is_playing,
            "El reproductor debe haber detenido la reproducción.",
        )


if __name__ == "__main__":
    unittest.main()
