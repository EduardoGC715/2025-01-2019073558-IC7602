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

module "dns_instance" {
  source   = "./modules/dns_instance"
  aws_ami  = var.aws_ami
  api_port = var.api_port

  user_data = templatefile("${path.module}/scripts/install.tftpl", {
    DOCKER_COMPOSE_YML = file("${path.module}/scripts/docker-compose.yml")
    checkers = var.checkers
  })

  vpc_id    = module.networking.vpc_id
  subnet_id = module.networking.public_subnet_id
}

