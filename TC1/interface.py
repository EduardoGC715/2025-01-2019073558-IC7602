import tkinter as tk
from tkinter import filedialog, messagebox
from analyzer import AudioAnalyzer
from recorder import AudioRecorder
from player import AudioPlayer
from comparator_recorder import AudioComparatorRecorder


class Interface:
    """Clase que crea la interfaz gráfica de usuario (GUI) para el programa."""

    def __init__(self):
        """Inicializa la ventana principal y los botones."""
        self.root = tk.Tk()
        self.root.title("Autrum")
        self.root.geometry("600x400")
        self.button_font = ("Helvetica", 16)

        # Crear los botones para las funcionalidades principales.
        btn_analizador = tk.Button(
            self.root,
            text="Analizador",
            command=self.open_analizador,
            width=20,
            height=2,
            font=self.button_font,
            background="#D0E8FF",
        )
        btn_analizador.pack(padx=20, pady=10)

        btn_reproductor = tk.Button(
            self.root,
            text="Reproductor",
            command=self.open_reproductor,
            width=20,
            height=2,
            font=self.button_font,
            background="#FFF9C4",
        )
        btn_reproductor.pack(padx=20, pady=10)

        btn_comparador = tk.Button(
            self.root,
            text="Comparador",
            command=self.open_comparador,
            width=20,
            height=2,
            font=self.button_font,
            background="#FF5733",
        )
        btn_comparador.pack(padx=20, pady=10)

    def open_analizador(self):
        """Crea una ventana para escoger el modo del analizador"""
        analizador_window = tk.Toplevel(self.root)
        analizador_window.title("Analizador")
        analizador_window.geometry("400x300")

        btn_streaming = tk.Button(
            analizador_window,
            text="Streaming (micrófono)",
            command=lambda: self.open_streaming_audio_visualizer(
                streaming=True, filename=None
            ),
            width=20,
            height=2,
            font=self.button_font,
            background="#D0E8FF",
        )
        btn_streaming.pack(padx=20, pady=10)

        btn_batch = tk.Button(
            analizador_window,
            text="Batch (Archivo)",
            command=lambda: self.open_file_audio_visualizer(),
            width=20,
            height=2,
            font=self.button_font,
            background="#FFF9C4",
        )
        btn_batch.pack(padx=20, pady=10)

    def open_file_audio_visualizer(self):
        """Abre el analizador en modo Batch"""
        file_path = filedialog.askopenfilename(
            title="Seleccione el archivo WAV",
            filetypes=[("WAV Files", "*.wav")],
        )
        if file_path:
            self.open_streaming_audio_visualizer(streaming=False, filename=file_path)
        else:
            messagebox.showerror(
                "Selección de archivo", "No hay un archivo seleccionado."
            )

    def open_streaming_audio_visualizer(self, streaming, filename):
        """Abre el Analizador"""
        recorder = AudioRecorder()
        AudioAnalyzer(recorder, streaming, filename).run()

    def open_reproductor(self):
        """Abre el reproductor de audio"""
        file_path = filedialog.askopenfilename(
            title="Seleccione el archivo WAV",
            filetypes=[("ATM Files", "*.atm")],
        )
        if file_path:
            AudioPlayer(file_path).run()
        else:
            messagebox.showerror(
                "Selección de archivo", "No hay un archivo seleccionado."
            )

    def open_comparador(self):
        """Abre el comparador de audio"""
        file_path = filedialog.askopenfilename(
            title="Seleccione el archivo WAV que se usa para comparar",
            filetypes=[("Autrum Files", "*.atm")],
        )
        if file_path:
            recorder = AudioRecorder()
            comparator_recorder = AudioComparatorRecorder(recorder, filename=file_path)
            comparator_recorder.run()
        else:
            messagebox.showerror(
                "Selección de archivo", "No hay un archivo seleccionado."
            )

    def run(self):
        """Ejecuta la interfaz gráfica de usuario (GUI)"""
        self.root.mainloop()
