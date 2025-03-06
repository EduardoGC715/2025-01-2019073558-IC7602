## José Eduardo Gutiérrez Conejo \- 2019073558

## Redes

## Lectura 2: Classification of Network Architectures

1. *Explique la diferencia entre una WAN y una MAN.*

La diferencia entre una MAN y una WAN es el área que cubren, en el caso de una MAN esta área puede ser de unos 100 km, mientras que para una WAN puede llegar a cubrir países o continentes enteros.

2. *Explique las diferencias entre una red orientada a conexión y una red no orientada a conexión*

Una red orientada a conexión establece primero una conexión antes de la transmisión de datos para que los paquetes se entreguen en orden y sin errores mientras que una red no orientada a conexión no requiere establecer una conexión y los paquetes pueden enviarse de manera independiente pero sin la seguridad de que lleguen a su destino.

3. *¿Qué es una red punto a punto? Explique cómo implementarla de acuerdo con la lectura.*

Una red punto a punto es un tipo de red donde la comunicación ocurre directamente entre dos sistemas. Existen dos formas para construir un tipo de red de esta forma, la primera mediante Circuit Switching, que se establece un camino dedicado entre los sistemas finales antes de la comunicación. Durante la sesión, los recursos necesarios para la transmisión están reservados. Y la otra mediante Packet switching, en el cual no se reserva un camino fijo, si no que los datos se dividen en paquetes que usan los recursos bajo demanda. Esto puede generar retrasos si hay congestión en la red.

Para implementar una red punto a punto, se necesita establecer una conexión física o lógica directa entre dos dispositivos, después elegir entre Circuit Switching o Packet Switching y finalmente configurar los dispositivos para intercambiar información sin necesidad de intermediarios.

4. *Explique los conceptos de FDM y TDM*

FDM y TDM son técnicas utilizadas para transmitir múltiples señales a través de un mismo medio de comunicación. En el caso de FDM, esta divide el ancho de banda disponible en varias bandas de frecuencia, asignando cada una a una señal diferente, mientras que TDM comparte el canal de comunicación asignando intervalos de tiempo específicos a cada señal. 