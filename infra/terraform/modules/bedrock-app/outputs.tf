output "user_name" {
  description = "App IAM user name."
  value       = aws_iam_user.app.name
}

output "inference_profile_arn" {
  description = "Inference profile ARN the app calls."
  value       = data.aws_bedrock_inference_profile.model.inference_profile_arn
}
