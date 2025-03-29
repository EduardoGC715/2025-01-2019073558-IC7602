## Características

- Captura de audio en tiempo real desde el micrófono.
- Visualización de la señal en el dominio del tiempo.
- Análisis de frecuencia en tiempo real usando la Transformada de Fourier.
- Capacidad de guardar los datos en formato .atm.
- Procesamiento de archivos .wav.
- Controles de grabación (iniciar, pausar, continuar, detener).

## Requisitos

- Tener instalado el paquete pip
- Las dependencias listadas en requirements.txt

## Instalación

1. Clonar repositorio
2. Asegurarse de tener la versión más reciente de pip.
3. Instalar las dependencias: pip install -r requirements.txt.

## Uso

Ejecutar la aplicación:

1. python main.py
2. Dentro de la aplicación se abre una ventana con la opcion de Analizador, Reproductor y Comparador
3. Analizador: Permite grabar desde el micrófono con la opción "Streaming (micrófono)" o convertir un archivo .wav a .atm utilizando la opción "Batch (Archivo)".
4. Reproductor: Permite reproducir, pausar, reanudar y detener un archivo .atm.
5. Comparador: Se carga el archivo .atm que se quiere probar.
   5.1 Se graba la palabra que se desea comparar.
   5.2 Se presiona el botón "Detener y continuar".
   5.3 Se muestra el comparador, donde, al presionar el botón "Reproducir", se puede escuchar la parte similar.

## Uso de las pruebas

1. Para ejecutar todas las pruebas, se debe ejecutar el siguiente comando: python -m pytest -v
2. Si se quiere ejecutar un único archivo, se debe modificar el nombre del archivo: python -m pytest tests/test_player.py -v
