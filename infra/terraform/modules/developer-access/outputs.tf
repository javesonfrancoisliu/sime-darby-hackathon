output "role_arn" {
  description = "Developer role ARN, or null when no principals are trusted."
  value       = one(aws_iam_role.developer[*].arn)
}
