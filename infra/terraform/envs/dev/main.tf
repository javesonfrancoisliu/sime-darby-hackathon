locals {
  name_prefix = "${var.project}-${var.environment}"
  # One static site per frontend; each also routes /api/* to the shared API.
  sites = toset(["volunteer", "elderly"])
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
  demo_auth_enabled    = var.demo_auth_enabled
  log_retention_days   = var.log_retention_days
  throttle_burst_limit = var.api_throttle_burst_limit
  throttle_rate_limit  = var.api_throttle_rate_limit
}

module "web" {
  source   = "../../modules/web-hosting"
  for_each = local.sites

  name_prefix     = local.name_prefix
  site_name       = each.key
  api_domain_name = replace(module.api.api_endpoint, "https://", "")
  price_class     = var.cloudfront_price_class
}
