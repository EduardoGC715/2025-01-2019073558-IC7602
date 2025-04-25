variable "aws_ami" {
  description = "AMI ID para la instancia DNS"
  type        = string
}

variable "api_port" {
  description = "Puerto de la API que usará la instancia"
  type        = number
}

variable "checkers" {
  description = "Lista de configuraciones para  of health checker configs"
  type = list(object({
    id        = string
    lat       = string
    lon       = string
    country   = string
    continent = string
  }))
}
# https://dev.to/pwd9000/terraform-complex-variable-types-173e

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