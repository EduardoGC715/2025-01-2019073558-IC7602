## José Eduardo Gutiérrez Conejo \- 2019073558

## Redes

## Lectura 10: Server Load Balancing

1. *¿Qué métricas de rendimiento son importantes en Load Balancers que deben ser examinadas con Observabilidad?*

Algunas de las métricas más importantes relacionadas al rendimiento de un Load Balancer son:

* Conexiones por segundo, esto indica cuántas nuevas conexiones se están estableciendo por segundo, lo cual es esencial para medir la capacidad de manejo de tráfico en tiempo real.   
* Throughput, mide la cantidad de datos transmitidos, medido en Mbps o Gbps, permitiendo evaluar el volumen de tráfico que fluye a través del sistema.   
* Total de conexiones concurrentes, representa la cantidad de conexiones activas simultáneas un alto nivel de conexiones abiertas puede indicar riesgo de saturación o la necesidad de escalar el sistema.

2. *Fuera de network hardware provisioning, ¿Que otra aplicación tiene esta información?*

Estas métricas también son utilizadas en aplicaciones distribuidas y microservicios mediante Prometheus, Datadog o New Relic,  estas permiten detectar cuellos de botella, errores y degradaciones del servicio. Estas métricas también son esenciales en sistemas como Kubernetes, donde los Load Balancers gestionan el acceso a los servicios internos, y estas mediciones permiten tomar decisiones como escalabilidad, resiliencia del sistema y respuesta ante incidentes o picos de carga.