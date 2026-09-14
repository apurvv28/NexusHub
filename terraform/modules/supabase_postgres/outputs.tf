output "secret_arn" {
  description = "ARN of Supabase credentials secret"
  value       = aws_secretsmanager_secret.supabase_db_secret.arn
}

output "pooler_host_parameter" {
  description = "SSM parameter name for pooler host"
  value       = aws_ssm_parameter.supabase_pooler_host.name
}

output "pooler_port_parameter" {
  description = "SSM parameter name for pooler port"
  value       = aws_ssm_parameter.supabase_pooler_port.name
}
