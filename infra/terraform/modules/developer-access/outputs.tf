output "role_arn" {
  description = "Developer role ARN, or null when no principals are trusted."
  value       = one(aws_iam_role.developer[*].arn)
}

output "user_names" {
  description = "Teammate IAM users created by this module."
  value       = sort(keys(aws_iam_user.developer))
}
