variable "aws_region" {
  description = "AWS region for the state bucket."
  type        = string
}

variable "aws_profile" {
  description = "Named AWS CLI profile used by the provider."
  type        = string
}

variable "state_bucket_name" {
  description = "Globally unique name of the Terraform state bucket."
  type        = string
}

variable "project" {
  description = "Project name used for tagging."
  type        = string
}
