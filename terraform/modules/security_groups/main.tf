# ALB Security Group (Public HTTPS/HTTP Ingress)
resource "aws_security_group" "alb" {
  name        = "nexushub-alb-sg-${var.environment}"
  description = "Controls traffic to Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTP from anywhere (redirected to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow egress to internal workloads"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "nexushub-alb-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ECS Fargate App Security Group (Restricted to ALB Ingress)
resource "aws_security_group" "ecs_fargate" {
  name        = "nexushub-ecs-sg-${var.environment}"
  description = "Controls access to ECS Fargate services"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow traffic from ALB on container port"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow outbound traffic for dependencies & updates"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "nexushub-ecs-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Aurora PostgreSQL Security Group (Restricted to ECS Fargate)
resource "aws_security_group" "aurora_postgres" {
  name        = "nexushub-postgres-sg-${var.environment}"
  description = "Controls ingress to Aurora PostgreSQL cluster"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow PostgreSQL access strictly from ECS Fargate tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_fargate.id]
  }

  egress {
    description = "No outbound connection needed"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "nexushub-postgres-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Redis ElastiCache Security Group (Restricted to ECS Fargate)
resource "aws_security_group" "redis" {
  name        = "nexushub-redis-sg-${var.environment}"
  description = "Controls ingress to ElastiCache Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow Redis access strictly from ECS Fargate tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_fargate.id]
  }

  egress {
    description = "No outbound connection needed"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "nexushub-redis-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
