variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
}

variable "aws_profile" {
  description = "Named AWS CLI profile used by the provider."
  type        = string
}

variable "project" {
  description = "Project name, used in resource names and tags."
  type        = string
}

variable "environment" {
  description = "Environment name, used in resource names and tags."
  type        = string
}

variable "demo_auth_enabled" {
  description = "Enable the simulated demo sign-in on the API. Only set true on a throwaway demo stack; keep false elsewhere."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days."
  type        = number
  default     = 14
}

variable "api_throttle_burst_limit" {
  description = "API stage burst limit."
  type        = number
  default     = 50
}

variable "api_throttle_rate_limit" {
  description = "API stage steady-state requests per second."
  type        = number
  default     = 25
}

variable "cloudfront_price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_200"
}

variable "table_deletion_protection" {
  description = "Enable DynamoDB deletion protection."
  type        = bool
}

variable "cognito_deletion_protection" {
  description = "Enable Cognito user pool deletion protection."
  type        = bool
  default     = false
}

variable "web_bucket_force_destroy" {
  description = "Let Terraform delete the site bucket with its files. Built files only, redeployable from git."
  type        = bool
  default     = true
}

variable "developer_principal_arns" {
  description = "IAM user ARNs (MFA required) allowed to assume the read-only developer role."
  type        = list(string)
  default     = []
}

variable "developer_sso_role_arns" {
  description = "IAM Identity Center role ARNs allowed to assume the read-only developer role."
  type        = list(string)
  default     = []
}
