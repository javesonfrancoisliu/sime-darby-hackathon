data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

locals {
  enabled    = length(var.trusted_principal_arns) + length(var.trusted_sso_role_arns) + length(var.user_names) > 0
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region
  log_group_resources = flatten([
    for arn in var.log_group_arns : [arn, "${arn}:*"]
  ])
  apigateway_prefix = "arn:aws:apigateway:${local.region}::"
  cloudfront_prefix = "arn:aws:cloudfront::${local.account_id}"
  mfa_user_arns     = concat(var.trusted_principal_arns, [for user in aws_iam_user.developer : user.arn])
}

# IAM users must have signed in with MFA when require_mfa is on. SSO roles carry no MFA key, so
# their Identity Center enforces MFA instead.
data "aws_iam_policy_document" "assume" {
  dynamic "statement" {
    for_each = length(local.mfa_user_arns) > 0 ? [1] : []

    content {
      sid     = "IamUsers"
      actions = ["sts:AssumeRole"]

      principals {
        type        = "AWS"
        identifiers = local.mfa_user_arns
      }

      dynamic "condition" {
        for_each = var.require_mfa ? [1] : []

        content {
          test     = "Bool"
          variable = "aws:MultiFactorAuthPresent"
          values   = ["true"]
        }
      }
    }
  }

  dynamic "statement" {
    for_each = length(var.trusted_sso_role_arns) > 0 ? [1] : []

    content {
      sid     = "SsoRoles"
      actions = ["sts:AssumeRole"]

      principals {
        type        = "AWS"
        identifiers = var.trusted_sso_role_arns
      }
    }
  }
}

resource "aws_iam_role" "developer" {
  count = local.enabled ? 1 : 0

  name                 = "${var.name_prefix}-developer-readonly"
  description          = "Read-only access for developers to this stack's logs, data, users and site."
  assume_role_policy   = data.aws_iam_policy_document.assume.json
  max_session_duration = var.max_session_duration_seconds
}

# Read verbs only (Describe, Get, List, query and scan). Data and content reads are
# scoped to this stack; the console list pages need the account-wide list calls.
data "aws_iam_policy_document" "read" {
  statement {
    sid = "StackLogs"
    actions = [
      "logs:Describe*",
      "logs:Get*",
      "logs:List*",
      "logs:FilterLogEvents",
      "logs:StartQuery",
      "logs:StartLiveTail",
    ]
    resources = local.log_group_resources
  }

  statement {
    sid = "StackTable"
    actions = [
      "dynamodb:Describe*",
      "dynamodb:Get*",
      "dynamodb:List*",
      "dynamodb:BatchGetItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:PartiQLSelect",
    ]
    resources = [var.table_arn, "${var.table_arn}/*"]
  }

  statement {
    sid       = "StackFunction"
    actions   = ["lambda:Get*", "lambda:List*"]
    resources = [var.function_arn, "${var.function_arn}:*"]
  }

  statement {
    sid = "StackFunctionRole"
    actions = [
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
    ]
    resources = [var.function_role_arn]
  }

  statement {
    sid     = "StackApi"
    actions = ["apigateway:GET"]
    resources = [
      "${local.apigateway_prefix}/apis",
      "${local.apigateway_prefix}/apis/${var.api_id}",
      "${local.apigateway_prefix}/apis/${var.api_id}/*",
      "${local.apigateway_prefix}/tags/*",
      "${local.apigateway_prefix}/domainnames",
      "${local.apigateway_prefix}/vpclinks",
    ]
  }

  statement {
    sid = "StackUsers"
    actions = [
      "cognito-idp:Describe*",
      "cognito-idp:Get*",
      "cognito-idp:List*",
      "cognito-idp:AdminGet*",
      "cognito-idp:AdminList*",
    ]
    resources = [var.user_pool_arn]
  }

  statement {
    sid     = "StackSite"
    actions = ["cloudfront:Describe*", "cloudfront:Get*", "cloudfront:List*"]
    resources = [
      var.distribution_arn,
      var.cloudfront_function_arn,
      "${local.cloudfront_prefix}:origin-access-control/${var.origin_access_control_id}",
      # The distribution uses AWS managed cache, origin request and header policies, whose settings are public.
      "${local.cloudfront_prefix}:cache-policy/*",
      "${local.cloudfront_prefix}:origin-request-policy/*",
      "${local.cloudfront_prefix}:response-headers-policy/*",
    ]
  }

  statement {
    sid       = "StackBucket"
    actions   = ["s3:Get*", "s3:List*"]
    resources = [var.bucket_arn, "${var.bucket_arn}/*"]
  }

  # These actions have no resource-level permissions, so they need "*". They
  # return names, settings and metrics, not table items, log lines or files.
  statement {
    sid = "ConsoleListPages"
    actions = [
      "logs:DescribeLogGroups",
      "logs:DescribeQueries",
      "logs:DescribeQueryDefinitions",
      "logs:DescribeResourcePolicies",
      "logs:GetQueryResults",
      "logs:StopQuery",
      "logs:StopLiveTail",
      "logs:TestMetricFilter",
      "cloudwatch:Describe*",
      "cloudwatch:Get*",
      "cloudwatch:List*",
      "lambda:ListFunctions",
      "lambda:ListEventSourceMappings",
      "lambda:GetAccountSettings",
      "lambda:ListLayers",
      "lambda:ListCodeSigningConfigs",
      "iam:ListRoles",
      "dynamodb:ListTables",
      "dynamodb:ListBackups",
      "dynamodb:ListGlobalTables",
      "dynamodb:ListContributorInsights",
      "dynamodb:ListStreams",
      "dynamodb:DescribeLimits",
      "dynamodb:DescribeEndpoints",
      "application-autoscaling:Describe*",
      "kms:DescribeKey",
      "kms:ListAliases",
      "cognito-idp:ListUserPools",
      "cognito-idp:DescribeUserPoolDomain",
      "cloudfront:List*",
      "cloudfront:GetMonitoringSubscription",
      "acm:ListCertificates",
      "wafv2:ListWebACLs",
      "s3:ListAllMyBuckets",
      "s3:GetAccountPublicAccessBlock",
      "tag:GetResources",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "read" {
  count = local.enabled ? 1 : 0

  name   = "${var.name_prefix}-developer-readonly"
  role   = aws_iam_role.developer[0].id
  policy = data.aws_iam_policy_document.read.json
}
