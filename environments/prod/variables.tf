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

variable "prod_account_id" {
  description = "AWS account ID for prod environment"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.2.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.2.1.0/24", "10.2.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.2.10.0/24", "10.2.20.0/24"]
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.28"
}

variable "eks_instance_types" {
  description = "Instance types for EKS node group"
  type        = list(string)
  default     = ["m5.large"]
}

variable "eks_desired_capacity" {
  description = "Desired capacity for EKS node group"
  type        = number
  default     = 3
}

variable "eks_max_capacity" {
  description = "Maximum capacity for EKS node group"
  type        = number
  default     = 10
}

variable "eks_min_capacity" {
  description = "Minimum capacity for EKS node group"
  type        = number
  default     = 3
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "appdb"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "dbadmin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r5.large"
}

variable "ecr_repositories" {
  description = "List of ECR repository names"
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