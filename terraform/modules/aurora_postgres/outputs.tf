output "cluster_endpoint" {
  description = "Writer endpoint for Aurora PostgreSQL cluster"
  value       = aws_rds_cluster.aurora.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint for Aurora PostgreSQL cluster"
  value       = aws_rds_cluster.aurora.reader_endpoint
}

output "cluster_arn" {
  description = "ARN of the Aurora PostgreSQL cluster"
  value       = aws_rds_cluster.aurora.arn
}

output "database_name" {
  description = "Name of initial PostgreSQL database"
  value       = aws_rds_cluster.aurora.database_name
}
