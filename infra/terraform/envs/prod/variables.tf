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
  description = "Enable the simulated demo sign-in on the API. Must stay false in prod."
  type        = bool
  default     = false

  validation {
    condition     = var.demo_auth_enabled == false
    error_message = "demo auth must stay disabled in prod"
  }
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
  default     = true
}

variable "web_bucket_force_destroy" {
  description = "Let Terraform delete the site bucket with its files. Built files only, redeployable from git."
  type        = bool
  default     = false
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
  description = "Create the developer editor role, which can change this stack's data, code and settings."
  type        = bool
  default     = false

  validation {
    condition     = var.developer_editor_enabled == false
    error_message = "The developer editor role must stay off in prod."
  }
}

variable "developer_require_mfa" {
  description = "Require teammates to sign in with MFA before they can use any permission. Must stay true in prod."
  type        = bool
  default     = true

  validation {
    condition     = var.developer_require_mfa
    error_message = "MFA must stay required in prod."
  }
}

variable "matching_ai_model_id" {
  description = "Claude API model id for the AI re-rank, for example claude-haiku-5-5. Empty uses rules only."
  type        = string
  default     = ""
}
