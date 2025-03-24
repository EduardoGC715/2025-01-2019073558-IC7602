import tkinter as tk
from tkinter import filedialog, messagebox
from analyzer import AudioAnalyzer
from recorder import AudioRecorder


class Interface:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Autrum")

        # Create three main buttons.
        btn_analizador = tk.Button(
            self.root, text="Analizador", command=self.open_analizador
        )
        btn_analizador.pack(padx=20, pady=10)

        btn_reproductor = tk.Button(
            self.root, text="Reproductor", command=self.open_reproductor
        )
        btn_reproductor.pack(padx=20, pady=10)

        btn_comparador = tk.Button(
            self.root, text="Comparador", command=self.open_comparador
        )
        btn_comparador.pack(padx=20, pady=10)

    def open_analizador(self):
        # Create a new window for the Analizador options.
        analizador_window = tk.Toplevel(self.root)
        analizador_window.title("Analizador")

        btn_streaming = tk.Button(
            analizador_window,
            text="Streaming (micrófono)",
            command=lambda: self.open_streaming_audio_visualizer(
                streaming=True, filename=None
            ),
        )
        btn_streaming.pack(padx=20, pady=10)

        btn_batch = tk.Button(
            analizador_window,
            text="Batch (Archivo)",
            command=lambda: self.open_file_audio_visualizer(),
        )
        btn_batch.pack(padx=20, pady=10)

    def open_file_audio_visualizer(self):
        # Open a file explorer to select a file.
        file_path = filedialog.askopenfilename(
            title="Seleccione el archivo WAV",
            filetypes=[("WAV Files", "*.wav")],
        )
        if file_path:
            self.open_streaming_audio_visualizer(streaming=False, filename=file_path)
        else:
            messagebox.showinfo(
                "Selección de archivo", "No hay un archivo seleccionado."
            )

    def open_streaming_audio_visualizer(self, streaming, filename):
        recorder = AudioRecorder()
        AudioAnalyzer(recorder, streaming, filename).run()

    def open_reproductor(self):
        messagebox.showinfo("Reproductor", "Pendiente.")

    def open_comparador(self):
        messagebox.showinfo("Comparador", "Pendiente.")

    def run(self):
        self.root.mainloop()
