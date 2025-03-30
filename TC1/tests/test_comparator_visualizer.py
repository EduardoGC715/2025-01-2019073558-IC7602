import pytest
import numpy as np
from unittest.mock import Mock, patch
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from comparator_visualizer import AudioComparatorVisualizer
import pickle


class MockRecorder:
    def __init__(self):
        self.frames = [np.array([1000, 0, -1000, 0], dtype=np.int16)]
        self.rate = 44100
        self.channels = 1
        self.sample_width = 2


@pytest.fixture
def mock_atm_file(tmp_path):
    """Crear un ATM temporal con datos"""
    test_data = {
        "rate": 44100,
        "channels": 1,
        "sample_width": 2,
        "frames": [np.array([1000, 0, -1000, 0, 1000, 0, -1000, 0], dtype=np.int16)],
        "fft_data": {"x_frequency": [0, 100, 200], "y_frequency": [0.5, 1.0, 0.5]},
    }

    file_path = tmp_path / "test.atm"
    with open(file_path, "wb") as f:
        pickle.dump(test_data, f)

    return str(file_path)


@pytest.fixture
def mock_pyaudio():
    """Mock la funcionalidad de PyAudio"""
    with patch("pyaudio.PyAudio") as mock:
        mock_instance = Mock()
        mock.return_value = mock_instance
        mock_instance.get_format_from_width.return_value = 8
        mock_stream = Mock()
        mock_instance.open.return_value = mock_stream
        yield mock


@pytest.fixture
def visualizer(mock_atm_file, mock_pyaudio):
    """Crear el AudioComparatorVisualizer con los componentes mocked"""
    with patch("matplotlib.pyplot.show"), patch("matplotlib.pyplot.figure"), patch(
        "matplotlib.pyplot.subplots"
    ) as mock_subplots:

        mock_fig = Mock()
        mock_ax1, mock_ax2, mock_ax3 = Mock(), Mock(), Mock()

        mock_ax1.plot.return_value = [Mock()]
        mock_ax2.plot.return_value = [Mock()]
        mock_ax3.plot.return_value = [Mock()]

        mock_subplots.return_value = (mock_fig, (mock_ax1, mock_ax2, mock_ax3))

        mock_canvas = Mock()
        mock_timer = Mock()
        mock_canvas.new_timer.return_value = mock_timer
        mock_fig.canvas = mock_canvas

        mock_manager = Mock()
        mock_canvas.manager = mock_manager

        recorder = MockRecorder()
        visualizer = AudioComparatorVisualizer(mock_atm_file, recorder)
        return visualizer


def test_initialization(visualizer):
    """Probar si el visualizador inicio correctamente"""
    assert visualizer.rate == 44100
    assert visualizer.channels == 1
    assert visualizer.sample_width == 2
    assert len(visualizer.frames) > 0
    assert isinstance(visualizer.audio_array, np.ndarray)
    assert visualizer.MAX_FREQUENCY == 4000


def test_trim_silence():
    visualizer = AudioComparatorVisualizer.__new__(AudioComparatorVisualizer)

    audio = np.array([0, 0, 1000, 2000, 0, 0], dtype=np.int16)
    trimmed = visualizer.trim_silence(audio, threshold=500)
    assert len(trimmed) == 2
    assert np.array_equal(trimmed, np.array([1000, 2000]))

    audio = np.array([1000, 2000, 1500], dtype=np.int16)
    trimmed = visualizer.trim_silence(audio, threshold=500)
    assert len(trimmed) == 3
    assert np.array_equal(trimmed, audio)

    audio = np.array([0, 0, 0], dtype=np.int16)
    trimmed = visualizer.trim_silence(audio, threshold=500)
    assert len(trimmed) == 3
    assert np.array_equal(trimmed, audio)


def test_cosine_similarity():
    visualizer = AudioComparatorVisualizer.__new__(AudioComparatorVisualizer)

    # Vectores similares
    a = np.array([1, 0, 1])
    b = np.array([1, 0, 1])
    similarity = visualizer._cosine_similarity(a, b)
    assert np.isclose(similarity, 1.0)

    # Vectores normales
    a = np.array([1, 0])
    b = np.array([0, 1])
    similarity = visualizer._cosine_similarity(a, b)
    assert np.isclose(similarity, 0.0)

    # Cero vector
    a = np.array([0, 0])
    b = np.array([1, 1])
    similarity = visualizer._cosine_similarity(a, b)
    assert np.isclose(similarity, 0.0)


def test_power_similarity():
    """Probar la similitud de poder"""
    visualizer = AudioComparatorVisualizer.__new__(AudioComparatorVisualizer)

    # Señales identicas
    signal = np.array([1000, -1000, 1000], dtype=np.int16)
    similarity = visualizer._power_similarity(signal, signal)
    assert np.isclose(similarity, 100.0)

    # Señales con diferente amplitud
    signal1 = np.array([1000, -1000, 1000], dtype=np.int16)
    signal2 = np.array([500, -500, 500], dtype=np.int16)
    similarity = visualizer._power_similarity(signal1, signal2)
    assert 0 <= similarity <= 100

    # Cero señal
    signal1 = np.array([0, 0, 0], dtype=np.int16)
    signal2 = np.array([0, 0, 0], dtype=np.int16)
    similarity = visualizer._power_similarity(signal1, signal2)
    assert np.isclose(similarity, 100.0)
