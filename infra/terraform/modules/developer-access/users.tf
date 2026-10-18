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
# Until a user signs in with MFA they can only set a password and an MFA device.
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

  statement {
    sid       = "AllowSwitchToDeveloperRoles"
    actions   = ["sts:AssumeRole"]
    resources = concat(aws_iam_role.developer[*].arn, aws_iam_role.editor[*].arn)
  }

  statement {
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

resource "aws_iam_group_policy" "developers" {
  count = length(var.user_names) > 0 ? 1 : 0

  name   = "${var.name_prefix}-developers"
  group  = aws_iam_group.developers[0].name
  policy = data.aws_iam_policy_document.developers.json
}
