## Características

- Captura de audio en tiempo real desde el micrófono
- Visualización de la señal en el dominio del tiempo
- Análisis de frecuencia en tiempo real usando la Transformada de Fourier
- Capacidad de guardar los datos en formato .atm
- Procesamiento de archivos WAV
- Controles de grabación (iniciar, pausar, continuar, detener)

## Requisitos

- Las dependencias listadas en requirements.txt

## Instalación

1. Clonar repositorio
2. Instalar las dependencias:
3. python -m pip install --upgrade pip setuptools wheel
   pip install -r requirements.txt

## Uso

1. Ejecutar la aplicación:

```bash
python autrum.py
```

2. Comandos disponibles:

- Para iniciar la grabación: `autrum.start_recording()`
- Para pausar la grabación: `autrum.pause_recording()`
- Para continuar la grabación: `autrum.resume_recording()`
- Para detener la grabación: `autrum.stop_recording()`
- Para guardar los datos: `autrum.save_atm('nombre_archivo.atm')`
- Para procesar un archivo WAV: `autrum.process_wav('archivo.wav')`

## Formato de Archivo .atm

El archivo .atm es un formato binario que contiene:

- Audio original
- Tasa de muestreo
- Datos de la transformada de Fourier

## Notas

- La aplicación utiliza PyAudio para la captura de audio
- La visualización se realiza con Matplotlib
- El análisis de frecuencia utiliza scipy.fft
