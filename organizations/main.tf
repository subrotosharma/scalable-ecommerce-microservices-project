terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "multi-account-infra-terraform-state-12345678"
    key            = "organizations/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "multi-account-infra-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-west-2"
}

resource "aws_organizations_organization" "main" {
  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "guardduty.amazonaws.com",
    "securityhub.amazonaws.com",
  ]

  feature_set = "ALL"

  enabled_policy_types = [
    "SERVICE_CONTROL_POLICY",
  ]
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "Workloads"
  parent_id = aws_organizations_organization.main.roots[0].id
}

resource "aws_organizations_account" "dev" {
  name  = "Development"
  email = "aws-dev@company.com"
  
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_account" "qa" {
  name  = "Quality Assurance"
  email = "aws-qa@company.com"
  
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_account" "stage" {
  name  = "Staging"
  email = "aws-stage@company.com"
  
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_account" "prod" {
  name  = "Production"
  email = "aws-prod@company.com"
  
  parent_id = aws_organizations_organizational_unit.workloads.id
}

resource "aws_organizations_policy" "deny_root_access" {
  name        = "DenyRootAccess"
  description = "Deny root user access except for billing and account management"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        NotAction = [
          "billing:*",
          "account:*",
          "aws-portal:*",
          "support:*",
          "trustedadvisor:*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:PrincipalType" = "Root"
          }
        }
      }
    ]
  })
}

resource "aws_organizations_policy_attachment" "deny_root_workloads" {
  policy_id = aws_organizations_policy.deny_root_access.id
  target_id = aws_organizations_organizational_unit.workloads.id
}