data "aws_region" "current" {}

locals {
  enabled = length(var.trusted_principal_arns) > 0
  log_group_resources = flatten([
    for arn in var.log_group_arns : [arn, "${arn}:*"]
  ])
  api_arn = "arn:aws:apigateway:${data.aws_region.current.region}::/apis/${var.api_id}"
}

# Only the listed principals can assume the role, and only with MFA.
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = var.trusted_principal_arns
    }

    condition {
      test     = "Bool"
      variable = "aws:MultiFactorAuthPresent"
      values   = ["true"]
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

data "aws_iam_policy_document" "read" {
  statement {
    sid = "ReadLogs"
    actions = [
      "logs:DescribeLogStreams",
      "logs:GetLogEvents",
      "logs:FilterLogEvents",
      "logs:StartQuery",
    ]
    resources = local.log_group_resources
  }

  # These actions do not support resource-level permissions.
  statement {
    sid = "ListAndMetrics"
    actions = [
      "logs:DescribeLogGroups",
      "logs:DescribeQueries",
      "logs:GetQueryResults",
      "logs:StopQuery",
      "cloudwatch:DescribeAlarms",
      "cloudwatch:GetMetricData",
      "cloudwatch:GetMetricStatistics",
      "cloudwatch:ListMetrics",
      "lambda:ListFunctions",
      "dynamodb:ListTables",
      "cognito-idp:ListUserPools",
      "cloudfront:ListDistributions",
      "s3:ListAllMyBuckets",
    ]
    resources = ["*"]
  }

  statement {
    sid = "ReadTable"
    actions = [
      "dynamodb:DescribeTable",
      "dynamodb:GetItem",
      "dynamodb:BatchGetItem",
      "dynamodb:Query",
      "dynamodb:Scan",
    ]
    resources = [var.table_arn, "${var.table_arn}/index/*"]
  }

  statement {
    sid = "ReadFunction"
    actions = [
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:ListVersionsByFunction",
      "lambda:GetPolicy",
    ]
    resources = [var.function_arn]
  }

  statement {
    sid       = "ReadApi"
    actions   = ["apigateway:GET"]
    resources = [local.api_arn, "${local.api_arn}/*"]
  }

  statement {
    sid = "ReadUsers"
    actions = [
      "cognito-idp:DescribeUserPool",
      "cognito-idp:DescribeUserPoolClient",
      "cognito-idp:ListUserPoolClients",
      "cognito-idp:ListUsers",
      "cognito-idp:AdminGetUser",
    ]
    resources = [var.user_pool_arn]
  }

  statement {
    sid = "ReadSite"
    actions = [
      "cloudfront:GetDistribution",
      "cloudfront:GetDistributionConfig",
      "cloudfront:ListInvalidations",
      "cloudfront:GetInvalidation",
    ]
    resources = [var.distribution_arn]
  }

  statement {
    sid       = "ListSiteBucket"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [var.bucket_arn]
  }

  statement {
    sid       = "ReadSiteFiles"
    actions   = ["s3:GetObject"]
    resources = ["${var.bucket_arn}/*"]
  }
}

resource "aws_iam_role_policy" "read" {
  count = local.enabled ? 1 : 0

  name   = "${var.name_prefix}-developer-readonly"
  role   = aws_iam_role.developer[0].id
  policy = data.aws_iam_policy_document.read.json
}
