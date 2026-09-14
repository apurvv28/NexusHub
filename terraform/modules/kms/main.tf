# KMS Customer Managed Key (CMK) with automated rotation
resource "aws_kms_key" "main" {
  description             = var.description
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name        = "nexushub-kms-key-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# KMS Key Alias
resource "aws_kms_alias" "main" {
  name          = "alias/nexushub-${var.environment}"
  target_key_id = aws_kms_key.main.key_id
}
