output "organization_id" {
  description = "Organization ID"
  value       = aws_organizations_organization.main.id
}

output "dev_account_id" {
  description = "Development account ID"
  value       = aws_organizations_account.dev.id
}

output "qa_account_id" {
  description = "QA account ID"
  value       = aws_organizations_account.qa.id
}

output "stage_account_id" {
  description = "Stage account ID"
  value       = aws_organizations_account.stage.id
}

output "prod_account_id" {
  description = "Production account ID"
  value       = aws_organizations_account.prod.id
}