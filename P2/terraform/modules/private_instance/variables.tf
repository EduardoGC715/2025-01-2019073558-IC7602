variable "aws_ami" {
  description = "The AMI to use for the instance"
  default     = "ami-0f9de6e2d2f067fca" # Ubuntu 22.04 LTS Jammy Jellyfish
}
# https://cloud-images.ubuntu.com/locator/ec2/

variable "user_data" {
  description = "Startup script to be passed to the EC2 instance"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC to launch the instance in"
  type        = string
}

variable "public_subnet_id" {
  description = "The public subnet in vpc"
  type        = string
}

variable "public_subnet_cidr_block" {
  description = "The public subnet in vpc CIDR block"
  type        = string
}

variable "private_subnet_id" {
  description = "The private subnet in vpc"
  type        = string
}

variable "apache_port" {
  description = "The port on which the Apache server will be accessible"
  type        = number
  default     = 80
}

variable "api_port" {
  description = "The port on which the Rest API will be accessible"
  type        = number
  default     = 5000
}
