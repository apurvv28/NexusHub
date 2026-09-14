variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "database_name" {
  description = "Supabase PostgreSQL Database Name"
  type        = string
  default     = "postgres"
}

variable "db_port" {
  description = "PostgreSQL Database Port"
  type        = number
  default     = 5432
}

variable "pooler_port" {
  description = "Supavisor / PgBouncer Connection Pooler Port"
  type        = number
  default     = 6543
}

variable "kms_key_arn" {
  description = "KMS Key ARN for secrets encryption"
  type        = string
}
