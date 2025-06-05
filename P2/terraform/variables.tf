variable "aws_ami" {
  description = "AMI ID para la instancia DNS"
  type        = string
}

variable "dns_api_port" {
  description = "Puerto del  DNS API que usará la instancia"
  type        = number
  default = 443
}

variable "dns_server" {
  description = "Dirección del servidor DNS que usará el DNS API para resolver nombres desconocidos"
  type = object({
    host = string
    port = number
  })
  default = {
    host = "8.8.8.8",
    port = 53
  }
}

variable "api_port" {
  description = "Puerto de la API que usará la instancia"
  type        = number
  default = 5000
}

variable "apache_port" {
  description = "Puerto del apache que usará la instancia"
  type        = number
  default = 80
}

variable "countries" {
  description = "Lista de códigos de países para los que se creará una instancia de caché zonal"
  type = set(string)
}

variable "vercel_ui" {
  description = "Dirección de la interfaz de usuario de Vercel"
  type = string
}

variable "vercel_api" {
  description = "Dirección de la API de Vercel"
  type = string
}

variable "fetch_interval" {
  description = "Intervalo de tiempo en el que la caché zonal actualiza la información"
  type        = number
  default     = 3
}

variable "vercel_token" {
  description = "Token de acceso para la API de Vercel"
  type        = string
  sensitive   = true
}

variable "vercel_edge_config_id" {
  description = "ID del Edge Config de Vercel"
  type        = string
}