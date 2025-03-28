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

### Diferencias anatómicas y de frecuencia
Empezando desde el origen de todo, lo cual sería nuestra estructura anatómica mediante la cual somos capaces de producir sonidos y por ende nuestra voz, va a ir directamente ligada a la forma en la que esta suena, debido a las diferencias que tenemos las personas en cuanto el tamaño, forma, configuración u otro aspecto en los cuales los distintos órganos involucrados en producir nuestra voz como lo son el diafragma, laringe, cuerdas vocales, garganta, cavidad oral y fosas nasales, se varían levemente entre todas las personas, causa que cada quien genere sonidos de distinta manera. Estas variaciones afectan como suena nuestra voz, ya que provocan que se produzca mayor potencia en ciertos rangos de frecuencia y menor en otros, utilizando distintos armónicos para producir el sonido que escuchamos como voz. 

### Resultados obtenidos
A continuación se realizará un análisis de resultados obtenidos mediante nuestra aplicación Autrum. Esta sé probo por tres integrantes del grupo, quienes grabaron la frase "hola esta es la tarea de redes" utilizando el analizador para generar los archivos .atm, mediante el uso de estos en el reproductor, se mostraron los gráficos del dominio de tiempo y dominio de frecuencia, con los cuales se muestra de manera visual las diferencias que tienen nuestras voces, mediante el siguiente análisis de cada gráfica demostraremos porque es que estas son distintas unas de otras:

**1. Daniel Granados**  

<img src="imagenes/Daniel.png" width="400" height="250"/>

Dominio del tiempo
- Se muestra una señal continua y estable, con ondas bien definidas y pocos silencios cortantes.
- Hay una gran variación en la amplitud con valores mayores a 6000, lo cual indica una señal altamente energética.
- Lo anterior sugiere que la relación señal/ruido es alta, por lo que el contenido obtenido de la voz domina sobre el ruido térmico de fondo. 

Dominio de la frecuencia
- El espectro muestra un pico principal alrededor de los 500 Hz, dando indicaciones de la frecuencia fundamental de la voz. 
- En los rangos de 900-1000 Hz, se observan múltiples armónicos claramente definidos lo cual indica una señal con alto contenido armónico.
- A partir de los 1000 Hz los armónicos comienzan a atenuarse rápidamente, y después de los 3000 Hz son muy poco visibles por lo que se denota el filtro de corte. 


**2. Diego Granados**

<img src="imagenes/DiegoG.png" width="400" height="250"/>

Dominio del tiempo 
- Se muestra una señal más densa, con actividad más constante a lo largo del tiempo con pocas pausas entre palabras.
- Se tiene una menor amplitud alrededor de los 4000, aunque más sostenidas, lo que indica una señal menos intensa que la de Daniel, pero más estable.
- La articulación parece ser más suave, con transiciones que indican una frecuencia fundamental bastante constante.


Dominio de la frecuencia
- Al igual que Daniel, tiene un pico claro alrededor de los 500 Hz.
- Más el espectro armónico es más abundante y continuo entre los 400 y 1000 Hz, con una menor caída en la magnitud.
- La señal conserva armónicas más densas, lo que indica una voz más grave y un menor riesgo de distorsión. 

**3. Diego Mora**

<img src="imagenes/DiegoM.png" width="400" height="250"/>

Dominio del tiempo 
- Se muestra una señal con múltiples segmentos de silencio, interrumpidos por picos bruscos de amplitud.
- Esto indica que es una emisión vocal más cortada, con pausas más pronunciadas entre palabras a diferencia de la fluidez de los otros dos.
- La amplitud máxima son altas, llegando hasta más de 6000, pero aparecen inconstantemente lo que indica un alta variabilidad y puede dificultar la descomposición de armónicos. 

Dominio de la frecuencia
- El pico fundamental igual aparece alrededor de los 500 Hz, pero el número de armónicos presentes es significativamente menor. 
- Los armónicos caen rápidamente a partir de los 600 Hz y se pierden casi por completo antes de los 1000 Hz.
- Sugiere que es una señal que por su irregularidad y menor energía en promedio, no conserva suficiente armónicos para reconstruirse de manera fácil.


### Interpretación de resultados

Basándose en la información obtenida de los gráficos generados por los integrantes del grupo y sus distintas características, se concluye que las diferencias en las voces se deben a que cada una tiene una composición armónica única, determinada por su frecuencia fundamental, la forma en la que cada persona articula las palabras y la energía con la cual emite su voz. 
De igual forma, la señal compuesta se ve afectada por las limitaciones del canal, como lo son la atenuación de las frecuencias altas y el ruido térmico del sistema. Las voces que tienen una emisión más estable y una mayor abundancia de armónicos, como lo es la de Diego Granados, van a ser las que se van a poder reconstruir digitalmente con una mayor fidelidad y ser más cercanas a su voz original, por otro lado las señales más irregulares o fragmentadas, como la de Diego Mora, pierden armónicos importantes, por lo que tiene un resultado más distorsionada y difícil de interpretar.

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
