#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-zample}"
ENV_NAME="${ENV_NAME:-zample-prod}"
AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_PROFILE="${AWS_PROFILE:-mcoen-aws}"
ENVIRONMENT_TYPE="${ENVIRONMENT_TYPE:-SingleInstance}"
LOAD_BALANCER_TYPE="${LOAD_BALANCER_TYPE:-classic}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t4g.nano}"
INSTANCE_TYPES="${INSTANCE_TYPES:-$INSTANCE_TYPE}"
SUPPORTED_ARCHITECTURES="${SUPPORTED_ARCHITECTURES:-arm64}"
MIN_SIZE="${MIN_SIZE:-1}"
MAX_SIZE="${MAX_SIZE:-1}"
NPM_USE_PRODUCTION="${NPM_USE_PRODUCTION:-true}"
PREBUILD_WEB="${PREBUILD_WEB:-true}"
VERSION_RETENTION_COUNT="${VERSION_RETENTION_COUNT:-10}"
WAIT_SLEEP_SECONDS="${WAIT_SLEEP_SECONDS:-10}"
WAIT_MAX_ATTEMPTS="${WAIT_MAX_ATTEMPTS:-90}"

VERSION_LABEL="${VERSION_LABEL:-$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)}"
TMP_DIR="$(mktemp -d /tmp/${APP_NAME}-deploy-XXXXXX)"
BUNDLE_PATH="${TMP_DIR}/${APP_NAME}-${VERSION_LABEL}.zip"
S3_KEY="${APP_NAME}/${VERSION_LABEL}.zip"
PACKAGE_SOURCE="${PACKAGE_SOURCE:-worktree}"
SESSION_SECRET_VALUE="${SESSION_SECRET_VALUE:-}"
CNAME_PREFIX="${CNAME_PREFIX:-}"

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
require_cmd openssl

wait_for_environment_ready() {
  local attempt=1
  local response status health health_status

  while (( attempt <= WAIT_MAX_ATTEMPTS )); do
    response="$(
      AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments \
        --application-name "$APP_NAME" \
        --environment-names "$ENV_NAME" \
        --query 'Environments[0].[Status,Health,HealthStatus]' \
        --output text 2>/dev/null || true
    )"

    status="$(printf '%s\n' "$response" | awk '{print $1}')"
    health="$(printf '%s\n' "$response" | awk '{print $2}')"
    health_status="$(printf '%s\n' "$response" | awk '{print $3}')"

    echo "[deploy] Wait ${attempt}/${WAIT_MAX_ATTEMPTS}: status=${status:-unknown} health=${health:-unknown} healthStatus=${health_status:-unknown}"

    if [[ "$status" == "Ready" && "$health" != "Grey" && "$health_status" != "Pending" ]]; then
      return 0
    fi

    if [[ "$status" == "Terminated" ]]; then
      echo "Environment ${ENV_NAME} terminated while waiting for readiness" >&2
      exit 1
    fi

    sleep "$WAIT_SLEEP_SECONDS"
    ((attempt += 1))
  done

  echo "Timed out waiting for environment ${ENV_NAME} to become ready" >&2
  exit 1
}

ENV_EXISTS="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --include-deleted --query "Environments[?Status!='Terminated'] | [0].EnvironmentName" --output text 2>/dev/null || true)"

if [[ -z "$SESSION_SECRET_VALUE" ]]; then
  if [[ -n "$ENV_EXISTS" && "$ENV_EXISTS" != "None" ]]; then
    CURRENT_SESSION_SECRET="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-configuration-settings \
      --application-name "$APP_NAME" \
      --environment-name "$ENV_NAME" \
      --query "ConfigurationSettings[0].OptionSettings[?Namespace=='aws:elasticbeanstalk:application:environment' && OptionName=='SESSION_SECRET'].Value | [0]" \
      --output text 2>/dev/null || true)"

    if [[ -n "$CURRENT_SESSION_SECRET" && "$CURRENT_SESSION_SECRET" != "None" ]]; then
      SESSION_SECRET_VALUE="$CURRENT_SESSION_SECRET"
    fi
  fi

  if [[ -z "$SESSION_SECRET_VALUE" ]]; then
    SESSION_SECRET_VALUE="$(openssl rand -hex 32)"
  fi
