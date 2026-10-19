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

variable "developer_user_names" {
  description = "Teammate IAM users to create with MFA and the developer role. IAM users are account-wide, so list each name in one environment only."
  type        = list(string)
  default     = []
}

variable "developer_editor_enabled" {
  description = "Create the developer editor role, which can change this stack's data, code and settings and call Amazon Bedrock."
  type        = bool
  default     = true
}

variable "api_bedrock_invoke_enabled" {
  description = "Let the matching Lambda call Amazon Bedrock models."
  type        = bool
  default     = true
}

variable "developer_require_mfa" {
  description = "Require teammates to sign in with MFA before they can use any permission."
  type        = bool
  default     = true
}

variable "matching_ai_model_id" {
  description = "Bedrock inference profile id for the AI re-rank, for example global.anthropic.claude-haiku-4-5-20251001-v1:0. Empty uses rules only."
  type        = string
  default     = ""
}

variable "bedrock_app_inference_profile_id" {
  description = "The only Bedrock inference profile the app IAM user may call."
  type        = string
  default     = "global.anthropic.claude-haiku-5-5"
}
