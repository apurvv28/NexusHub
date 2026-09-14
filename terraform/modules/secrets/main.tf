# Secrets Manager container for Database Credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "nexushub/${var.environment}/database/credentials"
  description = "Aurora PostgreSQL database connection secrets"
  kms_key_id  = var.kms_key_arn

  tags = {
    Name        = "nexushub-db-credentials-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Secrets Manager container for Auth & OAuth Keys
resource "aws_secretsmanager_secret" "auth_secrets" {
  name        = "nexushub/${var.environment}/auth/secrets"
  description = "Auth0 / Keycloak OIDC client secret and JWT private keys"
  kms_key_id  = var.kms_key_arn

  tags = {
    Name        = "nexushub-auth-secrets-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Secrets Manager container for AI & External API Keys
resource "aws_secretsmanager_secret" "ai_api_keys" {
  name        = "nexushub/${var.environment}/ai/api_keys"
  description = "Anthropic Claude API key, OpenAI key, and Voyage AI embedding keys"
  kms_key_id  = var.kms_key_arn

  tags = {
    Name        = "nexushub-ai-api-keys-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# SSM Parameter Store for Non-Sensitive System Configs
resource "aws_ssm_parameter" "database_name" {
  name        = "/nexushub/${var.environment}/database/name"
  description = "Target PostgreSQL Database Name"
  type        = "String"
  value       = "nexushub_${var.environment}"

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_ssm_parameter" "aws_region" {
  name        = "/nexushub/${var.environment}/aws/region"
  description = "AWS Primary Deployment Region"
  type        = "String"
  value       = "us-east-1"

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
