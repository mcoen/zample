#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-zample}"
ENV_NAME="${ENV_NAME:-zample-prod}"
AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_PROFILE="${AWS_PROFILE:-mcoen-aws}"

VERSION_LABEL="${VERSION_LABEL:-$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)}"
TMP_DIR="$(mktemp -d /tmp/${APP_NAME}-deploy-XXXXXX)"
BUNDLE_PATH="${TMP_DIR}/${APP_NAME}-${VERSION_LABEL}.zip"
S3_KEY="${APP_NAME}/${VERSION_LABEL}.zip"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd aws
require_cmd git
require_cmd zip

echo "[deploy] Packaging source from git HEAD..."
git archive --format=zip --output "$BUNDLE_PATH" HEAD

ACCOUNT_ID="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws sts get-caller-identity --query Account --output text)"
BUCKET_NAME="elasticbeanstalk-${AWS_REGION}-${ACCOUNT_ID}"

if ! AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
  echo "[deploy] Creating deployment bucket s3://${BUCKET_NAME}"
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws s3api create-bucket --bucket "$BUCKET_NAME" >/dev/null
  else
    AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws s3api create-bucket \
      --bucket "$BUCKET_NAME" \
      --create-bucket-configuration "LocationConstraint=${AWS_REGION}" >/dev/null
  fi
fi

echo "[deploy] Uploading bundle to s3://${BUCKET_NAME}/${S3_KEY}"
AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws s3 cp "$BUNDLE_PATH" "s3://${BUCKET_NAME}/${S3_KEY}" >/dev/null

APP_EXISTS="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-applications --application-names "$APP_NAME" --query 'Applications[0].ApplicationName' --output text 2>/dev/null || true)"
if [[ -z "$APP_EXISTS" || "$APP_EXISTS" == "None" ]]; then
  echo "[deploy] Creating Elastic Beanstalk application: $APP_NAME"
  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk create-application \
    --application-name "$APP_NAME" \
    --description "Zample marketplace platform" >/dev/null
fi

echo "[deploy] Creating application version: $VERSION_LABEL"
AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk create-application-version \
  --application-name "$APP_NAME" \
  --version-label "$VERSION_LABEL" \
  --source-bundle "S3Bucket=${BUCKET_NAME},S3Key=${S3_KEY}" \
  --process >/dev/null

ENV_EXISTS="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --include-deleted --query "Environments[?Status!='Terminated'] | [0].EnvironmentName" --output text 2>/dev/null || true)"

if [[ -z "$ENV_EXISTS" || "$ENV_EXISTS" == "None" ]]; then
  echo "[deploy] Environment not found. Creating: $ENV_NAME"

  SOLUTION_STACK="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk list-available-solution-stacks --query "SolutionStacks[?contains(@, 'running Node.js 20')][0]" --output text)"
  if [[ -z "$SOLUTION_STACK" || "$SOLUTION_STACK" == "None" ]]; then
    SOLUTION_STACK="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk list-available-solution-stacks --query "SolutionStacks[?contains(@, 'running Node.js 22')][0]" --output text)"
  fi

  if [[ -z "$SOLUTION_STACK" || "$SOLUTION_STACK" == "None" ]]; then
    echo "Unable to find an available Node.js 20/22 Elastic Beanstalk solution stack" >&2
    exit 1
  fi

  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk create-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --solution-stack-name "$SOLUTION_STACK" \
    --version-label "$VERSION_LABEL" \
    --option-settings \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=3000 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=API_PORT,Value=4000 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=LAUNCHES_PORT,Value=4101 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=TASKS_PORT,Value=4102 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=NEXT_PUBLIC_API_URL,Value=/api \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=API_GATEWAY_INTERNAL_URL,Value=http://127.0.0.1:4000 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=NPM_USE_PRODUCTION,Value=false >/dev/null

  echo "[deploy] Waiting for environment to become ready..."
  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk wait environment-updated --application-name "$APP_NAME" --environment-names "$ENV_NAME"
else
  echo "[deploy] Updating existing environment: $ENV_NAME"
  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk update-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --version-label "$VERSION_LABEL" \
    --option-settings \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=3000 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=API_PORT,Value=4000 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=LAUNCHES_PORT,Value=4101 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=TASKS_PORT,Value=4102 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=NEXT_PUBLIC_API_URL,Value=/api \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=API_GATEWAY_INTERNAL_URL,Value=http://127.0.0.1:4000 \
      Namespace=aws:elasticbeanstalk:application:environment,OptionName=NPM_USE_PRODUCTION,Value=false >/dev/null

  echo "[deploy] Waiting for environment update to complete..."
  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk wait environment-updated --application-name "$APP_NAME" --environment-names "$ENV_NAME"
fi

CNAME="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --query 'Environments[0].CNAME' --output text)"
HEALTH="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --query 'Environments[0].Health' --output text)"
STATUS="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --query 'Environments[0].Status' --output text)"

echo "[deploy] Done"
echo "[deploy] Environment: ${ENV_NAME}"
echo "[deploy] Status: ${STATUS} | Health: ${HEALTH}"
echo "[deploy] URL: http://${CNAME}"
