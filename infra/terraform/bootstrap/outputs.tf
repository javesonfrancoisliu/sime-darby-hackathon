output "state_bucket_name" {
  description = "Name of the Terraform state bucket; use it in each env's backend.hcl."
  value       = aws_s3_bucket.state.id
}
