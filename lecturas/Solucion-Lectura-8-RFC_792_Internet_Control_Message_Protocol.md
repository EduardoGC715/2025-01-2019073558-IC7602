## José Eduardo Gutiérrez Conejo \- 2019073558

## Redes

## Lectura 8: RFC 792 \- Internet Control Message Protocol

1. *Explique el funcionamiento de ICMP. Comente las aplicaciones de este protocolo en las comunicaciones.*

El propósito principal del ICMP es proporcionar retroalimentación sobre problemas que pueden surgir durante la transmisión de datagramas en una red interconectada de sistemas llamada Catenet. Los dispositivos que interconectan redes son denominados gateways , y estos utilizan un protocolo especial llamado Gateway to  

Este protocolo se acciona cuando un gateway o un host de destino necesita informar al host de origen sobre un error en el procesamiento de un datagrama. Por ejemplo, cuando un datagrama no puede llegar a su destino, cuando un gateway no tiene suficiente capacidad de búfer para reenviarlo, o cuando puede sugerirse una ruta más corta para el envío de tráfico. En estos casos, se proporciona un mecanismo estandarizado para transmitir esos mensajes de error o control.

ICMP también sigue ciertas reglas para evitar problemas como bucles infinitos de mensajes, no se generan mensajes ICMP en respuesta a otros mensajes ICMP, y solo se reportan errores relacionados con el primer fragmento de un datagrama fragmentado, es decir, el fragmento cuyo desplazamiento es igual a cero.