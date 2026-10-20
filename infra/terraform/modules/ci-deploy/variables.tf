variable "name_prefix" {
  description = "Prefix for resource names."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy, as owner/name."
  type        = string
}

variable "github_branch" {
  description = "Only runs on this branch may assume the role."
  type        = string
  default     = "main"
}

variable "github_immutable_subject_prefix" {
  description = "Subject prefix GitHub issues when immutable subject claims are on (repo:owner@id/repo@id), from the repository's OIDC customization settings. Empty keeps only the name-based subject."
  type        = string
  default     = ""
}

variable "create_oidc_provider" {
  description = "Create the GitHub OIDC provider. Set false when the account already has one (IAM allows one per URL) and pass its ARN."
  type        = bool
  default     = true
}

variable "existing_oidc_provider_arn" {
  description = "ARN of the account's existing GitHub OIDC provider; used only when create_oidc_provider is false."
  type        = string
  default     = ""
}

variable "function_arns" {
  description = "Lambda functions the pipeline may update."
  type        = list(string)
}

variable "bucket_arn" {
  description = "Site bucket the pipeline may upload to."
  type        = string
}

variable "distribution_arn" {
  description = "CloudFront distribution the pipeline may invalidate."
  type        = string
}
