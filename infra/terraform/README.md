# Terraform

Layout:

- `bootstrap/`: creates the remote-state S3 bucket. Local state, run once per AWS account.
- `modules/data`: DynamoDB single table.
- `modules/api`: Lambda, IAM, API Gateway HTTP API, log groups.
- `modules/web-hosting`: private S3 bucket, CloudFront distribution (web plus `/api/*`), SPA rewrite function.
- `envs/dev`, `envs/prod`: compose the modules. No resources of their own.

Order: apply `bootstrap` first, then point each env at the state bucket with `backend.hcl` and apply the env.

Environment-specific values (profile, region, bucket name) live in gitignored `terraform.tfvars` and `backend.hcl`; copy the `*.example` files.

## First-time setup per AWS account

```
cd infra/terraform/bootstrap
cp terraform.tfvars.example terraform.tfvars   # aws_profile, aws_region, state_bucket_name, project
terraform init
terraform plan -out=bootstrap.tfplan
terraform apply bootstrap.tfplan

cd ../envs/dev
cp backend.hcl.example backend.hcl             # same bucket, region and profile as bootstrap
cp terraform.tfvars.example terraform.tfvars
terraform init -backend-config=backend.hcl
```

## Deploy (from the repo root)

```
pnpm build                                     # Terraform zips apps/api/dist
terraform -chdir=infra/terraform/envs/dev plan -out=dev.tfplan
terraform -chdir=infra/terraform/envs/dev apply dev.tfplan
terraform -chdir=infra/terraform/envs/dev output
```

Upload the frontend build to `web_bucket_name` with `aws s3 sync` (long cache for hashed assets, `no-cache` for `index.html`), then create a CloudFront invalidation for `/*` on `distribution_id`. Check `https://<cloudfront_domain_name>/api/health`.

Logs: Lambda in `/aws/lambda/<project>-<env>-api`, API access logs in `/aws/apigateway/<project>-<env>-api`.
