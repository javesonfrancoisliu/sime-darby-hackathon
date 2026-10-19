output "role_arn" {
  description = "Role the deploy workflow assumes."
  value       = aws_iam_role.deploy.arn
}
