# Instituto Tecnológico de Costa Rica

## Campus Tecnológico Central Cartago

## Escuela de Ingeniería en Computación

# Preguntas - Tarea de Computación 1

### Redes - Grupo 2

### Prof. Gerardo Nereo Campos Araya

### Fecha: Marzo 2025

### Daniel Granados Retana, carné 2022104692

### Diego Manuel Granados Retana, carné 2022158363

### David Fernández Salas, carné 2022045079

### Diego Mora Montes, carné 2022104866

### Eduardo Gutierrez Conejo, carné 2019073558

### 28 de Marzo del 2024

### IS 2025

## 1. ¿Por qué las voces de los integrantes son diferentes?
Las voces de los integrantes del grupo se escuchan de manera distinta por diversas razones. A continuación se presentan y explican los factores influyentes en la variación, así como su impacto en los resultados obtenidos: 

### Diferencias anatómicas y de frecuencia
Debido a las diferencias que tenemos las personas en cuanto el tamaño, forma, configuración u otro aspecto en los cuales los distintos órganos involucrados en producir nuestra voz como lo son el diafragma, laringe, cuerdas vocales, garganta, cavidad oral y fosas nasales, se diferencian cada quien genera sonidos de distinta manera. Estas variaciones afectan como suena nuestra voz, ya que producen que se produzca mayor potencia en ciertos rangos de frecuencia y menor en otros, utilizando distintos armónicos para producir el sonido que escuchamos como voz. 

### Ancho de banda y representación digital
Como se indica en el capítulo 2.1, "Bases teóricas para la comunicación de datos", del libro Computer Networks. 4ta edición de A. Tanenbaum, ningún medio de transmisión es capaz de transportar todas las frecuencias sin perdida. Ya sean canales físicos guiados o no guiados, todos tienen un ancho de banda limitado, por lo que solo se puede transmitir con fidelidad un rango específico de la frecuencias. 
En el caso del audio, esto afecta de forma directa la forma en la que las voces son capturadas y reproducidas. Por ejemplo, los micrófonos utilizados para grabar nuestras voces, no van a poder captar todo el espectro de frecuencia que producimos al hablar, estos dispositivos van a tener limitados a su configuración y su la capacidad física del dispositivo, lo que hace que la voz suene distinto a como se escucha en persona. 

### Aplicación en Autrum
A continuación se presentan los resultados del analizador obtenidos por dos de los miembros de nuestro grupo de trabajo. Para esta demostración se utilizó la frase: "hola esta es la tarea de redes".
Aunque todos dijeran exactamente lo mismo, al observar los gráficos tanto de dominio del tiempo como en los de dominio de frecuencia, se pueden notar diferencias evidentes. Las siguientes son algunas de esas razones:

- Cada persona posee una configuración anatómica diferente, lo que influye en la frecuencia fundamental y los armónicos que componen su voz. 
- Algunas voces tienden a ser más graves o más agudas, lo que se traduce en distintos patrones de potencia y distribución espectral.
- Se observa como ambos resultados la presencia de señales en los momentos de silencio es distinta. Esto puede ser producido por las diferencias en el hardware de grabación. Cada dispositivo tiene un rango de sensibilidad y un ancho de banda distinto, lo cual afecta la fidelidad de la señal capturada.

<div style="display: flex; gap: 10px;">
  <img src="imagenes/DiegoG.png" alt="drawing" width="400" height="250"/>
  <img src="imagenes/DiegoM.png" alt="drawing" width="400" height="250"/>
</div>

---

## 2. ¿Por qué la comparación de voces es tan poco exacta mediante armónicos?
Aunque mediante el uso de la Transformada de Fourier es posible identificar los armónicos de una señal y utilizarlos como base para comparar grabaciones de audio, esta técnica resulta limitada y más propensa a errores en comparación con el método de análisis por potencia. A continuación, se presentan las principales razones por las cuales la comparación basada en armónicos resulta poco precisa:

### La voz no es una sinusoide perfecta
Según el Teorema de Fourier nuestras voces están compuestas por señales complejas formadas por la superposición de múltiples sinusoides, más en realidad estos no son tonos puros. Mientras una persona habla genera un patrón único de armónicos dependiendo de su configuración anatómica, intensidad del habla, postura y otros factores. Estos factores hace que las voces no se repitan de manera exacta entre grabaciones, incluso cuando decimos la misma palabra.

### Los armónicos no representan nuestra identidad de voz
Aunque los armónicos representan una parte importante del timbre y la forma en la que nuestra voz se diferencia una de otra, no van a ser suficientes para identificar una voz de manera precisa. Dos voces pueden compartir una misma estructura armónica parecida, pero tener una diferencia notable en la amplitud, fase, contenido inarmónico y ruido. Por lo que los armónicos no se pueden llegar a considerar una huella digital confiable a la hora de realizar las comparaciones. 


### Pequeñas variaciones cambian la forma de onda
Como se menciona en el artículo "sinusoides y sonidos compuestos: armónicos y parciales en audio", pequeños cambios en como se excita una fuente sonora (ya sea hablar con un mayor tono o cambiar la posición del micrófono que utilizamos) alteran la energía que reciben ciertos armónicos. Esto cambia la forma de la onda final, aunque la frase que se dice sea la misma. Por lo que dos grabaciones aunque sean de la misma persona pueden producir espectros de frecuencia diferentes.

### Presencia de ruido y componentes inarmónicas
Múltiples de las grabaciones realizadas no solo contienen la voz del hablante, sino que también ruido de fondo que afecta la estructura de las ondas capturadas. Por más pequeñas que estas ondas de ruido sean, estos elementos introducen componentes que no pertenecen a la serie armónica del hablante, lo que interfiere con el análisis y la descomposición de las señales compuestas por sus armónicos. Esto dificulta una comparación precisa, ya que el ruido es un factor impredecible que altera la forma de la onda original.

---

## Referencias

- Tanenbaum, A. (2002). *Computer Networks* (4ta ed.). Chapter 2: The Physical Layer.

- Apuntes del curso de Redes.

- [Fernández-Cid, P. (2017). *Sinusoides y sonidos compuestos: armónicos y parciales en audio*. Hispasonic.](https://www.hispasonic.com/tutoriales/sinusoides-sonidos-compuestos-armonicos-parciales-audio/43309)

- [The Voice Foundation. *Anatomy & Physiology of Voice Production*.](https://voicefoundation.org/health-science/voice-disorders/anatomy-physiology-of-voice-production/)
