variable "environment" {
  description = "Target deployment environment (dev, staging, prod)"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS Key ARN for encrypting secrets at rest"
  type        = string
}
