locals {
  name_prefix = "${var.project}-${var.environment}"
}

module "data" {
  source = "../../modules/data"

  name_prefix         = local.name_prefix
  deletion_protection = var.table_deletion_protection
}

module "api" {
  source = "../../modules/api"

  name_prefix          = local.name_prefix
  source_dir           = "${path.root}/../../../../apps/api/dist"
  output_path          = "${path.root}/../../build/${var.environment}-api.zip"
  table_name           = module.data.table_name
  table_arn            = module.data.table_arn
  log_retention_days   = var.log_retention_days
  throttle_burst_limit = var.api_throttle_burst_limit
  throttle_rate_limit  = var.api_throttle_rate_limit
}

module "web" {
  source = "../../modules/web-hosting"

  name_prefix     = local.name_prefix
  api_domain_name = replace(module.api.api_endpoint, "https://", "")
  price_class     = var.cloudfront_price_class
}
