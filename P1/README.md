# Proyecto IC7602 - P1: Sistema de Intercepción y Gestión de DNS

Este proyecto está dividido en tres módulos principales: un **Frontend** para la interfaz de usuario, una **API Backend (DNSAPI)** para la gestión de configuraciones, y un módulo llamado **DNS_Interceptor** encargado de interceptar y redirigir peticiones DNS.

## Estructura del Proyecto

├── frontend
├── DNSAPI
└── DNS_Interceptor

### 1. `frontend/`

Aplicación web desarrollada para interactuar con el sistema de redirección DNS. Permite al usuario:

- Visualizar estadísticas, logs y servicios activos.
- Configurar redirecciones personalizadas.
- Consultar dominios bloqueados o redirigidos.

#### Tecnologías usadas:

- React.js
- Bootstrap
- Axios para consumo de API

### 2. `DNSAPI/`

Servidor backend que expone una API RESTful para gestionar configuraciones y datos relacionados con la redirección de DNS. Sus funciones incluyen:

- Registrar nuevos dominios para interceptar o redirigir.
- Consultar registros existentes.
- Proporcionar configuraciones al interceptor.

#### Tecnologías usadas:

- Python (Flask)

### 3. `DNS_Interceptor/`

Este módulo escucha el tráfico DNS en la red y decide si redirigir ciertas solicitudes según las reglas configuradas a través de `DNSAPI`. Incluye:

- Un sniffer DNS personalizado.
- Lógica para modificar respuestas DNS.
- Comunicación con `DNSAPI` para cargar reglas.

#### Tecnologías usadas:

- Python
- Scapy / dnslib
- Servicios de red y sockets

## Requisitos

- Python 3.8+
- Node.js 18+
- Docker

## Cómo ejecutar

### Backend (`DNSAPI`)

En el directorio del P1 se corren los siguientes comandos:

1. pip install -r requirements.txt
2. python ./DNS_API/api.py
