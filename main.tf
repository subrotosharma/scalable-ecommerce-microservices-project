terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Remote State Backend
terraform {
  backend "s3" {
    bucket         = "marketplace-pro-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "marketplace-pro-terraform-locks"
    encrypt        = true
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  project_name         = var.project_name
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b"]
}

# ECR Module
module "ecr" {
  source = "./modules/ecr"
  
  project_name = var.project_name
  repositories = var.ecr_repositories
}

# EKS Module
module "eks" {
  source = "./modules/eks"
  
  project_name        = var.project_name
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  kubernetes_version = var.kubernetes_version
  instance_types     = var.eks_instance_types
  desired_capacity   = var.eks_desired_capacity
  max_capacity       = var.eks_max_capacity
  min_capacity       = var.eks_min_capacity
}

# RDS Module
module "rds" {
  source = "./modules/rds"
  
  project_name       = var.project_name
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  db_username       = var.db_username
}

# ElastiCache Module
module "elasticache" {
  source = "./modules/elasticache"
  
  project_name       = var.project_name
  vpc_id            = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
}

# ALB Module
module "alb" {
  source = "./modules/alb"
  
  project_name      = var.project_name
  vpc_id           = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = module.route53.certificate_arn
}

# Route53 Module
module "route53" {
  source = "./modules/route53"
  
  project_name  = var.project_name
  domain_name   = var.domain_name
  alb_dns_name  = module.alb.dns_name
  alb_zone_id   = module.alb.zone_id
}

# Secrets Manager Module
module "secrets" {
  source = "./modules/secrets-manager"
  
  project_name = var.project_name
  db_password  = random_password.db_password.result
  jwt_secret   = random_password.jwt_secret.result
}

# Random passwords
resource "random_password" "db_password" {
  length  = 16
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 32
  special = false
}