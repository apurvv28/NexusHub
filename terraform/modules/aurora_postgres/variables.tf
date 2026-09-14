variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where Aurora cluster will be deployed"
  type        = string
}

variable "isolated_subnet_ids" {
  description = "Isolated database subnet IDs"
  type        = list(string)
}

variable "database_security_group_id" {
  description = "Security Group ID for Aurora PostgreSQL cluster"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS Key ARN for database storage encryption"
  type        = string
}

variable "database_name" {
  description = "Initial PostgreSQL database name"
  type        = string
  default     = "nexushub"
}

variable "master_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "nexushub_admin"
}

variable "instance_count" {
  description = "Number of Aurora instances in cluster"
  type        = number
  default     = 2
}

variable "instance_class" {
  description = "Aurora instance class"
  type        = string
  default     = "db.r6g.large"
}
