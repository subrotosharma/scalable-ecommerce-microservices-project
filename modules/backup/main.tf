resource "aws_backup_vault" "main" {
  name        = "${var.name_prefix}-backup-vault"
  kms_key_arn = aws_kms_key.backup.arn
  tags        = var.tags
}

resource "aws_kms_key" "backup" {
  description = "KMS key for backup encryption"
  tags        = var.tags
}

resource "aws_backup_plan" "main" {
  name = "${var.name_prefix}-backup-plan"

  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 ? * * *)"

    lifecycle {
      delete_after = 30
    }
  }

  tags = var.tags
}