# Security Group for Private Instances
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
resource "aws_security_group" "checker_instance_sg" {
  vpc_id = var.vpc_id
  name   = "checker_instance_sg"

  tags = {
    Name = "Checker Instance Security Group"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_ssh_instance" {
  security_group_id = aws_security_group.checker_instance_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "allow_outbound_traffic_checker_instance" {
  security_group_id = aws_security_group.checker_instance_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_key_pair" "checker_instance_key" {
  key_name   = "checker_instance_key"
  public_key = file("${path.module}/../../ssh_keys/checker_instance_key.pub")
}

resource "aws_instance" "checker_instance" {
  ami                    = var.aws_ami
  instance_type          = "t2.micro"
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.checker_instance_sg.id]
  key_name               = aws_key_pair.checker_instance_key.key_name

  user_data = var.user_data
  tags = {
    Name = "Checker Instance"
  }
}
