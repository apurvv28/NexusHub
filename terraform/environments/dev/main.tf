terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "kms" {
  source      = "../../modules/kms"
  environment = var.environment
  description = "KMS Customer Managed Key for NexusHub Dev"
}

module "vpc" {
  source                = "../../modules/vpc"
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  availability_zones    = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnet_cidrs   = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs  = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
  isolated_subnet_cidrs = ["10.0.20.0/24", "10.0.21.0/24", "10.0.22.0/24"]
}

module "security_groups" {
  source      = "../../modules/security_groups"
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

module "iam" {
  source      = "../../modules/iam"
  environment = var.environment
  kms_key_arn = module.kms.key_arn
}

module "secrets" {
  source      = "../../modules/secrets"
  environment = var.environment
  kms_key_arn = module.kms.key_arn
}

module "supabase_postgres" {
  source      = "../../modules/supabase_postgres"
  environment = var.environment
  kms_key_arn = module.kms.key_arn
}


