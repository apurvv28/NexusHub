# Secrets Manager container for Supabase PostgreSQL Credentials & Connection Strings
resource "aws_secretsmanager_secret" "supabase_db_secret" {
  name        = "nexushub/${var.environment}/supabase/credentials"
  description = "Supabase PostgreSQL database connection parameters, pooler strings, and API keys"
  kms_key_id  = var.kms_key_arn

  tags = {
    Name        = "nexushub-supabase-credentials-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# SSM Parameter Store for Supabase Connection Pooler Endpoint
resource "aws_ssm_parameter" "supabase_pooler_host" {
  name        = "/nexushub/${var.environment}/supabase/pooler_host"
  description = "Supabase PostgreSQL Pooler Host (Supavisor)"
  type        = "String"
  value       = "db.${var.environment}.supabase.co"

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_ssm_parameter" "supabase_db_port" {
  name        = "/nexushub/${var.environment}/supabase/db_port"
  description = "Supabase PostgreSQL Direct Port"
  type        = "String"
  value       = tostring(var.db_port)

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_ssm_parameter" "supabase_pooler_port" {
  name        = "/nexushub/${var.environment}/supabase/pooler_port"
  description = "Supabase PostgreSQL Pooler Port"
  type        = "String"
  value       = tostring(var.pooler_port)

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
