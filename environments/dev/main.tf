terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "multi-account-infra-terraform-state-12345678"  # Update with actual bucket name
    key            = "environments/dev/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "multi-account-infra-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  
  assume_role {
    role_arn = "arn:aws:iam::${var.dev_account_id}:role/TerraformExecutionRole"
  }
}

locals {
  environment = "dev"
  name_prefix = "${var.project_name}-${local.environment}"
  
  common_tags = {
    Environment = local.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

module "vpc" {
  source = "../../modules/vpc"

  name_prefix            = local.name_prefix
  vpc_cidr              = var.vpc_cidr
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  tags                  = local.common_tags
}

module "eks" {
  source = "../../modules/eks"

  cluster_name         = "${local.name_prefix}-cluster"
  kubernetes_version   = var.kubernetes_version
  subnet_ids          = concat(module.vpc.public_subnet_ids, module.vpc.private_subnet_ids)
  private_subnet_ids  = module.vpc.private_subnet_ids
  endpoint_public_access = true  # Dev environment allows public access
  instance_types      = var.eks_instance_types
  desired_capacity    = var.eks_desired_capacity
  max_capacity        = var.eks_max_capacity
  min_capacity        = var.eks_min_capacity
  tags                = local.common_tags
}

module "rds" {
  source = "../../modules/rds"

  name_prefix       = local.name_prefix
  vpc_id           = module.vpc.vpc_id
  vpc_cidr_block   = module.vpc.vpc_cidr_block
  subnet_ids       = module.vpc.private_subnet_ids
  db_identifier    = "${local.name_prefix}-db"
  db_name          = var.db_name
  username         = var.db_username
  password         = var.db_password
  instance_class   = var.db_instance_class
  deletion_protection = false  # Dev environment
  tags             = local.common_tags
}

module "ecr" {
  source = "../../modules/ecr"

  repository_names = var.ecr_repositories
  tags            = local.common_tags
}

module "elasticache" {
  source = "../../modules/elasticache"

  name_prefix       = local.name_prefix
  vpc_id           = module.vpc.vpc_id
  vpc_cidr_block   = module.vpc.vpc_cidr_block
  subnet_ids       = module.vpc.private_subnet_ids
  node_type        = "cache.t3.micro"
  num_cache_clusters = 1
  tags             = local.common_tags
}

module "secrets" {
  source = "../../modules/secrets-manager"

  name_prefix  = local.name_prefix
  db_username  = var.db_username
  db_password  = var.db_password
  tags         = local.common_tags
}

module "monitoring" {
  source = "../../modules/monitoring"

  name_prefix    = local.name_prefix
  cluster_name   = module.eks.cluster_name
  service_names  = var.ecr_repositories
  region         = var.aws_region
  tags           = local.common_tags
}

module "autoscaling" {
  source = "../../modules/autoscaling"

  cluster_name    = module.eks.cluster_name
  oidc_issuer_url = module.eks.oidc_issuer_url
  tags            = local.common_tags
}