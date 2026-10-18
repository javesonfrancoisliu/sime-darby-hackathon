output "role_arn" {
  description = "Developer role ARN, or null when no principals are trusted."
  value       = one(aws_iam_role.developer[*].arn)
}

output "editor_role_arn" {
  description = "Editor role ARN, or null when the editor role is off."
  value       = one(aws_iam_role.editor[*].arn)
}

output "user_names" {
  description = "Teammate IAM users created by this module."
  value       = sort(keys(aws_iam_user.developer))
}
