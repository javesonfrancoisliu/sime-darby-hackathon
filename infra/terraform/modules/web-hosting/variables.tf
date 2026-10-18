variable "name_prefix" {
  description = "Prefix for resource names, project-environment."
  type        = string
}

variable "api_domain_name" {
  description = "API Gateway domain (no scheme) used as the /api/* origin."
  type        = string
}

variable "price_class" {
  description = "CloudFront price class."
  type        = string
}

variable "site_name" {
  description = "Short site name used in resource names, e.g. volunteer or elderly."
  type        = string
}
