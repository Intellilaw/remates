# AWS deployment

Target domain: `subastas.legalflow.solutions`

## Architecture

- Vercel remains the DNS host for `legalflow.solutions`.
- CloudFront serves `subastas.legalflow.solutions`.
- S3 hosts the public web app, admin app, and mobile capture app.
- CloudFront routes `/api/*` to the Application Load Balancer.
- ECS Fargate runs the Node API in private subnets.
- RDS PostgreSQL is private and only accepts traffic from ECS.
- Prisma migrations create and evolve the relational schema.
- Secrets live in AWS Secrets Manager.
- Logs go to CloudWatch.
- ACM issues the TLS certificate, validated by DNS records added in Vercel.

## First deployment

1. Install AWS CLI, Terraform and Docker locally.
2. Authenticate AWS CLI with the target AWS account.
3. Copy `infra/terraform/terraform.tfvars.example` to `infra/terraform/terraform.tfvars` and fill secrets.
   - Set `openai_api_key` so the mobile capture app can extract subasta data from photos.
   - Set `google_maps_api_key` so published subastas can use Google Street View / Static Maps before falling back to the local reference image.
   - Keep `openai_extraction_model = "gpt-4.1-mini"` unless you intentionally test another vision-capable Responses API model.
4. Run the first Terraform apply with `service_desired_count = 0`.

```powershell
cd infra/terraform
terraform init
terraform apply
```

5. Build and push the image to the `ecr_repository_url` output.

```powershell
$AWS_REGION="us-east-1"
$ECR_REPO="<ecr_repository_url output>"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ($ECR_REPO -replace "/.*$", "")
docker build -f apps/api/Dockerfile -t "$ECR_REPO:latest" .
docker push "$ECR_REPO:latest"
```

6. Add the ACM validation record shown in `acm_dns_validation_records` to Vercel DNS.
7. Upload the frontend files to the `frontend_bucket` output.

```powershell
aws s3 sync apps/web "s3://<frontend_bucket>" --delete --exclude "assets/home-v*" --exclude "assets/app.*" --exclude "assets/client-v11.*"
aws s3 sync apps/admin "s3://<frontend_bucket>/admin" --delete
aws s3 sync apps/mobile "s3://<frontend_bucket>/mobile" --delete
```

8. Add the app DNS record shown in `vercel_dns_record_for_app` to Vercel DNS:

```text
Name: subastas
Type: CNAME
Value: <cloudfront_domain_name output>
```

9. Once ACM is issued, set `enable_https = true` and `service_desired_count = 1`, then run:

```powershell
terraform apply
```

The container runs `prisma migrate deploy` before starting the server, so the database schema is applied on release.

10. After each frontend upload, invalidate CloudFront:

```powershell
aws cloudfront create-invalidation --distribution-id <cloudfront_distribution_id> --paths "/*"
```
