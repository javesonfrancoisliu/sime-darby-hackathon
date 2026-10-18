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

output "function_arn" {
  description = "Lambda function ARN."
  value       = aws_lambda_function.api.arn
}

output "log_group_arns" {
  description = "Lambda and API access log group ARNs."
  value       = [aws_cloudwatch_log_group.lambda.arn, aws_cloudwatch_log_group.access.arn]
}

output "lambda_log_group_name" {
  description = "Lambda CloudWatch log group name."
  value       = aws_cloudwatch_log_group.lambda.name
}