fi

if [[ "$PREBUILD_WEB" == "true" ]]; then
  require_cmd npm
  echo "[deploy] Building Next.js app locally..."
  npm run build --workspace @zample/web
fi

if [[ "$PACKAGE_SOURCE" == "head" ]]; then
  echo "[deploy] Packaging source from git HEAD..."
  git archive --format=zip --output "$BUNDLE_PATH" HEAD
else
  echo "[deploy] Packaging source from current worktree..."
  (
    cd "$(git rev-parse --show-toplevel)"
    zip -qr "$BUNDLE_PATH" . \
      -x ".git/*" \
      -x "node_modules/*" \
      -x "*.DS_Store"
  )
fi

OPTION_SETTINGS=(
  "Namespace=aws:autoscaling:asg,ResourceName=AWSEBAutoScalingGroup,OptionName=MinSize,Value=${MIN_SIZE}"
  "Namespace=aws:autoscaling:asg,ResourceName=AWSEBAutoScalingGroup,OptionName=MaxSize,Value=${MAX_SIZE}"
  "Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=aws-elasticbeanstalk-ec2-role"
  "Namespace=aws:autoscaling:launchconfiguration,OptionName=InstanceType,Value=${INSTANCE_TYPE}"
  "Namespace=aws:ec2:instances,OptionName=InstanceTypes,Value=${INSTANCE_TYPES}"
  "Namespace=aws:ec2:instances,OptionName=SupportedArchitectures,Value=${SUPPORTED_ARCHITECTURES}"
  "Namespace=aws:elasticbeanstalk:application:environment,OptionName=NEXT_PUBLIC_API_URL,Value=/api"
  "Namespace=aws:elasticbeanstalk:application:environment,OptionName=ZAMPLE_AUTH_MODE,Value=seed"
  "Namespace=aws:elasticbeanstalk:application:environment,OptionName=SESSION_COOKIE_SECURE,Value=false"
  "Namespace=aws:elasticbeanstalk:application:environment,OptionName=SESSION_SECRET,Value=${SESSION_SECRET_VALUE}"
  "Namespace=aws:elasticbeanstalk:application:environment,OptionName=NPM_USE_PRODUCTION,Value=${NPM_USE_PRODUCTION}"
  "Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=3000"
  "Namespace=aws:elasticbeanstalk:environment,OptionName=EnvironmentType,Value=${ENVIRONMENT_TYPE}"
)

if [[ "$ENVIRONMENT_TYPE" == "LoadBalanced" ]]; then
  OPTION_SETTINGS+=(
    "Namespace=aws:elasticbeanstalk:environment,OptionName=LoadBalancerType,Value=${LOAD_BALANCER_TYPE}"
  )
fi

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

if [[ -z "$ENV_EXISTS" || "$ENV_EXISTS" == "None" ]]; then
  echo "[deploy] Environment not found. Creating: $ENV_NAME"

  NODE_STACKS="$({
    AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk list-available-solution-stacks \
      --query "SolutionStacks[?contains(@, 'Node.js')]" \
      --output text | tr '\t' '\n'
  })"

  SOLUTION_STACK="$(printf '%s\n' "$NODE_STACKS" | rg "Node\\.js 20" -m 1 || true)"
  if [[ -z "$SOLUTION_STACK" ]]; then
    SOLUTION_STACK="$(printf '%s\n' "$NODE_STACKS" | rg "Node\\.js 22" -m 1 || true)"
  fi
  if [[ -z "$SOLUTION_STACK" ]]; then
    SOLUTION_STACK="$(printf '%s\n' "$NODE_STACKS" | rg "Node\\.js 24" -m 1 || true)"
  fi
  if [[ -z "$SOLUTION_STACK" ]]; then
    SOLUTION_STACK="$(printf '%s\n' "$NODE_STACKS" | head -n 1 || true)"
  fi

  if [[ -z "$SOLUTION_STACK" || "$SOLUTION_STACK" == "None" ]]; then
    echo "Unable to find an available Node.js Elastic Beanstalk solution stack" >&2
    exit 1
  fi

  CREATE_ENV_ARGS=(
    --application-name "$APP_NAME"
    --environment-name "$ENV_NAME"
    --solution-stack-name "$SOLUTION_STACK"
    --version-label "$VERSION_LABEL"
    --option-settings "${OPTION_SETTINGS[@]}"
  )

  if [[ -n "$CNAME_PREFIX" ]]; then
    CREATE_ENV_ARGS+=(--cname-prefix "$CNAME_PREFIX")
  fi

  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk create-environment \
    "${CREATE_ENV_ARGS[@]}" >/dev/null

  echo "[deploy] Waiting for environment to become ready..."
  wait_for_environment_ready
