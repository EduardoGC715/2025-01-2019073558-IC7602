import matplotlib.pyplot as plt
from matplotlib.widgets import Button
import numpy as np
import pyaudio
import pickle
import threading
import time
from scipy.fft import rfft, rfftfreq


class AudioComparatorVisualizer:
    def __init__(self, atm_file, recorder):
        """
        Carga datos desde un archivo .atm y configura la interfaz para reproducir audio
        y visualizar su forma de onda y espectro de frecuencia.
        """
        self.recorder = recorder

        # --- Load .atm data ---
        with open(atm_file, "rb") as f:
            data = pickle.load(f)

        # Extraer parámetros de audio y frames
        self.rate = data["rate"]
        self.channels = data["channels"]
        self.sample_width = data["sample_width"]
        self.frames = data["frames"]  # list of NumPy arrays
        # Concatenar en un solo array para la reproducción
        self.audio_array = (
            np.concatenate(self.frames) if self.frames else np.array([], dtype=np.int16)
        )

        # FFT data guardada
        self.fft_data = data.get("fft_data", {})

        # Parámetros para reproducción
        self.is_playing = False
        self.is_paused = False
        self.current_pos = 0  # Índice de muestra actual
        self.chunk = 1024  # Tamaño de bloque de reproducción
        self.play_thread = None  # Hilo de reproducción

        # Configuración para la visualización
        self.MAX_FREQUENCY = 4000  # Límite de frecuencia a mostrar
        self.MAX_SECONDS = 2  # Mostrar últimos 2 segundos en el gráfico

        # --- Crear figura y ejes ---
        self.fig, (self.ax_time, self.ax_freq) = plt.subplots(2, 1, figsize=(10, 8))
        plt.subplots_adjust(bottom=0.3, hspace=0.4)
        self.fig.canvas.manager.set_window_title("Autrum - Reproductor de Audio")

        # Eje de tiempo
        self.ax_time.set_title("Audio Player (Time Domain)")
        self.ax_time.set_xlabel("Time (s)")
        self.ax_time.set_ylabel("Amplitude")
        (self.line_time,) = self.ax_time.plot([], [])

        # Eje de frecuencia
        self.ax_freq.set_title("Audio Player (Frequency Domain)")
        self.ax_freq.set_xlabel("Frequency (Hz)")
        self.ax_freq.set_ylabel("Magnitude")
        (self.line_freq,) = self.ax_freq.plot([], [])

        # --- Botones ---
        ax_play = plt.axes([0.05, 0.1, 0.1, 0.075])
        ax_pause = plt.axes([0.2, 0.1, 0.1, 0.075])
        ax_resume = plt.axes([0.35, 0.1, 0.1, 0.075])
        ax_stop = plt.axes([0.5, 0.1, 0.1, 0.075])

        self.btn_play = Button(ax_play, "Reproducir")
        self.btn_pause = Button(ax_pause, "Pausar")
        self.btn_resume = Button(ax_resume, "Reanudar")
        self.btn_stop = Button(ax_stop, "Detener")

        self.btn_play.on_clicked(self.start_playback)
        self.btn_pause.on_clicked(self.pause_playback)
        self.btn_resume.on_clicked(self.resume_playback)
        self.btn_stop.on_clicked(self.stop_playback)

        # Timer para actualizar el gráfico
        self.timer = self.fig.canvas.new_timer(interval=100)  # ms
        self.timer.add_callback(self.update_plot)
        self.timer.start()

        # Detectar zoom/pan en el eje de tiempo
        self.ax_time.callbacks.connect("xlim_changed", self.on_xlim_changed)
        self.is_zooming = False

        # Cerrar la figura limpia el audio
        self.fig.canvas.mpl_connect("close_event", self.on_close)

        # PyAudio setup (creamos PyAudio pero abrimos stream en _playback_thread)
        self.p = pyaudio.PyAudio()

    def start_playback(self, event):
        """Inicia la reproducción de audio en un hilo separado desde la mejor posición encontrada."""
        if self.is_playing:
            print("Ya está reproduciendo.")
            return
        if self.audio_array.size == 0:
            print("No hay audio para reproducir.")
            return
            
        # Comparar audio y encontrar posición
        print("Comparando audio con grabación...")
        results = self.compare_audio()
        
        # Si obtuvimos resultados con buena coincidencia, iniciar desde esa posición
        start_pos = 0  # Posición predeterminada
        
        if results:  
            #self.visualize_match(results)
            # Iniciar desde la posición donde se encontró el audio grabado
            start_pos = results["offset"]
            print(f"Iniciando reproducción desde la posición {results['offset_seconds']:.2f}s donde se encontró la mejor coincidencia")
        else:
            print("No se encontró una coincidencia confiable. Iniciando reproducción desde el principio.")
        
        self.is_playing = True
        self.is_paused = False
        self.current_pos = start_pos  # Usar la posición calculada directamente
        self.timer.start()
        self.play_thread = threading.Thread(target=self._playback_thread, daemon=True)
        self.play_thread.start()
        print("Reproducción iniciada.")

    def _playback_thread(self):
        """Hilo interno que envía audio a la salida en tiempo real."""
        stream = self.p.open(
            format=self.p.get_format_from_width(self.sample_width),
            channels=self.channels,
            rate=self.rate,
            output=True,
        )

        total_samples = len(self.audio_array)

        while self.is_playing and self.current_pos < total_samples:
            if self.is_paused:
                time.sleep(0.1)
                continue

            # Determinar cuántas muestras quedan
            end_pos = min(self.current_pos + self.chunk, total_samples)
            # Extraer ese bloque
            block = self.audio_array[self.current_pos : end_pos]
            # Convertir a bytes y escribir al stream
            stream.write(block.tobytes())

            self.current_pos = end_pos
            # Podrías dormir, pero stream.write() generalmente bloquea el tiempo suficiente

        # Si llegamos al final o se detuvo la reproducción
        stream.stop_stream()
        stream.close()

        print("Reproducción terminada.")
        self.is_playing = False

    def pause_playback(self, event):
        """Pausa la reproducción."""
        if self.is_playing and not self.is_paused:
            self.is_paused = True
            self.timer.stop()
            print("Reproducción pausada.")

    def resume_playback(self, event):
        """Reanuda la reproducción."""
        if self.is_playing and self.is_paused:
            self.is_paused = False
            self.timer.start()
            print("Reproducción reanudada.")

    def stop_playback(self, event):
        """Detiene la reproducción por completo."""
        if self.is_playing:
            self.is_playing = False
            self.timer.stop()
            print("Reproducción detenida.")

    def update_plot(self):
        # If there's no audio, do nothing.
        if self.audio_array.size == 0:
            return

        # Stop updating if playback is finished.
        if not self.is_playing and self.current_pos >= len(self.audio_array):
            self.timer.stop()
            return

        # Determine how many samples have been played.
        current_pos = self.current_pos

        # Choose the window to display: from the beginning until the current position.
        audio_segment = self.audio_array[:current_pos]

        # Avoid FFT on an empty segment.
        if audio_segment.size == 0:
            self.fig.canvas.draw_idle()
            return

        # Total duration of the segment.
        duration = len(audio_segment) / self.rate
        times = np.linspace(0, duration, len(audio_segment))

        # Update time-domain plot.
        self.line_time.set_data(times, audio_segment)

        # Auto-adjust axes if not zooming.
        toolbar = self.fig.canvas.manager.toolbar
        if toolbar is not None and toolbar.mode != "":
            self.is_zooming = True
        else:
            self.is_zooming = False
            self.ax_time.set_xlim(0, max(duration, 0.01))
            self.ax_time.set_ylim(
                np.min(audio_segment) - 500, np.max(audio_segment) + 500
            )

        # Compute FFT for the current window.
        yf = np.abs(rfft(audio_segment))
        xf = rfftfreq(len(audio_segment), d=1.0 / self.rate)

        # Truncate to self.MAX_FREQUENCY.
        mask = xf <= self.MAX_FREQUENCY
        xf = xf[mask]
        yf = yf[mask]

        self.line_freq.set_data(xf, yf)
        self.ax_freq.set_xlim(0, self.MAX_FREQUENCY)
        self.ax_freq.set_ylim(0, np.max(yf) * 1.1 if np.max(yf) > 0 else 1)

        self.fig.canvas.draw_idle()

    def on_xlim_changed(self, ax):
        """Callback al hacer zoom/pan en el dominio del tiempo."""
        # Si quieres recalcular la FFT en la porción visible, puedes hacerlo aquí.
        if self.is_zooming:
            # Implementa la lógica de re-FFT si deseas
            pass

    def on_close(self, event):
        """Al cerrar la ventana, asegurarse de liberar recursos."""
        self.timer.stop()
        self.stop_playback(None)  # Detener si está reproduciendo
        self.p.terminate()
        print("Cerrando AudioPlayer.")

    def run(self):
        """Inicia el loop de Matplotlib."""
        plt.show()

    def compare_audio(self, event=None):
        """
        Compara el audio grabado con el audio de referencia.
        Busca donde aparece la grabación dentro del audio de referencia.
        Analiza similitud por armónicos y potencia espectral.
        
        Args:
            event: Parámetro opcional para poder usar como callback en botones
        
        Returns:
            dict: Resultados de la comparación con métricas y posición encontrada
        """
        # Obtener el audio del reproductor (referencia)
        reference_audio = self.audio_array
        
        # Obtener el audio ya grabado del recorder
        recorded_frames = self.recorder.frames
        if not recorded_frames:
            print("No hay audio grabado para comparar. Debe grabar audio primero.")
            return None
        
        recorded_audio = np.concatenate(recorded_frames) if recorded_frames else np.array([], dtype=np.int16)
        
        if len(reference_audio) == 0 or len(recorded_audio) == 0:
            print("Una o ambas señales están vacías")
            return None
        
        print(f"Comparando audio - Referencia: {len(reference_audio)} muestras, Grabado: {len(recorded_audio)} muestras")
        
        # Buscar la mejor posición de coincidencia
        step_size = self.rate // 100

        if len(reference_audio) > len(recorded_audio):
            print("Buscando dónde aparece el audio grabado dentro de la referencia...")
            best_offset = 0
            best_score = 0

            rec_fft = np.abs(rfft(recorded_audio))
            frequencies = rfftfreq(len(recorded_audio), d=1.0/self.rate)
            n_peaks = 10  # Armónicos principales a considerar

            rec_peaks_idx = np.argsort(rec_fft)[-n_peaks:]
            
            rec_peak_freqs = frequencies[rec_peaks_idx]

            rec_fft_norm = rec_fft / np.sum(rec_fft) if np.sum(rec_fft) > 0 else rec_fft
            recorded_norm = recorded_audio / np.max(np.abs(recorded_audio)) if np.max(np.abs(recorded_audio)) > 0 else recorded_audio
            
            for offset in range(0, len(reference_audio), step_size):
                # Extraer segmento de la referencia de igual longitud que la grabación
                ref_segment = reference_audio[offset:offset+len(recorded_audio)]

                if len(ref_segment) < len(recorded_audio):
                    # skip, ya lo que queda es el final del file
                    continue    

                # Usar FFT pre-calculada si esta disponible
                segment_key = f"{offset}_{len(ref_segment)}"
                if segment_key in self.fft_data:
                    ref_fft = self.fft_data[segment_key]
                    print(f"Using cached FFT data for offset {offset}")
                else:
                    # Calculate FFT if not available in cache
                    ref_fft = np.abs(rfft(ref_segment))
                    # Optionally store for future use
                    self.fft_data[segment_key] = ref_fft
        
                # Encontrar índices de los picos más altos en ambas señales (solo en frecuencias significativas)
                ref_peaks_idx = np.argsort(ref_fft)[-n_peaks:]

                # Obtener frecuencias correspondientes a estos picos
                ref_peak_freqs = frequencies[ref_peaks_idx]

                # Calcular similitud de armónicos con tolerancia
                frequency_tolerance = 10  # Hz
                harmonic_matches = 0
                matched_harmonics = []
                
                for rec_freq in rec_peak_freqs:
                    for ref_freq in ref_peak_freqs:
                        if abs(rec_freq - ref_freq) <= frequency_tolerance:
                            harmonic_matches += 1
                            matched_harmonics.append((rec_freq, ref_freq))
                            break
                
                harmonic_similarity = self._cosine_similarity(rec_peak_freqs, ref_peak_freqs) * 100

                # Calcular similitud de potencia espectral 
                ref_fft_norm = ref_fft / np.sum(ref_fft) if np.sum(ref_fft) > 0 else ref_fft
                
                """power_correlation = np.corrcoef(rec_fft_norm, ref_fft_norm)[0, 1] * 100
                if np.isnan(power_correlation):
                    power_correlation = 0"""

                # Calcular similitud de potencia espectral (RMS)
                power_correlation = self._power_similarity(recorded_audio, ref_segment)

                # Calcular similitud de amplitud de onda (dominio del tiempo)
                ref_segment_norm = ref_segment / np.max(np.abs(ref_segment)) if np.max(np.abs(ref_segment)) > 0 else ref_segment
                                
                amplitude_correlation = np.corrcoef(recorded_norm, ref_segment_norm)[0, 1] * 100
                if np.isnan(amplitude_correlation):
                    amplitude_correlation = 0
                
                # Calcular puntuación final
                total_score = harmonic_similarity + amplitude_correlation + power_correlation
                if total_score > best_score:
                    best_score = total_score
                    best_offset = offset
            # Reportar resultados
            print(f"\n--- RESULTADOS DE COMPARACIÓN DE AUDIO ---")
            print(f"Audio grabado encontrado en la posición: {best_offset} muestras ({best_offset/self.rate:.2f} segundos) del audio de referencia")
            print(f"Similitud de armónicos: {harmonic_similarity:.1f}%")
            print(f"Correlación de amplitud de onda: {amplitude_correlation:.1f}%")
            print(f"Correlación de potencia espectral: {power_correlation:.1f}%")
            print(f"Puntuación total: {total_score:.1f}")
            print(f"Armónicos coincidentes: {matched_harmonics}")



            results = {
                "offset": best_offset,
                "offset_seconds": best_offset/self.rate,
                "harmonic_similarity": harmonic_similarity,
                "power_correlation": power_correlation,
                "amplitude_correlation": amplitude_correlation,
                "total_score": total_score,
                "matched_harmonics": matched_harmonics
            }
                
            return results
        else:
            print("La referencia es más corta que la grabación.")
            return None
        
    def _cosine_similarity(self, a, b):
        """Calcula la similitud de coseno entre dos vectores."""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0
        return np.dot(a, b) / (norm_a * norm_b)

    def _power_similarity(self, segment, template):
        """
        Calcula la similitud basada en la potencia (RMS) entre el segmento y el template.
        Se utiliza una fórmula que compara la diferencia relativa de RMS.
        """
        rms_template = np.sqrt(np.mean(template.astype(np.float32)**2))
        rms_segment = np.sqrt(np.mean(segment.astype(np.float32)**2))
        # Evitar división por cero
        if rms_template == 0:
            return 100 if rms_segment == 0 else 0
        diff = abs(rms_segment - rms_template) / rms_template
        similarity = max(0, 1 - diff)
        return similarity * 100
    
    def visualize_match(self, results):
        """
        Visualiza el mejor offset encontrado en el audio de referencia.
        
        Args:
            results: Diccionario con los resultados de la comparación
        """
        if not results:
            print("No hay resultados para visualizar")
            return
        
        # Crear una nueva figura para esta visualización
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))
        fig.suptitle("Visualización de coincidencia de audio", fontsize=16)
        
        # Audio de referencia completo
        reference_audio = self.audio_array
        duration = len(reference_audio) / self.rate
        times = np.linspace(0, duration, len(reference_audio))
        
        # Graficar el audio completo (posiblemente con un submuestreo para mejor rendimiento)
        step = max(1, len(reference_audio) // 10000)  # Limitar a ~10k puntos para rendimiento
        ax1.plot(times[::step], reference_audio[::step], 'b-', alpha=0.5, label='Audio de referencia')
        
        # Marcar el mejor offset
        best_offset = results["offset"]
        best_offset_seconds = results["offset_seconds"]
        
        # Obtener la grabación
        recorded_frames = self.recorder.frames
        if recorded_frames:
            recorded_audio = np.concatenate(recorded_frames)
            recorded_duration = len(recorded_audio) / self.rate
            
            # Destacar la región donde se encontró la coincidencia - cambiado a rojo
            ax1.axvspan(best_offset_seconds, 
                    best_offset_seconds + recorded_duration, 
                    color='red', alpha=0.3, label='Mejor coincidencia')
            
            # También marcamos el inicio con una línea vertical - mantenemos azul
            ax1.axvline(x=best_offset_seconds, color='blue', linestyle='--', 
                    label=f'Mejor offset: {best_offset_seconds:.2f}s')
            
            # Configurar límites de visualización para centrarse en la región de interés
            margin = 3  # segundos antes y después para contexto
            ax1.set_xlim(max(0, best_offset_seconds - margin), 
                        min(duration, best_offset_seconds + recorded_duration + margin))
        
        ax1.set_title("Audio de referencia con mejor coincidencia marcada")
        ax1.set_xlabel("Tiempo (s)")
        ax1.set_ylabel("Amplitud")
        ax1.legend()
        
        # Gráfico de zoom a la coincidencia
        if best_offset + len(recorded_audio) <= len(reference_audio):
            matched_segment = reference_audio[best_offset:best_offset+len(recorded_audio)]
            matched_times = np.linspace(best_offset_seconds, 
                                    best_offset_seconds + recorded_duration, 
                                    len(matched_segment))
            
            # Graficar el segmento coincidente - cambiado a azul
            ax2.plot(matched_times, matched_segment, 'b-', label='Segmento coincidente')
            
            # Graficar la grabación superpuesta - cambiado a rojo sólido
            recorded_times = np.linspace(best_offset_seconds, 
                                        best_offset_seconds + recorded_duration, 
                                        len(recorded_audio))
            ax2.plot(recorded_times, recorded_audio, 'r-', alpha=0.7, label='Audio grabado')
            
            ax2.set_title("Comparación del segmento coincidente con el audio grabado")
            ax2.set_xlabel("Tiempo (s)")
            ax2.set_ylabel("Amplitud")
            ax2.legend()
        
        # Añadir información sobre la puntuación
        fig.text(0.02, 0.02, 
                f"Similitud de armónicos: {results['harmonic_similarity']:.1f}%\n"
                f"Correlación de potencia: {results['power_correlation']:.1f}%\n"
                f"Correlación de amplitud: {results['amplitude_correlation']:.1f}%\n"
                f"Puntuación total: {results['total_score']:.1f}",
                fontsize=12)
        
        plt.tight_layout()
        plt.show(block=False)