variable "aws_ami" {
  description = "The AMI to use for the instance"
  default     = "ami-0f9de6e2d2f067fca" # Ubuntu 22.04 LTS Jammy Jellyfish
}
# https://cloud-images.ubuntu.com/locator/ec2/

variable "api_port" {
  description = "The port for the DNS API"
  default     = 5000
}

variable "user_data" {
  description = "Startup script to be passed to the EC2 instance"
  type        = string
}

variable "subnet_id" {
  description = "The ID of the subnet to launch the instance in"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC to launch the instance in"
  type        = string
}