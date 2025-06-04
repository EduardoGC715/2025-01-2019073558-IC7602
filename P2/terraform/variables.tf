variable "aws_ami" {
  description = "AMI ID para la instancia DNS"
  type        = string
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
  type = list(string)
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