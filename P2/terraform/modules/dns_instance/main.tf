# Security Group for Private Instances
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
resource "aws_security_group" "dns_instance_sg" {
  vpc_id = var.vpc_id
  name   = "dns_instance_sg"

  tags = {
    Name = "DNS Instance Security Group"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_dns_dns_instance" {
  security_group_id = aws_security_group.dns_instance_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 53
  to_port           = 53
  ip_protocol       = "udp"
}

resource "aws_vpc_security_group_ingress_rule" "allow_api_dns_instance" {
  security_group_id = aws_security_group.dns_instance_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = var.dns_api_port
  to_port           = var.dns_api_port
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "allow_outbound_traffic_dns_instance" {
  security_group_id = aws_security_group.dns_instance_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}


resource "aws_instance" "dns_instance" {
  ami                    = var.aws_ami
  instance_type          = "t2.micro"
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.dns_instance_sg.id]

  user_data = var.user_data
  tags = {
    Name = "DNS Instance"
  }
}
