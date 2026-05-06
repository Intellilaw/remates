# AWS deploy permissions

The `Intellilaw-deploy` principal must be able to provision and update the production stack for `remates.legalflow.solutions`.

For the initial infrastructure creation, the simplest operational path is to attach `AdministratorAccess` temporarily, run Terraform, then replace it with a tighter deployment policy once resources exist.

Terraform currently provisions:

- VPC, public/private subnets, route tables, NAT gateway, EIP and security groups
- Application Load Balancer and target group
- ECS cluster, task definition and service
- ECR repository
- RDS PostgreSQL
- S3 frontend bucket and bucket policy
- CloudFront distribution, function and origin access control
- ACM certificate
- IAM task roles and policies
- Secrets Manager secret
- CloudWatch log group

At minimum, the deploy principal needs create/update/delete/read permissions across:

- `acm:*`
- `cloudfront:*`
- `ec2:*`
- `ecr:*`
- `ecs:*`
- `elasticloadbalancing:*`
- `iam:*` for role and policy management used by ECS
- `logs:*`
- `rds:*`
- `s3:*`
- `secretsmanager:*`
- `application-autoscaling:*` if autoscaling is added later

It also needs `sts:GetCallerIdentity` for verification.