else
  echo "[deploy] Updating existing environment: $ENV_NAME"
  AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk update-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --version-label "$VERSION_LABEL" \
    --option-settings "${OPTION_SETTINGS[@]}" >/dev/null

  echo "[deploy] Waiting for environment update to complete..."
  wait_for_environment_ready
fi

cleanup_old_versions() {
  if ! [[ "$VERSION_RETENTION_COUNT" =~ ^[0-9]+$ ]]; then
    echo "VERSION_RETENTION_COUNT must be a non-negative integer" >&2
    exit 1
  fi

  if (( VERSION_RETENTION_COUNT == 0 )); then
    echo "[deploy] Skipping application version cleanup because VERSION_RETENTION_COUNT=0"
    return
  fi

  local active_versions_raw all_versions_raw
  active_versions_raw="$(
    AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments \
      --application-name "$APP_NAME" \
      --query "Environments[?Status!='Terminated'].VersionLabel" \
      --output text 2>/dev/null || true
  )"
  all_versions_raw="$(
    AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-application-versions \
      --application-name "$APP_NAME" \
      --query "reverse(sort_by(ApplicationVersions,&DateCreated))[].VersionLabel" \
      --output text
  )"

  mapfile -t active_versions < <(printf '%s\n' "$active_versions_raw" | tr '\t' '\n' | awk 'NF')
  mapfile -t all_versions < <(printf '%s\n' "$all_versions_raw" | tr '\t' '\n' | awk 'NF')

  if (( ${#all_versions[@]} <= VERSION_RETENTION_COUNT )); then
    echo "[deploy] Application version count (${#all_versions[@]}) is within retention target (${VERSION_RETENTION_COUNT})"
    return
  fi

  contains_version() {
    local needle="$1"
    shift
    local candidate
    for candidate in "$@"; do
      if [[ "$candidate" == "$needle" ]]; then
        return 0
      fi
    done
    return 1
  }

  local index=0
  local deleted_count=0
  local version_label
  for version_label in "${all_versions[@]}"; do
    ((index += 1))
    if (( index <= VERSION_RETENTION_COUNT )); then
      continue
    fi

    if contains_version "$version_label" "${active_versions[@]}"; then
      echo "[deploy] Keeping active application version: ${version_label}"
      continue
    fi

    echo "[deploy] Deleting old application version: ${version_label}"
    AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk delete-application-version \
      --application-name "$APP_NAME" \
      --version-label "$version_label" \
      --delete-source-bundle >/dev/null
    ((deleted_count += 1))
  done

  echo "[deploy] Deleted ${deleted_count} old application version(s)"
}

cleanup_old_versions

CNAME="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --query 'Environments[0].CNAME' --output text)"
HEALTH="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --query 'Environments[0].Health' --output text)"
STATUS="$(AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws elasticbeanstalk describe-environments --application-name "$APP_NAME" --environment-names "$ENV_NAME" --query 'Environments[0].Status' --output text)"

echo "[deploy] Done"
echo "[deploy] Environment: ${ENV_NAME}"
echo "[deploy] Status: ${STATUS} | Health: ${HEALTH}"
echo "[deploy] URL: http://${CNAME}"
