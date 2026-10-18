locals {
  name_prefix = "${var.project}-${var.environment}"
}

module "data" {
  source = "../../modules/data"

  name_prefix         = local.name_prefix
  deletion_protection = var.table_deletion_protection
}

module "auth" {
  source = "../../modules/auth"

  name_prefix         = local.name_prefix
  deletion_protection = var.cognito_deletion_protection
}

module "api" {
  source = "../../modules/api"

  name_prefix          = local.name_prefix
  source_dir           = "${path.root}/../../../../apps/api/dist"
  output_path          = "${path.root}/../../build/${var.environment}-api.zip"
  table_name           = module.data.table_name
  table_arn            = module.data.table_arn
  demo_auth_enabled    = var.demo_auth_enabled
  cognito_user_pool_id = module.auth.user_pool_id
  cognito_client_id    = module.auth.client_id
  log_retention_days   = var.log_retention_days
  throttle_burst_limit = var.api_throttle_burst_limit
  throttle_rate_limit  = var.api_throttle_rate_limit
}

# One site serves the sign-in app at /, the elderly app at /elder/, the volunteer app at /volunteer/ and /api/*.
module "web" {
  source = "../../modules/web-hosting"

  name_prefix     = local.name_prefix
  site_name       = "app"
  force_destroy   = var.web_bucket_force_destroy
  api_domain_name = replace(module.api.api_endpoint, "https://", "")
  price_class     = var.cloudfront_price_class
}

# Read-only role for developers; skipped until developer_principal_arns is set.
module "developer_access" {
  source = "../../modules/developer-access"

  name_prefix            = local.name_prefix
  trusted_principal_arns = var.developer_principal_arns
  log_group_arns         = module.api.log_group_arns
  table_arn              = module.data.table_arn
  function_arn           = module.api.function_arn
  api_id                 = module.api.api_id
  user_pool_arn          = module.auth.user_pool_arn
  distribution_arn       = module.web.distribution_arn
  bucket_arn             = module.web.bucket_arn
}
