locals {
  name_prefix                      = "${var.project}-${var.environment}"
  anthropic_api_key_parameter_name = "/${var.project}/${var.environment}/anthropic-api-key"
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

  name_prefix                      = local.name_prefix
  source_dir                       = "${path.root}/../../../../apps/api/dist/core"
  output_path                      = "${path.root}/../../build/${var.environment}-api.zip"
  matching_source_dir              = "${path.root}/../../../../apps/api/dist/matching"
  matching_output_path             = "${path.root}/../../build/${var.environment}-matching.zip"
  matching_ai_model_id             = var.matching_ai_model_id
  table_name                       = module.data.table_name
  table_arn                        = module.data.table_arn
  demo_auth_enabled                = var.demo_auth_enabled
  cognito_user_pool_id             = module.auth.user_pool_id
  cognito_client_id                = module.auth.client_id
  log_retention_days               = var.log_retention_days
  throttle_burst_limit             = var.api_throttle_burst_limit
  throttle_rate_limit              = var.api_throttle_rate_limit
  anthropic_api_key_parameter_name = local.anthropic_api_key_parameter_name
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

# Read-only role for developers; skipped until a developer ARN is set.
module "developer_access" {
  source = "../../modules/developer-access"

  name_prefix              = local.name_prefix
  trusted_principal_arns   = var.developer_principal_arns
  trusted_sso_role_arns    = var.developer_sso_role_arns
  user_names               = var.developer_user_names
  editor_enabled           = var.developer_editor_enabled
  require_mfa              = var.developer_require_mfa
  log_group_arns           = module.api.log_group_arns
  table_arn                = module.data.table_arn
  function_arns            = module.api.function_arns
  function_role_arns       = module.api.role_arns
  api_id                   = module.api.api_id
  user_pool_arn            = module.auth.user_pool_arn
  cloudfront_function_arn  = module.web.function_arn
  origin_access_control_id = module.web.origin_access_control_id
  distribution_arn         = module.web.distribution_arn
  bucket_arn               = module.web.bucket_arn

  anthropic_api_key_parameter_arn = module.api.anthropic_api_key_parameter_arn == null ? "" : module.api.anthropic_api_key_parameter_arn
}
