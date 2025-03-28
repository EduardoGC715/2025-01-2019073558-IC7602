import unittest
from unittest.mock import Mock, patch
import numpy as np
from analyzer import AudioAnalyzer


class TestAudioAnalyzer(unittest.TestCase):
    def setUp(self):
        self.mock_recorder = Mock()
        self.mock_recorder.rate = 44100
        self.mock_recorder.frames = []
        self.mock_recorder.queue = Mock()

        # Create proper mock for plt.subplots
        self.mock_fig = Mock()
        self.mock_ax_time = Mock()
        self.mock_ax_freq = Mock()

        with patch("matplotlib.pyplot.subplots") as mock_subplots:
            # Configure the mock to return appropriate values
            mock_subplots.return_value = (
                self.mock_fig,
                (self.mock_ax_time, self.mock_ax_freq),
            )
            self.analyzer = AudioAnalyzer(self.mock_recorder, streaming=True)

    def test_init(self):
        self.assertEqual(self.analyzer.MAX_FREQUENCY, 4000)
        self.assertEqual(self.analyzer.MAX_SECONDS, 2)
        self.assertEqual(self.analyzer.recorder, self.mock_recorder)

    def test_start_recording(self):
        mock_event = Mock()
        self.analyzer.start_recording(mock_event)
        self.mock_recorder.start_recording.assert_called_once()

    def test_stop_recording(self):
        mock_event = Mock()
        self.analyzer.stop_recording(mock_event)
        self.mock_recorder.stop_recording.assert_called_once()

    @patch("numpy.concatenate")
    def test_update_plot_empty_queue(self, mock_concatenate):
        self.mock_recorder.queue.empty.return_value = True
        self.analyzer.update_plot()
        mock_concatenate.assert_not_called()

    @patch("numpy.concatenate")
    def test_update_plot_with_data(self, mock_concatenate):
        self.mock_recorder.queue.empty.side_effect = [False, True]
        self.mock_recorder.queue.get_nowait.return_value = np.zeros(1024)
        mock_concatenate.return_value = np.zeros(2048)

        self.analyzer.update_plot()
        mock_concatenate.assert_called()


if __name__ == "__main__":
    unittest.main()
