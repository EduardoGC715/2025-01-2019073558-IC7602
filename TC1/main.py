from recorder import AudioRecorder
from visualizer import AudioVisualizer

if __name__ == "__main__":
    recorder = AudioRecorder()
    visualizer = AudioVisualizer(recorder)
    visualizer.run()
