output "user_pool_id" {
  description = "Cognito user pool id."
  value       = aws_cognito_user_pool.users.id
}

output "user_pool_arn" {
  description = "Cognito user pool ARN."
  value       = aws_cognito_user_pool.users.arn
}

output "client_id" {
  description = "Cognito app client id used by the browser apps."
  value       = aws_cognito_user_pool_client.web.id
}
