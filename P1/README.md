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

### Ejecución local

A continuación, se describe cómo instalar el sistema localmente en la computadora. Se utilizó un script de Python que corriera los health checkers con base en un JSON y que levantara los componentes del interceptor, el API y la interfaz gráfica con un archivo `docker-compose.yml`.
En la carpeta `/local_installation`, se ejecuta el comando `python install.py`. Para desinstalar el sistema, se ejecuta el script de `uninstall.py`.
Los health checkers a instalar se configuran en el archivo de `checkers.json`.

### Instalación en AWS

A continuación, se describe cómo instalar el proyecto en AWS con Terraform.
Es necesario configurar el proyecto en Terraform.
Se deben obtener las credenciales de AWS, específicamente el AWS_ACCESS_KEY_ID y el AWS_SECRET_ACCESS_KEY. Estos se pueden obtener siguiendo la guía de AWS de cómo [obtener las llaves de acceso](https://aws.amazon.com/blogs/security/how-to-find-update-access-keys-password-mfa-aws-management-console/).
Si se desea almacenar el estado de Terraform en un repositorio compartido, se puede realizar esto con [HCP Terraform. Se puede seguir la guía para configurar el ambiente](https://aws.amazon.com/blogs/security/how-to-find-update-access-keys-password-mfa-aws-management-console/).
Si se desea almacenar el [estado localmente, se puede seguir esta guía](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/aws-build). En ella, se muestra cómo configurar las variables de entorno de AWS para configurar el ambiente.
Hay que inicializar el proyecto de terraform con el comando: `terraform init`.
Para desplegar la infraestructura, se ejecuta el comando: `terraform apply`. Se van a desplegar una serie de cambios. Se escribe la palabra “yes” para confirmar los cambios. Alternativamente, se puede usar el comando `terraform apply -auto-approve`.
Al final, esto imprime una lista de IPs. Estos IPs son los de cada una de las instancias EC2.

Para configurar la instalación, se deben modificar los valores en el archivo de `terraform.tfvars`. Este archivo establece configuraciones de los componentes, como los puertos que usan para la comunicación, cuántos health checkers instalar, etc. Para consultar la lista de las variables que se pueden configurar, se debe consultar el archivo `terraform/variables.tf`:

- aws_ami: AMI ID para la instancia DNS. Tipo: string
- api_host: Nombre de host de la API que usará la instancia. Tipo: string
- api_port: Puerto de la API que usará la instancia. Tipo: number
- checkers: Lista de configuraciones para of health checker configs. Tipo: list(object({ id = string, lat = string, lon = string, country = string, continent = string }))
- dns_server: Dirección del servidor DNS que usará el DNS API para resolver nombres desconocidos. Tipo: object({ host = string, port = number })
  El archivo configurado por defecto es:

```yaml
aws_ami  = "ami-0f9de6e2d2f067fca"
api_port = 443
checkers = [
{
id        = "us-east"
lat       = "40.7128"
lon       = "-74.0060"
country   = "USA"
continent = "North America"
},
{
id        = "europe"
lat       = "48.8566"
lon       = "2.3522"
country   = "France"
continent = "Europe"
},
{
id        = "central-america"
lat       = "9.9281"
lon       = "-84.0907"
country   = "Costa Rica"
continent = "Central America"
}
]
dns_server = {
host = "8.8.8.8"
port = 53
}
```

### Inicialización del sistema

El componente del API utiliza un certificado SSL auto firmado para permitir el uso del protocolo HTTPS. Este, al no ser emitido por una autoridad reconocida de certificados, es desconfiado por los navegadores de Internet. Por lo tanto, si no se reconoce, la interfaz no va a poder conectarse correctamente con el API y no va a funcionar. Por consiguiente, el primer paso es acceder al IP del DNS API por medio del URL https://<dns_api_ip> e ignorar las advertencias del navegador para poder ingresar correctamente. Una vez realizado esto, podemos ingresar a la página por defecto del API.

Ya con eso, podemos acceder a la página de la interfaz con el URL http://<ui_ip> y la información va a cargar correctamente.

### Backend (`DNSAPI`)

En el directorio de DNS/API se corren los siguientes comandos:

1. pip install -r requirements.txt
2. python api.py
