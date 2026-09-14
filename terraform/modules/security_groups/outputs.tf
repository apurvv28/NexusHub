output "alb_security_group_id" {
  description = "Security Group ID of the Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "Security Group ID of ECS Fargate tasks"
  value       = aws_security_group.ecs_fargate.id
}

output "postgres_security_group_id" {
  description = "Security Group ID of Aurora PostgreSQL"
  value       = aws_security_group.aurora_postgres.id
}

output "redis_security_group_id" {
  description = "Security Group ID of Redis ElastiCache"
  value       = aws_security_group.redis.id
}
