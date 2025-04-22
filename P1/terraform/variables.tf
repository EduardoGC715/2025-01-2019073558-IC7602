variable "aws_ami" {
  description = "AMI ID para la instancia DNS"
  type        = string
}

variable "api_port" {
  description = "Puerto de la API que usará la instancia"
  type        = number
}
