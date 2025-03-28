import unittest
from unittest.mock import Mock, patch, mock_open
import numpy as np
import pickle
from player import AudioPlayer  # Assuming AudioPlayer is imported from player.py


class TestAudioPlayer(unittest.TestCase):

    def setUp(self):
        # Sample data to mock the .atm file loading
        self.sample_data = {
            "rate": 44100,
            "channels": 1,
            "sample_width": 2,
            "frames": [np.zeros(1024, dtype=np.int16)],
            "fft_data": {},
        }

        self.patcher_open = patch("builtins.open", mock_open(read_data=b"mock data"))
        self.patcher_pickle = patch("pickle.load", return_value=self.sample_data)
        self.mock_open = self.patcher_open.start()
        self.mock_pickle = self.patcher_pickle.start()

        self.patcher_plt = patch(
            "matplotlib.pyplot.subplots", return_value=(Mock(), (Mock(), Mock()))
        )
        self.mock_plt = self.patcher_plt.start()

        # Initialize the AudioPlayer
        self.player = AudioPlayer("test.atm")

    def tearDown(self):
        # Stop patching after each test
        self.patcher_open.stop()
        self.patcher_pickle.stop()
        self.patcher_plt.stop()

    def test_initialization(self):
        """Test initialization of the AudioPlayer"""
        self.assertEqual(self.player.rate, 44100)
        self.assertEqual(self.player.channels, 1)
        self.assertEqual(self.player.sample_width, 2)
        self.assertFalse(self.player.is_playing)
        self.assertFalse(self.player.is_paused)
        self.assertEqual(self.player.current_pos, 0)


if __name__ == "__main__":
    unittest.main()
