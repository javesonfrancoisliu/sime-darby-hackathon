# IAM user for an app outside AWS that calls one Bedrock model. Terraform never creates its access key,
# so no secret reaches the state; the account owner creates the key once in the IAM console.
data "aws_bedrock_inference_profile" "model" {
  inference_profile_id = var.inference_profile_id
}

resource "aws_iam_user" "app" {
  name          = var.user_name
  force_destroy = true
}

# Follows the AWS cross-Region inference example: the profile, plus its models only when called through it.
data "aws_iam_policy_document" "invoke" {
  statement {
    sid       = "InvokeInferenceProfile"
    actions   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    resources = [data.aws_bedrock_inference_profile.model.inference_profile_arn]
  }

  statement {
    sid       = "InvokeModelsThroughProfile"
    actions   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    resources = data.aws_bedrock_inference_profile.model.models[*].model_arn

    condition {
      test     = "StringEquals"
      variable = "bedrock:InferenceProfileArn"
      values   = [data.aws_bedrock_inference_profile.model.inference_profile_arn]
    }
  }
}

resource "aws_iam_user_policy" "invoke" {
  name   = "${var.user_name}-invoke"
  user   = aws_iam_user.app.name
  policy = data.aws_iam_policy_document.invoke.json
}
