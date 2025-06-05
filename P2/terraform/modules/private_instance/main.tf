# Security Group for Private Instance
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
resource "aws_security_group" "private_instance_sg" {
  vpc_id = var.vpc_id
  name   = "private_instance_sg"

  tags = {
    Name = "Private Instance Security Group"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_apache" {
  security_group_id = aws_security_group.private_instance_sg.id
  cidr_ipv4         = var.public_subnet_cidr_block
  from_port         = var.apache_port
  to_port           = var.apache_port
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "allow_api" {
  security_group_id = aws_security_group.private_instance_sg.id
  cidr_ipv4         = var.public_subnet_cidr_block
  from_port         = var.api_port
  to_port           = var.api_port
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "allow_outbound_traffic_private_instance" {
  security_group_id = aws_security_group.private_instance_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_instance" "private_instance" {
  ami                    = var.aws_ami
  instance_type          = "t2.micro"
  subnet_id              = var.private_subnet_id
  vpc_security_group_ids = [aws_security_group.private_instance_sg.id]

  user_data = var.user_data
  tags = {
    Name = "Private Instance"
  }
}
