output "sites" {
  description = "Per site: CloudFront domain, distribution id (for invalidations) and the S3 bucket to sync the build into."
  value = {
    for name, site in module.web : name => {
      domain_name     = site.distribution_domain_name
      distribution_id = site.distribution_id
      bucket_name     = site.bucket_name
    }
  }
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
