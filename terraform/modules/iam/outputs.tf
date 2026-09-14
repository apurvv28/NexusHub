output "ecs_execution_role_arn" {
  description = "ARN of the ECS Task Execution Role"
  value       = aws_iam_role.ecs_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS Task Application Runtime Role"
  value       = aws_iam_role.ecs_task_role.arn
}
