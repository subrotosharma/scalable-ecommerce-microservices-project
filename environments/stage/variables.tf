variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "multi-account-infra"
}

variable "stage_account_id" {
  description = "Stage AWS account ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.2.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.2.1.0/24", "10.2.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.2.10.0/24", "10.2.20.0/24"]
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "eks_instance_types" {
  description = "EKS node instance types"
  type        = list(string)
  default     = ["t3.large"]
}

variable "eks_desired_capacity" {
  description = "EKS desired capacity"
  type        = number
  default     = 3
}

variable "eks_max_capacity" {
  description = "EKS max capacity"
  type        = number
  default     = 6
}

variable "eks_min_capacity" {
  description = "EKS min capacity"
  type        = number
  default     = 2
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "appdb"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "Database instance class"
  type        = string
  default     = "db.t3.small"
}

variable "ecr_repositories" {
  description = "ECR repository names"
  type        = list(string)
  default     = [
    "user-service",
    "product-service", 
    "order-service",
    "payment-service",
    "inventory-service",
    "notification-service",
    "cart-service",
    "review-service",
    "search-service",
    "api-gateway",
    "web-frontend",
    "seller-service",
    "recommendation-service",
    "fraud-detection-service",
    "analytics-service",
    "logistics-service"
  ]
}