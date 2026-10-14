output "cloudfront_domain_name" {
  description = "Public domain serving the app and /api/*."
  value       = module.web.distribution_domain_name
}

output "distribution_id" {
  description = "CloudFront distribution id (for invalidations)."
  value       = module.web.distribution_id
}

output "web_bucket_name" {
  description = "S3 bucket to sync the web build into."
  value       = module.web.bucket_name
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
