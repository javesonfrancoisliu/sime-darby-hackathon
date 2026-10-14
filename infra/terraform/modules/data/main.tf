locals {
  gsi_names = toset(["GSI1", "GSI2", "GSI3"])
}

resource "aws_dynamodb_table" "main" {
  name         = "${var.name_prefix}-main"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  deletion_protection_enabled = var.deletion_protection

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  dynamic "attribute" {
    for_each = local.gsi_names
    content {
      name = "${attribute.value}PK"
      type = "S"
    }
  }

  dynamic "attribute" {
    for_each = local.gsi_names
    content {
      name = "${attribute.value}SK"
      type = "S"
    }
  }

  dynamic "global_secondary_index" {
    for_each = local.gsi_names
    content {
      name            = global_secondary_index.value
      projection_type = "ALL"

      key_schema {
        attribute_name = "${global_secondary_index.value}PK"
        key_type       = "HASH"
      }

      key_schema {
        attribute_name = "${global_secondary_index.value}SK"
        key_type       = "RANGE"
      }
    }
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}
