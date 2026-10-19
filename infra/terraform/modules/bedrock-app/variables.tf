variable "user_name" {
  description = "IAM user name for the app."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9+=,.@_-]{1,64}$", var.user_name))
    error_message = "The user name must be 1 to 64 letters, digits or +=,.@_- characters."
  }
}

variable "inference_profile_id" {
  description = "The only Bedrock inference profile the app may call, for example global.anthropic.claude-haiku-4-5-20251001-v1:0."
  type        = string
}
