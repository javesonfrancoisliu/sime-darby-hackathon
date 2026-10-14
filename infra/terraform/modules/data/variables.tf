variable "name_prefix" {
  description = "Prefix for resource names, project-environment."
  type        = string
}

variable "deletion_protection" {
  description = "Enable DynamoDB deletion protection."
  type        = bool
}
