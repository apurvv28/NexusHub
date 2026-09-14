variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "description" {
  description = "Description for the KMS key"
  type        = string
  default     = "KMS key for NexusHub multi-tenant envelope encryption and secret management"
}
