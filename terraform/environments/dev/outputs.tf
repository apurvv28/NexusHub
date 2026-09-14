output "vpc_id" {
  description = "Dev VPC ID"
  value       = module.vpc.vpc_id
}

output "kms_key_arn" {
  description = "Dev KMS Key ARN"
  value       = module.kms.key_arn
}

output "alb_security_group_id" {
  description = "Dev ALB Security Group ID"
  value       = module.security_groups.alb_security_group_id
}

output "ecs_security_group_id" {
  description = "Dev ECS Security Group ID"
  value       = module.security_groups.ecs_security_group_id
}

output "postgres_security_group_id" {
  description = "Dev PostgreSQL Security Group ID"
  value       = module.security_groups.postgres_security_group_id
}
