variable "name_prefix" {
  description = "Prefix for resource names, project-environment."
  type        = string
}

variable "source_dir" {
  description = "Directory containing the built Lambda bundle."
  type        = string
}

variable "output_path" {
  description = "Where the Lambda zip is written."
  type        = string
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
