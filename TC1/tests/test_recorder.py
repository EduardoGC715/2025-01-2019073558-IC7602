import unittest
from unittest.mock import Mock, patch, call, mock_open
import numpy as np
import pyaudio
from recorder import AudioRecorder


class TestAudioRecorder(unittest.TestCase):
    def setUp(self):
        # Mock PyAudio completamente
        self.mock_pyaudio = patch("pyaudio.PyAudio").start()
        self.recorder = AudioRecorder()

    def tearDown(self):
        patch.stopall()

    def test_start_recording_first_time(self):
        """Prueba iniciar la grabación por primera vez"""
        with patch("threading.Thread") as mock_thread:
            self.recorder.start_recording()

            self.assertTrue(self.recorder.is_recording)
            self.assertFalse(self.recorder.is_paused)
            self.assertEqual(self.recorder.frames, [])
            mock_thread.assert_called_once()
            mock_thread.return_value.start.assert_called_once()

    def test_start_recording_already_recording(self):
        """Prueba iniciar la grabación cuando ya está grabando"""
        self.recorder.is_recording = True
        with patch("threading.Thread") as mock_thread:
            self.recorder.start_recording()
            mock_thread.assert_not_called()

    def test_record_process(self):
        """Prueba el proceso interno de grabación"""
        mock_stream = Mock()
        self.mock_pyaudio.return_value.open.return_value = mock_stream

        # Simula datos de audio
        test_data = np.zeros(1024, dtype=np.int16).tobytes()
        mock_stream.read.return_value = test_data

        # Ajuste del mock para evitar errores de formato
        self.mock_pyaudio.paInt16 = pyaudio.paInt16

        # Inicia grabación
        self.recorder.start_recording()

        # Asegura que se detenga tras una iteración
        self.recorder.is_recording = False

        # Ejecuta _record
        self.recorder._record()

        # Verifica que el stream se configuró correctamente
        self.mock_pyaudio.return_value.open.assert_called_with(
            format=pyaudio.paInt16,
            channels=1,
            rate=44100,
            input=True,
            frames_per_buffer=1024,
        )

    def test_pause_resume_recording(self):
        """Prueba pausar y reanudar la grabación"""
        # Configura estado inicial
        self.recorder.is_recording = True
        self.recorder.is_paused = False

        # Prueba pausar
        self.recorder.pause_recording()
        self.assertTrue(self.recorder.is_paused)
        self.assertTrue(self.recorder.is_recording)

        # Prueba reanudar
        self.recorder.resume_recording()
        self.assertFalse(self.recorder.is_paused)
        self.assertTrue(self.recorder.is_recording)

    def stop_recording(self):
        print(f"self.stream: {self.stream}")  # Debug
        if self.is_recording:
            self.is_recording = False
            if self.stream:
                print("Calling stop_stream()")  # Debug
                self.stream.stop_stream()
                self.stream.close()

    @patch("wave.open")
    @patch("os.path.exists")
    def test_load_audio_file_success(self, mock_exists, mock_wave):
        """Prueba cargar un archivo de audio exitosamente"""
        # Configura los mocks
        mock_exists.return_value = True
        mock_wave_obj = mock_wave.return_value
        mock_wave_obj.getnchannels.return_value = 1
        mock_wave_obj.getframerate.return_value = 44100
        mock_wave_obj.getsampwidth.return_value = 2

        # Simula datos de audio
        test_data = np.zeros(1024, dtype=np.int16).tobytes()
        mock_wave_obj.readframes.side_effect = [test_data, b""]

        # Ejecuta la carga
        self.recorder.load_audio_file("test.wav")

        # Verifica las llamadas
        mock_exists.assert_called_once_with("test.wav")
        mock_wave.assert_called_once_with("test.wav", "rb")

    @patch("os.path.exists")
    def test_load_audio_file_not_exists(self, mock_exists):
        """Prueba cargar un archivo que no existe"""
        mock_exists.return_value = False
        result = self.recorder.load_audio_file("nonexistent.wav")
        self.assertFalse(result)

    def test_export_autrum(self):
        """Prueba la exportación del formato Autrum"""
        test_frames = [np.zeros(1024, dtype=np.int16)]
        self.recorder.frames = test_frames

        with patch("builtins.open", mock_open()) as mock_file, patch(
            "pickle.dump"
        ) as mock_pickle:
            self.recorder.export_autrum("test.atm")

            # Verifica que se llamó a pickle.dump con los datos correctos
            mock_file.assert_called_once_with("test.atm", "wb")
            self.assertEqual(mock_pickle.call_count, 1)

            # Verifica la estructura de los datos exportados
            exported_data = mock_pickle.call_args[0][0]
            self.assertIn("rate", exported_data)
            self.assertIn("channels", exported_data)

            self.assertIn("frames", exported_data)
            self.assertIn("fft_data", exported_data)
            self.assertIn("sample_width", exported_data)

    def test_close(self):
        """Prueba el cierre correcto del grabador"""
        self.recorder.is_recording = True
        self.recorder.close()

        self.assertFalse(self.recorder.is_recording)
        self.mock_pyaudio.return_value.terminate.assert_called_once()


if __name__ == "__main__":
    unittest.main()
