# Zample Elastic Beanstalk Low-Cost Runbook

This runbook documents the current low-cost Elastic Beanstalk production shape for Zample.

## Current Production Shape

- Application: `zample`
- Live environment name: `zample-prod`
- Public URL: `http://zample-prod.eba-qdzw3jbg.us-west-2.elasticbeanstalk.com`
- Platform: `64bit Amazon Linux 2023 v6.11.2 running Node.js 20`
- Environment type: `SingleInstance`
- Instance type: `t4g.nano`
- Architecture: `arm64`
- Capacity: `MinSize=1`, `MaxSize=1`
- Storage: `8 GB gp3`

## Why This Shape

This keeps Zample in the target cost band by removing the load balancer and limiting the deployment to a single small instance.

Approximate monthly baseline:

- EC2 `t4g.nano`: about `$3.07`
- EBS `8 GB gp3`: about `$0.64`
- Public IPv4: about `$3.65`
- Total: about `$7.36` before taxes and incidental usage

## Deployment Helper Defaults

`scripts/aws/deploy-eb.sh` now defaults to this production shape:

- `ENV_NAME=zample-prod`
- `ENVIRONMENT_TYPE=SingleInstance`
- `INSTANCE_TYPE=t4g.nano`
- `INSTANCE_TYPES=t4g.nano`
- `SUPPORTED_ARCHITECTURES=arm64`
- `MIN_SIZE=1`
- `MAX_SIZE=1`
- `NPM_USE_PRODUCTION=true`
- `PREBUILD_WEB=true`
- `PACKAGE_SOURCE=worktree`
- `VERSION_RETENTION_COUNT=10`

## Operational Improvements In The Script

- prebuilds the Next.js app before packaging
- preserves the current `SESSION_SECRET` during environment updates unless explicitly overridden
- supports `CNAME_PREFIX` for side-by-side environment creation and zero-downtime cutovers
- prunes older Elastic Beanstalk application versions and their S3 source bundles after successful deploys
- uses a custom readiness loop instead of the default AWS CLI waiter to avoid false timeout failures on healthy environments

## Typical Deploy

```bash
AWS_PROFILE=mcoen-aws AWS_REGION=us-west-2 ./scripts/aws/deploy-eb.sh
```

## Side-By-Side Replacement Deploy

Use this when you need to create a second environment, verify it, then swap CNAMEs:

```bash
AWS_PROFILE=mcoen-aws AWS_REGION=us-west-2 \
ENV_NAME=zample-prod-replacement \
CNAME_PREFIX=zample-prod-replacement \
./scripts/aws/deploy-eb.sh
```
