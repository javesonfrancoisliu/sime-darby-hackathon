output "bucket_name" {
  description = "Private S3 bucket holding the web build."
  value       = aws_s3_bucket.web.id
}

output "distribution_id" {
  description = "CloudFront distribution id."
  value       = aws_cloudfront_distribution.web.id
}

output "distribution_domain_name" {
  description = "CloudFront domain name serving this site and /api/*."
  value       = aws_cloudfront_distribution.web.domain_name
}
