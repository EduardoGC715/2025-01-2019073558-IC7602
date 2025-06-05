# Security Group for Zonal Cache Instances
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
resource "aws_security_group" "zonal_cache_instance_sg" {
  vpc_id = var.vpc_id
  name   = "zonal_cache_instance_sg_${var.country}"	

  tags = {
    Name = "Zonal Cache Instance Security Group ${var.country}"	
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_http" {
  security_group_id = aws_security_group.zonal_cache_instance_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "allow_https" {
  security_group_id = aws_security_group.zonal_cache_instance_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "allow_outbound_traffic_zonal_cache_instance" {
  security_group_id = aws_security_group.zonal_cache_instance_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}


resource "aws_instance" "zonal_cache_instance" {
  ami                    = var.aws_ami
  instance_type          = "t2.micro"
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.zonal_cache_instance_sg.id]

  user_data = var.user_data
  tags = {
    Name = "Zonal Cache Instance - ${var.country}"
  }
}
