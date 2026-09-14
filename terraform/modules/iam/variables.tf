variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for secret decrypt permissions"
  type        = string
  default     = "*"
}
