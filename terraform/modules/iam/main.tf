# ECS Task Execution Role (Allows ECS agent to pull ECR images, publish CloudWatch logs, and fetch Secrets)
resource "aws_iam_role" "ecs_execution_role" {
  name = "nexushub-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "nexushub-ecs-execution-role-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Attach AWS Standard ECS Task Execution Policy
resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Inline Policy for Secrets & KMS Access during Task Execution
resource "aws_iam_role_policy" "ecs_execution_secrets_kms" {
  name = "nexushub-ecs-execution-secrets-kms-${var.environment}"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })
}

# ECS Task Role (Runtime permissions for the container application)
resource "aws_iam_role" "ecs_task_role" {
  name = "nexushub-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "nexushub-ecs-task-role-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Task Role Policy for S3, KMS envelope encryption, and EventBridge
resource "aws_iam_role_policy" "ecs_task_app_policy" {
  name = "nexushub-ecs-task-app-policy-${var.environment}"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:DescribeKey"
        ]
        Resource = var.kms_key_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "events:PutEvents"
        ]
        Resource = "*"
      }
    ]
  })
}
