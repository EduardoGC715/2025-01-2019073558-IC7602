import pytest
import numpy as np
from unittest.mock import Mock, patch
import matplotlib.pyplot as plt
from comparator_recorder import AudioComparatorRecorder


class MockRecorder:
    def __init__(self):
        self.frames = []
        self.queue = Mock()
        self.rate = 44100
        self.is_recording = False
        self.is_paused = False

    def start_recording(self):
        self.is_recording = True

    def pause_recording(self):
        self.is_paused = True

    def resume_recording(self):
        self.is_paused = False

    def stop_recording(self):
        self.is_recording = False

    def close(self):
        pass


@pytest.fixture
def mock_recorder():
    return MockRecorder()


@pytest.fixture
def comparator_recorder(mock_recorder):
    with patch("matplotlib.pyplot.show"):
        recorder = AudioComparatorRecorder(mock_recorder, filename="test.atm")
    return recorder


def test_initialization(comparator_recorder):
    assert comparator_recorder.MAX_FREQUENCY == 4000
    assert comparator_recorder.MAX_SECONDS == 2
    assert comparator_recorder.streaming == True
    assert comparator_recorder.filename == "test.atm"


def test_start_recording(comparator_recorder, mock_recorder):
    comparator_recorder.start_recording(None)
    assert mock_recorder.is_recording == True


def test_pause_recording(comparator_recorder, mock_recorder):
    comparator_recorder.pause_recording(None)
    assert mock_recorder.is_paused == True
    assert comparator_recorder.streaming == True


def test_resume_recording(comparator_recorder, mock_recorder):
    comparator_recorder.resume_recording(None)
    assert mock_recorder.is_paused == False


def test_stop_recording_with_no_frames(comparator_recorder, mock_recorder):
    with patch("tkinter.messagebox.showerror") as mock_error:
        comparator_recorder.stop_recording(None)
        mock_error.assert_called_once_with(
            "Error", "No hay audio grabado para comparar."
        )


def test_update_plot_empty_queue(comparator_recorder, mock_recorder):
    mock_recorder.queue.empty.return_value = True
    result = comparator_recorder.update_plot()
    assert result is None


def test_cleanup(comparator_recorder):
    with patch.object(comparator_recorder.timer, "stop") as mock_timer_stop:
        comparator_recorder.on_close(None)
        mock_timer_stop.assert_called_once()
