# DB Subnet Group for Isolated Subnets
resource "aws_db_subnet_group" "aurora" {
  name        = "nexushub-aurora-subnet-group-${var.environment}"
  description = "Subnet group for Aurora PostgreSQL cluster in isolated network tier"
  subnet_ids  = var.isolated_subnet_ids

  tags = {
    Name        = "nexushub-aurora-subnet-group-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Cluster Parameter Group enforcing SSL/TLS and logging
resource "aws_rds_cluster_parameter_group" "aurora" {
  name        = "nexushub-aurora-pg-params-${var.environment}"
  family      = "aurora-postgresql15"
  description = "Cluster parameter group for NexusHub Aurora PostgreSQL 15"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  tags = {
    Name        = "nexushub-aurora-params-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Random Master Password
resource "random_password" "master_password" {
  length  = 32
  special = false
}

# Aurora PostgreSQL Cluster
resource "aws_rds_cluster" "aurora" {
  cluster_identifier              = "nexushub-aurora-cluster-${var.environment}"
  engine                          = "aurora-postgresql"
  engine_version                  = "15.4"
  database_name                   = var.database_name
  master_username                 = var.master_username
  master_password                 = random_password.master_password.result
  db_subnet_group_name            = aws_db_subnet_group.aurora.name
  vpc_security_group_ids          = [var.database_security_group_id]
  kms_key_id                      = var.kms_key_arn
  storage_encrypted               = true
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora.name
  backup_retention_period         = 14
  preferred_backup_window         = "03:00-04:00"
  copy_tags_to_snapshot           = true
  deletion_protection             = var.environment == "prod" ? true : false
  skip_final_snapshot             = var.environment == "prod" ? false : true

  tags = {
    Name        = "nexushub-aurora-cluster-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Aurora Cluster Instances
resource "aws_rds_cluster_instance" "aurora_instances" {
  count                = var.instance_count
  identifier           = "nexushub-aurora-instance-${count.index + 1}-${var.environment}"
  cluster_identifier   = aws_rds_cluster.aurora.id
  instance_class       = var.instance_class
  engine               = aws_rds_cluster.aurora.engine
  engine_version       = aws_rds_cluster.aurora.engine_version
  db_subnet_group_name = aws_db_subnet_group.aurora.name
  publicly_accessible  = false

  tags = {
    Name        = "nexushub-aurora-instance-${count.index + 1}-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
