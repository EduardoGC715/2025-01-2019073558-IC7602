# Script de configuración de terraform para la creación de la infraestructura del P1 de Redes
# Basado en https://developer.hashicorp.com/terraform/tutorials/aws-get-started/aws-build
# https://developer.hashicorp.com/terraform/tutorials/aws-get-started/aws-remote

terraform {
  cloud {
    organization = "Proyectos-Redes"
    workspaces {
      name = "P1-Redes-DNS"
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

module "networking" {
  source = "./modules/networking"
}

data "template_file" "dns_docker_compose" {
  template = file("${path.module}/scripts/docker-compose-dns.tpl.yml")
  vars = {
    dns_api_port    = var.dns_api_port
    dns_server_host = var.dns_server.host
    dns_server_port = var.dns_server.port
  }
}

module "dns_instance" {
  source   = "./modules/dns_instance"
  aws_ami  = var.aws_ami
  dns_api_port = var.dns_api_port

  user_data = templatefile("${path.module}/scripts/install.tftpl", {
    DOCKER_COMPOSE_YML = data.template_file.dns_docker_compose.rendered
  })

  vpc_id    = module.networking.vpc_id
  subnet_id = module.networking.public_subnet_id
}

data "template_file" "private_docker_compose" {
  template = file("${path.module}/scripts/docker-compose-private.tpl.yml")
  vars = {
    api_port    = var.api_port
    apache_port = var.apache_port
  }
}

module "private_instance" {
  source   = "./modules/private_instance"
  aws_ami  = var.aws_ami
  api_port = var.api_port
  apache_port = var.apache_port

  user_data = templatefile("${path.module}/scripts/install.tftpl", {
    DOCKER_COMPOSE_YML = data.template_file.private_docker_compose.rendered
  })

  vpc_id    = module.networking.vpc_id
  public_subnet_id = module.networking.public_subnet_id
  public_subnet_cidr_block = module.networking.public_subnet_cidr_block
  private_subnet_id = module.networking.private_subnet_id

  depends_on = [module.networking.nat_gateway_id]
}

module "zonal_cache_instance" {
  for_each = var.countries

  source   = "./modules/zonal_cache_instance"
  aws_ami  = var.aws_ami
  country = each.key

  user_data = templatefile("${path.module}/scripts/install.tftpl", {
    DOCKER_COMPOSE_YML = templatefile("${path.module}/scripts/docker-compose-zonal-cache.tpl.yml", {
      vercel_api    = var.vercel_api
      country       = each.key
      fetch_interval = var.fetch_interval
      vercel_ui     = var.vercel_ui
      vercel_token  = var.vercel_token
      vercel_edge_config_id = var.vercel_edge_config_id
    })
  })

  vpc_id    = module.networking.vpc_id
  subnet_id = module.networking.public_subnet_id
}
