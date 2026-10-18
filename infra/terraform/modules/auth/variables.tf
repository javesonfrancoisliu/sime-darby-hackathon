variable "name_prefix" {
  description = "Prefix for resource names, project-environment."
  type        = string
}

variable "deletion_protection" {
  description = "Enable Cognito user pool deletion protection."
  type        = bool
}
