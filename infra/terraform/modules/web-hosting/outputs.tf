output "bucket_name" {
  description = "Private S3 bucket holding the web build."
  value       = aws_s3_bucket.web.id
}

output "bucket_arn" {
  description = "Private S3 bucket ARN."
  value       = aws_s3_bucket.web.arn
}

output "distribution_arn" {
  description = "CloudFront distribution ARN."
  value       = aws_cloudfront_distribution.web.arn
}

output "function_arn" {
  description = "CloudFront function ARN for the path rewrite."
  value       = aws_cloudfront_function.spa_rewrite.arn
}

output "origin_access_control_id" {
  description = "CloudFront origin access control id."
  value       = aws_cloudfront_origin_access_control.web.id
}

output "distribution_id" {
  description = "CloudFront distribution id."
  value       = aws_cloudfront_distribution.web.id
}

output "distribution_domain_name" {
  description = "CloudFront domain name serving this site and /api/*."
  value       = aws_cloudfront_distribution.web.domain_name
}
