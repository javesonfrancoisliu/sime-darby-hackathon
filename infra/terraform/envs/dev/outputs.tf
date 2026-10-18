output "site" {
  description = "CloudFront domain, distribution id (for invalidations) and the S3 bucket to sync all three apps into."
  value = {
    domain_name     = module.web.distribution_domain_name
    distribution_id = module.web.distribution_id
    bucket_name     = module.web.bucket_name
  }
}

output "cognito_user_pool_id" {
  description = "Cognito user pool id (built into the frontends)."
  value       = module.auth.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito app client id (built into the frontends)."
  value       = module.auth.client_id
}

output "api_endpoint" {
  description = "Raw API Gateway endpoint."
  value       = module.api.api_endpoint
}

output "table_name" {
  description = "DynamoDB table name."
  value       = module.data.table_name
}

output "lambda_function_name" {
  description = "Lambda function name."
  value       = module.api.function_name
}

output "lambda_log_group_name" {
  description = "Lambda CloudWatch log group name."
  value       = module.api.lambda_log_group_name
}

output "aws_region" {
  description = "Region the stack runs in (used by the deploy script for S3 uploads)."
  value       = var.aws_region
}
