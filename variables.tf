variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "marketplace-pro"
}

variable "account_id" {
  description = "AWS Account ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "eks_instance_types" {
  description = "EKS node instance types"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_desired_capacity" {
  description = "EKS desired capacity"
  type        = number
  default     = 2
}

variable "eks_max_capacity" {
  description = "EKS max capacity"
  type        = number
  default     = 10
}

variable "eks_min_capacity" {
  description = "EKS min capacity"
  type        = number
  default     = 1
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "dbadmin"
}

variable "ecr_repositories" {
  description = "ECR repository names"
  type        = list(string)
  default     = []
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "subrotosharma.site"
}