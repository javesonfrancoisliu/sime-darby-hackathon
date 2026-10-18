variable "name_prefix" {
  description = "Prefix for resource names, project-environment."
  type        = string
}

variable "trusted_principal_arns" {
  description = "IAM users allowed to assume the developer role after an MFA sign-in."
  type        = list(string)

  validation {
    condition = alltrue([
      for arn in var.trusted_principal_arns : can(regex("^arn:aws:iam::[0-9]{12}:user/.+$", arn))
    ])
    error_message = "Each entry must be an IAM user ARN."
  }
}

variable "user_names" {
  description = "IAM users to create for teammates. They join the developers group and can switch to the developer role."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for name in var.user_names : can(regex("^[A-Za-z0-9+=,.@_-]{1,64}$", name))])
    error_message = "Each user name must be 1 to 64 letters, digits or +=,.@_- characters."
  }
}

variable "editor_enabled" {
  description = "Also create the editor role, which can change this stack's data, code and settings and call Amazon Bedrock."
  type        = bool
  default     = false
}

variable "trusted_sso_role_arns" {
  description = "IAM Identity Center role ARNs allowed to assume the developer role; MFA is enforced by Identity Center."
  type        = list(string)

  validation {
    condition = alltrue([
      for arn in var.trusted_sso_role_arns :
      can(regex("^arn:aws:iam::[0-9]{12}:role/aws-reserved/sso\\.amazonaws\\.com/.+$", arn))
    ])
    error_message = "Each entry must be an IAM Identity Center role ARN."
  }
}

variable "function_role_arn" {
  description = "API Lambda execution role ARN, shown on the function's Permissions tab."
  type        = string
}

variable "max_session_duration_seconds" {
  description = "Longest session the role allows, in seconds."
  type        = number
  default     = 3600
}

variable "log_group_arns" {
  description = "CloudWatch log groups the developer can read."
  type        = list(string)
}

variable "table_arn" {
  description = "DynamoDB table ARN."
  type        = string
}

variable "function_arn" {
  description = "API Lambda function ARN."
  type        = string
}

variable "api_id" {
  description = "HTTP API id."
  type        = string
}

variable "user_pool_arn" {
  description = "Cognito user pool ARN."
  type        = string
}

variable "cloudfront_function_arn" {
  description = "CloudFront function ARN used by the distribution."
  type        = string
}

variable "origin_access_control_id" {
  description = "CloudFront origin access control id used by the distribution."
  type        = string
}

variable "distribution_arn" {
  description = "CloudFront distribution ARN."
  type        = string
}

variable "bucket_arn" {
  description = "Site S3 bucket ARN."
  type        = string
}
