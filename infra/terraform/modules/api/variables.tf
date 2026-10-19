variable "name_prefix" {
  description = "Prefix for resource names, project-environment."
  type        = string
}

variable "source_dir" {
  description = "Directory containing the built core Lambda bundle."
  type        = string
}

variable "output_path" {
  description = "Where the core Lambda zip is written."
  type        = string
}

variable "matching_source_dir" {
  description = "Directory containing the built matching Lambda bundle."
  type        = string
}

variable "matching_output_path" {
  description = "Where the matching Lambda zip is written."
  type        = string
}

variable "matching_timeout_seconds" {
  description = "Matching Lambda timeout; it must leave room above the Claude API call timeout."
  type        = number
  default     = 15
}

variable "matching_ai_model_id" {
  description = "Claude API model id for the AI re-rank, for example claude-haiku-5-5. Empty uses rules only."
  type        = string
  default     = ""
}

variable "matching_ai_timeout_ms" {
  description = "How long matching waits for the Claude API before falling back to rules."
  type        = number
  default     = 9000

  validation {
    condition     = var.matching_ai_timeout_ms > 0
    error_message = "matching_ai_timeout_ms must be positive."
  }
}

variable "table_name" {
  description = "DynamoDB table name passed to the function."
  type        = string
}

variable "table_arn" {
  description = "DynamoDB table ARN the function may access."
  type        = string
}

variable "demo_auth_enabled" {
  description = "Enable the simulated demo sign-in (x-demo-user header, demo user list, user creation). Keep false on any publicly reachable API."
  type        = bool
  default     = false
}

variable "cognito_user_pool_id" {
  description = "Cognito user pool id the API verifies tokens against."
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito app client id the API expects in tokens."
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days."
  type        = number
}

variable "throttle_burst_limit" {
  description = "API stage burst limit."
  type        = number
}

variable "throttle_rate_limit" {
  description = "API stage steady-state requests per second."
  type        = number
}

variable "anthropic_api_key_parameter_name" {
  description = "SSM SecureString parameter holding the Claude API key; empty leaves the Lambda without key access so matching uses rules."
  type        = string
  default     = ""

  validation {
    condition     = var.anthropic_api_key_parameter_name == "" || startswith(var.anthropic_api_key_parameter_name, "/")
    error_message = "anthropic_api_key_parameter_name must be empty or start with \"/\"."
  }
}
