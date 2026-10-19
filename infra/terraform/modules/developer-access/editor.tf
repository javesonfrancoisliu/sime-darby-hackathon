# Editor role: everything the read-only role can see, plus changes to this stack's data, code and
# settings. It cannot delete the stack's table, function, user pool, distribution, bucket or API,
# change IAM beyond passing the function its own role, or add public access to the function.
locals {
  editor_enabled              = local.enabled && var.editor_enabled
  lambda_test_events_registry = "arn:aws:schemas:${local.region}:${local.account_id}:registry/lambda-testevent-schemas"
}

resource "aws_iam_role" "editor" {
  count = local.editor_enabled ? 1 : 0

  name                 = "${var.name_prefix}-developer-editor"
  description          = "Edit access for developers to this stack's data, code and settings."
  assume_role_policy   = data.aws_iam_policy_document.assume.json
  max_session_duration = var.max_session_duration_seconds
}

resource "aws_iam_role_policy" "editor_read" {
  count = local.editor_enabled ? 1 : 0

  name   = "${var.name_prefix}-developer-read"
  role   = aws_iam_role.editor[0].id
  policy = data.aws_iam_policy_document.read.json
}

data "aws_iam_policy_document" "edit" {
  statement {
    sid = "EditFunction"
    actions = [
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "lambda:InvokeFunction",
      "lambda:PublishVersion",
      "lambda:CreateAlias",
      "lambda:UpdateAlias",
      "lambda:DeleteAlias",
      "lambda:PutFunctionConcurrency",
      "lambda:DeleteFunctionConcurrency",
      "lambda:PutFunctionEventInvokeConfig",
      "lambda:UpdateFunctionEventInvokeConfig",
      "lambda:TagResource",
      "lambda:UntagResource",
    ]
    resources = local.function_resources
  }

  # The console sends the execution role when saving basic settings; only the stack's Lambda roles can be passed.
  statement {
    sid       = "PassFunctionOwnRole"
    actions   = ["iam:PassRole"]
    resources = var.function_role_arns

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com"]
    }
  }

  # Shareable test events in the Lambda console are stored in this EventBridge Schemas registry.
  statement {
    sid = "LambdaTestEvents"
    actions = [
      "schemas:CreateRegistry",
      "schemas:DescribeRegistry",
      "schemas:CreateSchema",
      "schemas:DescribeSchema",
      "schemas:UpdateSchema",
      "schemas:DeleteSchema",
      "schemas:ListSchemaVersions",
    ]
    resources = [
      local.lambda_test_events_registry,
      "arn:aws:schemas:${local.region}:${local.account_id}:schema/lambda-testevent-schemas/*",
    ]
  }

  statement {
    sid = "EditTableItems"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:ConditionCheckItem",
      "dynamodb:PartiQLInsert",
      "dynamodb:PartiQLUpdate",
      "dynamodb:PartiQLDelete",
    ]
    resources = [var.table_arn, "${var.table_arn}/index/*"]
  }

  statement {
    sid       = "EditSiteFiles"
    actions   = ["s3:PutObject", "s3:DeleteObject", "s3:PutObjectTagging"]
    resources = ["${var.bucket_arn}/*"]
  }

  statement {
    sid = "EditUsersAndPool"
    actions = [
      "cognito-idp:Admin*",
      "cognito-idp:CreateGroup",
      "cognito-idp:UpdateGroup",
      "cognito-idp:DeleteGroup",
      "cognito-idp:UpdateUserPool",
      "cognito-idp:UpdateUserPoolClient",
      "cognito-idp:SetUserPoolMfaConfig",
      "cognito-idp:TagResource",
      "cognito-idp:UntagResource",
    ]
    resources = [var.user_pool_arn]
  }

  statement {
    sid       = "EditDistribution"
    actions   = ["cloudfront:UpdateDistribution", "cloudfront:CreateInvalidation", "cloudfront:TagResource", "cloudfront:UntagResource"]
    resources = [var.distribution_arn]
  }

  statement {
    sid       = "EditSiteFunction"
    actions   = ["cloudfront:UpdateFunction", "cloudfront:PublishFunction", "cloudfront:TestFunction"]
    resources = [var.cloudfront_function_arn]
  }

  statement {
    sid       = "EditApiSettings"
    actions   = ["apigateway:PATCH"]
    resources = ["${local.apigateway_prefix}/apis/${var.api_id}"]
  }

  statement {
    sid       = "EditApiRoutesAndStages"
    actions   = ["apigateway:POST", "apigateway:PUT", "apigateway:PATCH", "apigateway:DELETE"]
    resources = ["${local.apigateway_prefix}/apis/${var.api_id}/*"]
  }

  statement {
    sid     = "EditStackAlarmsAndDashboards"
    actions = ["cloudwatch:PutMetricAlarm", "cloudwatch:DeleteAlarms", "cloudwatch:PutDashboard", "cloudwatch:DeleteDashboards"]
    resources = [
      "arn:aws:cloudwatch:${local.region}:${local.account_id}:alarm:${var.name_prefix}-*",
      "arn:aws:cloudwatch::${local.account_id}:dashboard/${var.name_prefix}-*",
    ]
  }

  # Saved Logs Insights queries have no resource-level permissions.
  statement {
    sid = "EditorConsolePages"
    actions = [
      "logs:PutQueryDefinition",
      "logs:DeleteQueryDefinition",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "edit" {
  count = local.editor_enabled ? 1 : 0

  name   = "${var.name_prefix}-developer-edit"
  role   = aws_iam_role.editor[0].id
  policy = data.aws_iam_policy_document.edit.json
}
