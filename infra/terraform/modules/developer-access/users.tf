# Teammate sign-ins. Terraform never sets passwords or access keys, so no secrets reach the state;
# the account owner sets each console password once in the IAM console.
resource "aws_iam_user" "developer" {
  for_each = toset(var.user_names)

  name          = each.value
  force_destroy = true
}

resource "aws_iam_group" "developers" {
  count = length(var.user_names) > 0 ? 1 : 0

  name = "${var.name_prefix}-developers"
}

resource "aws_iam_user_group_membership" "developer" {
  for_each = aws_iam_user.developer

  user   = each.value.name
  groups = [aws_iam_group.developers[0].name]
}

# Based on the AWS example for self-managed MFA, plus a password change for the first sign-in.
# With require_mfa, a user can only set a password and an MFA device until they sign in with MFA.
data "aws_iam_policy_document" "developers" {
  statement {
    sid       = "AllowViewAccountInfo"
    actions   = ["iam:GetAccountPasswordPolicy", "iam:ListVirtualMFADevices"]
    resources = ["*"]
  }

  statement {
    sid       = "AllowManageOwnVirtualMFADevice"
    actions   = ["iam:CreateVirtualMFADevice"]
    resources = ["arn:aws:iam::${local.account_id}:mfa/*"]
  }

  statement {
    sid = "AllowManageOwnPasswordAndMFA"
    actions = [
      "iam:ChangePassword",
      "iam:DeactivateMFADevice",
      "iam:EnableMFADevice",
      "iam:GetUser",
      "iam:GetMFADevice",
      "iam:ListMFADevices",
      "iam:ResyncMFADevice",
    ]
    resources = ["arn:aws:iam::${local.account_id}:user/$${aws:username}"]
  }

  # CLI access for local dev: each teammate manages access keys for their own user only.
  statement {
    sid = "AllowManageOwnAccessKeys"
    actions = [
      "iam:CreateAccessKey",
      "iam:DeleteAccessKey",
      "iam:GetAccessKeyLastUsed",
      "iam:ListAccessKeys",
      "iam:UpdateAccessKey",
    ]
    resources = ["arn:aws:iam::${local.account_id}:user/$${aws:username}"]
  }

  statement {
    sid       = "AllowSwitchToDeveloperRoles"
    actions   = ["sts:AssumeRole"]
    resources = concat(aws_iam_role.developer[*].arn, aws_iam_role.editor[*].arn)
  }

  dynamic "statement" {
    for_each = var.require_mfa ? [1] : []

    content {
      sid    = "DenyAllExceptListedIfNoMFA"
      effect = "Deny"
      not_actions = [
        "iam:ChangePassword",
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:GetAccountPasswordPolicy",
        "iam:GetUser",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices",
        "iam:ResyncMFADevice",
        "sts:GetSessionToken",
      ]
      resources = ["*"]

      condition {
        test     = "BoolIfExists"
        variable = "aws:MultiFactorAuthPresent"
        values   = ["false"]
      }
    }
  }
}

resource "aws_iam_group_policy" "developers" {
  count = length(var.user_names) > 0 ? 1 : 0

  name   = "${var.name_prefix}-developers"
  group  = aws_iam_group.developers[0].name
  policy = data.aws_iam_policy_document.developers.json
}

# Teammates get the read and edit permissions directly, so they work without switching roles.
# Managed policies, because a group's inline policies are capped at 5,120 characters in total.
resource "aws_iam_policy" "group_read" {
  count = length(var.user_names) > 0 ? 1 : 0

  name        = "${var.name_prefix}-developers-read"
  description = "Read this stack's logs, data, users and site."
  policy      = data.aws_iam_policy_document.read.json
}

resource "aws_iam_group_policy_attachment" "group_read" {
  count = length(var.user_names) > 0 ? 1 : 0

  group      = aws_iam_group.developers[0].name
  policy_arn = aws_iam_policy.group_read[0].arn
}

resource "aws_iam_policy" "group_edit" {
  count = length(var.user_names) > 0 && var.editor_enabled ? 1 : 0

  name        = "${var.name_prefix}-developers-edit"
  description = "Change this stack's data, code and settings."
  policy      = data.aws_iam_policy_document.edit.json
}

resource "aws_iam_group_policy_attachment" "group_edit" {
  count = length(var.user_names) > 0 && var.editor_enabled ? 1 : 0

  group      = aws_iam_group.developers[0].name
  policy_arn = aws_iam_policy.group_edit[0].arn
}
