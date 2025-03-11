# Basado en https://spacelift.io/blog/terraform-aws-vpc
terraform {
  cloud {
    organization = "Proyectos-Redes"
    workspaces {
      name = "PO-Redes"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}


provider "aws" {
  region = "us-east-1"
}

# Virtual Private Cloud to host subnets
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
resource "aws_vpc" "po_vpc" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "PO VPC"
  }
}

# Public Subnet
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.po_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"

  tags = {
    Name = "PublicSubnet"
  }
}

# Private Subnet
resource "aws_subnet" "private_subnet" {
  vpc_id            = aws_vpc.po_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"
  map_public_ip_on_launch = true
  tags = {
    Name = "PrivateSubnet"
  }
}

# Internet Gateway
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.po_vpc.id

  tags = {
    Name = "PO Internet Gateway"
  }
}

# Route Table
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.po_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "PO Public Route Table"
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.po_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "PO Private Route Table"
  }
}

resource "aws_route_table_association" "private_assoc" {
  subnet_id      = aws_subnet.private_subnet.id
  route_table_id = aws_route_table.private_rt.id
}

# Security Group for Private Instances
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
resource "aws_security_group" "apache_sg" {
  vpc_id = aws_vpc.po_vpc.id
  name   = "apache_sg"

  tags = {
    Name = "Apache Security Group"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_ssh_apache" {
  security_group_id = aws_security_group.apache_sg.id
  cidr_ipv4         = aws_vpc.po_vpc.cidr_block
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "allow_http_apache" {
  security_group_id = aws_security_group.apache_sg.id
  cidr_ipv4         = aws_subnet.public_subnet.cidr_block
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "allow_outbound_traffic_apache" {
  security_group_id = aws_security_group.apache_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_key_pair" "apache_key" {
  key_name   = "apache-key"
  public_key = file("${path.module}/apache_key.pub")
}

resource "aws_instance" "apache1_instance" {
  ami             = var.aws_ami
  instance_type   = "t2.micro"
  subnet_id       = aws_subnet.private_subnet.id
  security_groups = [aws_security_group.apache_sg.id]
  key_name        = aws_key_pair.apache_key.key_name

  tags = {
    Name = "Apache 1 Instance"
  }

  user_data = templatefile("${path.module}/instance_scripts/apache1.sh", {
    DOCKER_INSTALL_SCRIPT = file("${path.module}/instance_scripts/docker_install.sh")
  })
}

resource "aws_instance" "apache2_instance" {
  ami             = var.aws_ami
  instance_type   = "t2.micro"
  subnet_id       = aws_subnet.private_subnet.id
  security_groups = [aws_security_group.apache_sg.id]
  key_name        = aws_key_pair.apache_key.key_name

  tags = {
    Name = "Apache 2 Instance"
  }

  user_data = templatefile("${path.module}/instance_scripts/apache2.sh", {
    DOCKER_INSTALL_SCRIPT = file("${path.module}/instance_scripts/docker_install.sh")
  })
}

resource "aws_security_group" "router_sg" {
  vpc_id = aws_vpc.po_vpc.id
  name   = "router_sg"

  tags = {
    Name = "Router Security Group"
  }
}

resource "aws_vpc_security_group_ingress_rule" "allow_ssh_router" {
  security_group_id = aws_security_group.router_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "allow_apache" {
  security_group_id = aws_security_group.router_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 8080
  to_port           = 8081
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "allow_asterisk_tcp" {
  security_group_id = aws_security_group.router_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 5601
  to_port           = 5601
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "allow_asterisk_udp" {
  security_group_id = aws_security_group.router_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 5601
  to_port           = 5601
  ip_protocol       = "udp"
}

resource "aws_vpc_security_group_ingress_rule" "allow_http_router" {
  security_group_id = aws_security_group.router_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "allow_outbound_traffic_router" {
  security_group_id = aws_security_group.router_sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_instance" "router_instance" {
  ami             = var.aws_ami
  instance_type   = "t2.micro"
  subnet_id       = aws_subnet.public_subnet.id
  security_groups = [aws_security_group.router_sg.id]

  tags = {
    Name = "Router Instance"
  }

  user_data = templatefile("${path.module}/instance_scripts/router.sh", {
    DOCKER_INSTALL_SCRIPT  = file("${path.module}/instance_scripts/docker_install.sh")
    APACHE1URL_PLACEHOLDER = aws_instance.apache1_instance.private_ip
    APACHE2URL_PLACEHOLDER = aws_instance.apache2_instance.private_ip
  })
}

# Elastic IP for Router Instance
# https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
resource "aws_eip" "router_eip" {
  instance = aws_instance.router_instance.id
}

# Output
output "router_eip" {
  description = "The Elastic IP of the Router Instance"
  value       = aws_eip.router_eip.public_ip
}