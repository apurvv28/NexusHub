output "db_secret_arn" {
  description = "ARN of the Database Credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "auth_secret_arn" {
  description = "ARN of the Auth secrets container"
  value       = aws_secretsmanager_secret.auth_secrets.arn
}

output "ai_api_keys_secret_arn" {
  description = "ARN of the AI API keys secret container"
  value       = aws_secretsmanager_secret.ai_api_keys.arn
}
