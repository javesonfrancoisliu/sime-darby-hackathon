# Matching runs in its own Lambda: it only reads the table, it is the only function that may read
# the Claude API key, and it gets a longer timeout for the AI re-rank. API Gateway sends its one route here.
data "archive_file" "matching" {
  type        = "zip"
  source_dir  = var.matching_source_dir
  output_path = var.matching_output_path
}

resource "aws_cloudwatch_log_group" "matching" {
  name              = "/aws/lambda/${var.name_prefix}-matching"
  retention_in_days = var.log_retention_days
}

resource "aws_iam_role" "matching" {
  name               = "${var.name_prefix}-matching"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_policy_document" "matching" {
  statement {
    sid       = "WriteLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.matching.arn}:*"]
  }

  statement {
    sid       = "ReadTable"
    actions   = ["dynamodb:GetItem", "dynamodb:Query"]
    resources = [var.table_arn, "${var.table_arn}/index/*"]
  }

  dynamic "statement" {
    for_each = local.anthropic_api_key_parameter_arn == null ? [] : [1]

    content {
      sid     = "ReadClaudeApiKey"
      actions = ["ssm:GetParameter"]
      # No kms statement: the AWS managed aws/ssm key policy already allows decrypt through SSM for principals in the account.
      resources = [local.anthropic_api_key_parameter_arn]
    }
  }
}

resource "aws_iam_role_policy" "matching" {
  name   = "${var.name_prefix}-matching"
  role   = aws_iam_role.matching.id
  policy = data.aws_iam_policy_document.matching.json
}

resource "aws_lambda_function" "matching" {
  function_name = "${var.name_prefix}-matching"
  role          = aws_iam_role.matching.arn
  runtime       = "nodejs24.x"
  architectures = ["arm64"]
  handler       = "handler.handler"
  memory_size   = 512
  timeout       = var.matching_timeout_seconds

  filename         = data.archive_file.matching.output_path
  source_code_hash = data.archive_file.matching.output_base64sha256

  environment {
    variables = {
      TABLE_NAME        = var.table_name
      SERVICE_NAME      = "${var.name_prefix}-matching"
      NODE_OPTIONS      = "--enable-source-maps"
      DEMO_AUTH_ENABLED = var.demo_auth_enabled ? "true" : "false"

      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
      COGNITO_CLIENT_ID    = var.cognito_client_id

      MATCHING_AI_MODEL_ID    = var.matching_ai_model_id
      ANTHROPIC_API_KEY_PARAM = var.anthropic_api_key_parameter_name
      MATCHING_AI_TIMEOUT_MS  = tostring(var.matching_ai_timeout_ms)
    }
  }

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.matching.name
  }

  depends_on = [
    aws_cloudwatch_log_group.matching,
    aws_iam_role_policy.matching,
  ]
}

resource "aws_apigatewayv2_integration" "matching" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.matching.invoke_arn
  payload_format_version = "2.0"
}

# HTTP APIs pick the most specific route, so this wins over ANY /api/{proxy+}.
resource "aws_apigatewayv2_route" "matching" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /api/requests/{id}/matches"
  target    = "integrations/${aws_apigatewayv2_integration.matching.id}"
}

# Personalized young-volunteer recommendations reuse the existing matching Lambda.
resource "aws_apigatewayv2_route" "opportunities_matching" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /api/opportunities"
  target    = "integrations/${aws_apigatewayv2_integration.matching.id}"
}

resource "aws_lambda_permission" "matching" {
  statement_id  = "AllowHttpApiInvokeMatches"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.matching.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/GET/api/requests/*/matches"
}

resource "aws_lambda_permission" "opportunities_matching" {
  statement_id  = "AllowHttpApiInvokeOpportunities"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.matching.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/GET/api/opportunities"
}
