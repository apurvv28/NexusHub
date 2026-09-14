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
  description = "KMS Customer Managed Key for NexusHub Prod"
}

module "vpc" {
  source                = "../../modules/vpc"
  environment           = var.environment
  vpc_cidr              = var.vpc_cidr
  availability_zones    = ["us-east-1a", "us-east-1b", "us-east-1c"]
  public_subnet_cidrs   = ["10.2.1.0/24", "10.2.2.0/24", "10.2.3.0/24"]
  private_subnet_cidrs  = ["10.2.10.0/24", "10.2.11.0/24", "10.2.12.0/24"]
  isolated_subnet_cidrs = ["10.2.20.0/24", "10.2.21.0/24", "10.2.22.0/24"]
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


