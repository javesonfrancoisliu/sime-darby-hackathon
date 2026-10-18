output "api_endpoint" {
  description = "HTTP API invoke URL."
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "api_id" {
  description = "HTTP API id."
  value       = aws_apigatewayv2_api.http.id
}

output "function_name" {
  description = "Lambda function name."
  value       = aws_lambda_function.api.function_name
}

output "matching_function_name" {
  description = "Matching Lambda function name."
  value       = aws_lambda_function.matching.function_name
}

output "function_arns" {
  description = "Core and matching Lambda function ARNs."
  value       = [aws_lambda_function.api.arn, aws_lambda_function.matching.arn]
}

output "role_arns" {
  description = "Core and matching Lambda execution role ARNs."
  value       = [aws_iam_role.lambda.arn, aws_iam_role.matching.arn]
}

output "log_group_arns" {
  description = "Core and matching Lambda log groups and the API access log group."
  value = [
    aws_cloudwatch_log_group.lambda.arn,
    aws_cloudwatch_log_group.matching.arn,
    aws_cloudwatch_log_group.access.arn,
  ]
}

output "lambda_log_group_name" {
  description = "Lambda CloudWatch log group name."
  value       = aws_cloudwatch_log_group.lambda.name
}
