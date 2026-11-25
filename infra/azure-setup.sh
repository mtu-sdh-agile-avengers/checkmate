#!/usr/bin/env bash
# Creates the Azure resources of Checkmate with the Azure CLI (docs/deployment-azure.md).
#
# Run it in Azure Cloud Shell (Bash), where `az` is installed and already signed in:
#   bash azure-setup.sh setup   # now: regions, resource group, Static Web App, identity, environment
#   bash azure-setup.sh app     # after the first main run published the image: the Container App
#
# Safe to run again: what already exists is kept. Regions are picked from the regions
# your subscription allows (Azure for Students restricts them); to choose yourself:
#   APP_REGION=swedencentral SWA_REGION=eastus2 bash azure-setup.sh setup
set -euo pipefail

RG=checkmate-rg
SWA=checkmate-web
ENV_NAME=checkmate-env
APP=checkmate-api
IDENTITY=checkmate-github
GITHUB_REPO=mtu-sdh-agile-avengers/checkmate
GITHUB_ENVIRONMENT=production
IMAGE=ghcr.io/mtu-sdh-agile-avengers/checkmate-backend:latest
USER_AGENT="Checkmate/1.0 (MTU student project; contact: pavloautomation@gmail.com)"

# Static Web Apps exists in these regions only; the site files are served globally anyway
SWA_REGIONS="westeurope eastus2 centralus westus2 eastasia"
# Closest to Ireland first
APP_REGIONS="northeurope westeurope uksouth ukwest francecentral swedencentral germanywestcentral
  norwayeast switzerlandnorth polandcentral italynorth spaincentral eastus2 eastus centralus"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

# Lowercase region names, one per line, without "global"
normalize_regions() {
  tr '[:upper:]' '[:lower:]' | tr -d ' \r' | grep -v -e '^global$' -e '^$' | sort -u || true
}

# Regions allowed by every "allowed locations" policy of the subscription (empty: none)
allowed_regions() {
  local assignments count i list definition result="" found=0
  assignments=$(az policy assignment list --disable-scope-strict-match -o json 2>/dev/null || echo '[]')
  count=$(jq length <<<"$assignments")
  for ((i = 0; i < count; i++)); do
    # the list set in the assignment, else the default of its policy definition
    list=$(jq -r ".[$i] | (.parameters // {}) | to_entries[] | select(.key | test(\"ocation\"))
                  | .value.value | arrays | .[]" <<<"$assignments" | normalize_regions)
    if [ -z "$list" ]; then
      definition=$(jq -r ".[$i].policyDefinitionId // empty" <<<"$assignments")
      [ -n "$definition" ] || continue
      list=$(az rest --method get -o json \
        --url "https://management.azure.com${definition}?api-version=2023-04-01" 2>/dev/null |
        jq -r '(.properties.parameters // {}) | to_entries[] | select(.key | test("ocation"))
               | .value.defaultValue | arrays | .[]' 2>/dev/null | normalize_regions)
    fi
    [ -n "$list" ] || continue
    # a region must pass every such policy
    if [ "$found" = 0 ]; then
      result=$list
      found=1
    else
      result=$(comm -12 <(echo "$result") <(echo "$list"))
    fi
  done
  echo "$result"
}

# First region of the preference list that is allowed (all are allowed without a policy)
pick_region() {
  local preferred=$1 allowed=$2 region
  for region in $preferred; do
    if [ -z "$allowed" ] || grep -qx "$region" <<<"$allowed"; then
      echo "$region"
      return
    fi
  done
}

choose_regions() {
  say "Allowed regions"
  local allowed
  allowed=$(allowed_regions)
  if [ -n "$allowed" ]; then
    echo "$allowed" | paste -sd ' ' -
  else
    echo "(no region policy found: every region is allowed)"
  fi
  APP_REGION=${APP_REGION:-$(pick_region "$APP_REGIONS" "$allowed")}
  SWA_REGION=${SWA_REGION:-$(pick_region "$SWA_REGIONS" "$allowed")}
  if [ -z "$APP_REGION" ]; then
    echo "None of these regions is allowed: $APP_REGIONS"
    echo "Run again with APP_REGION=<one of the allowed regions above>"
    exit 1
  fi
  echo "Backend (Container Apps): $APP_REGION"
  echo "Frontend (Static Web Apps): ${SWA_REGION:-not allowed in any Static Web Apps region}"
}

setup() {
  local subscription tenant principal client scope token host

  az extension add --name containerapp --upgrade --yes --only-show-errors
  subscription=$(az account show --query id -o tsv)
  tenant=$(az account show --query tenantId -o tsv)
  say "Subscription: $(az account show --query name -o tsv) ($subscription)"
  choose_regions

  say "Resource providers"
  for provider in Microsoft.App Microsoft.OperationalInsights Microsoft.Web Microsoft.ManagedIdentity; do
    az provider register --namespace "$provider" --wait
    echo "$provider registered"
  done

  say "Resource group $RG"
  if az group show --name "$RG" -o none 2>/dev/null; then
    echo "exists in $(az group show --name "$RG" --query location -o tsv)"
  else
    az group create --name "$RG" --location "$APP_REGION" -o none
    echo "created in $APP_REGION"
  fi
  scope=$(az group show --name "$RG" --query id -o tsv)

  if [ -n "$SWA_REGION" ]; then
    say "Static Web App $SWA (Free, $SWA_REGION)"
    if ! az staticwebapp show --name "$SWA" --resource-group "$RG" -o none 2>/dev/null; then
      az staticwebapp create --name "$SWA" --resource-group "$RG" --location "$SWA_REGION" \
        --sku Free -o none
    fi
    host=$(az staticwebapp show --name "$SWA" --resource-group "$RG" --query defaultHostname -o tsv)
    token=$(az staticwebapp secrets list --name "$SWA" --resource-group "$RG" \
      --query properties.apiKey -o tsv 2>/dev/null || true)
    echo "https://$host"
  fi

  say "Identity $IDENTITY for GitHub Actions"
  az identity create --name "$IDENTITY" --resource-group "$RG" --location "$APP_REGION" -o none
  principal=$(az identity show --name "$IDENTITY" --resource-group "$RG" --query principalId -o tsv)
  client=$(az identity show --name "$IDENTITY" --resource-group "$RG" --query clientId -o tsv)
  if ! az identity federated-credential show --name github-production \
    --identity-name "$IDENTITY" --resource-group "$RG" -o none 2>/dev/null; then
    az identity federated-credential create --name github-production \
      --identity-name "$IDENTITY" --resource-group "$RG" \
      --issuer https://token.actions.githubusercontent.com \
      --subject "repo:$GITHUB_REPO:environment:$GITHUB_ENVIRONMENT" \
      --audiences api://AzureADTokenExchange -o none
  fi
  echo "trusts repo:$GITHUB_REPO:environment:$GITHUB_ENVIRONMENT"
  if [ -z "$(az role assignment list --assignee "$principal" --scope "$scope" \
    --role Contributor --query '[].id' -o tsv)" ]; then
    # a new identity takes a moment to appear in the directory
    for attempt in 1 2 3 4 5 6; do
      az role assignment create --assignee-object-id "$principal" \
        --assignee-principal-type ServicePrincipal --role Contributor --scope "$scope" \
        -o none && break
      echo "retrying in 20 s ($attempt/6)"
      sleep 20
    done
  fi
  echo "Contributor on $RG"

  say "Container Apps environment $ENV_NAME ($APP_REGION, takes a few minutes)"
  if ! az containerapp env show --name "$ENV_NAME" --resource-group "$RG" -o none 2>/dev/null; then
    az containerapp env create --name "$ENV_NAME" --resource-group "$RG" \
      --location "$APP_REGION" -o none
  fi
  echo "ready"

  say "GitHub: Settings > Secrets and variables > Actions > Secrets"
  echo "AZURE_CLIENT_ID                  $client"
  echo "AZURE_TENANT_ID                  $tenant"
  echo "AZURE_SUBSCRIPTION_ID            $subscription"
  if [ -n "$SWA_REGION" ]; then
    echo "AZURE_STATIC_WEB_APPS_API_TOKEN  ${token:-portal: $SWA > Overview > Manage deployment token}"
  fi
  echo
  echo "Do not add the variables yet: run 'bash azure-setup.sh app' after the merge."
}

app() {
  local host fqdn registry=()
  az extension add --name containerapp --upgrade --yes --only-show-errors
  host=$(az staticwebapp show --name "$SWA" --resource-group "$RG" --query defaultHostname -o tsv \
    2>/dev/null || true)
  # a private image: GHCR_USER=<github user> GHCR_TOKEN=<token with read:packages>
  if [ -n "${GHCR_TOKEN:-}" ]; then
    registry=(--registry-server ghcr.io --registry-username "$GHCR_USER"
      --registry-password "$GHCR_TOKEN")
  fi

  say "Container App $APP ($IMAGE)"
  if az containerapp show --name "$APP" --resource-group "$RG" -o none 2>/dev/null; then
    echo "exists: the pipeline updates its image on every push to main"
  else
    az containerapp create --name "$APP" --resource-group "$RG" --environment "$ENV_NAME" \
      --image "$IMAGE" "${registry[@]}" \
      --ingress external --target-port 8000 \
      --cpu 1 --memory 2Gi --min-replicas 0 --max-replicas 2 \
      --env-vars "API_CHESSCOM_USER_AGENT=$USER_AGENT" \
      "CORS_ORIGINS=[\"https://${host:-localhost}\"]" -o none
  fi
  fqdn=$(az containerapp show --name "$APP" --resource-group "$RG" \
    --query properties.configuration.ingress.fqdn -o tsv)

  say "Checks (the first request wakes the app up)"
  for attempt in $(seq 1 30); do
    curl --silent --fail "https://$fqdn/health" && break
    sleep 5
  done
  echo
  sleep 2
  echo "Chess.com from Azure: HTTP $(curl --silent --output /dev/null --write-out '%{http_code}' \
    "https://$fqdn/api/v1/players/hikaru/profile")  (200 = works, 503 = Chess.com blocks Azure)"

  say "GitHub: Settings > Secrets and variables > Actions > Variables"
  echo "AZURE_RESOURCE_GROUP  $RG"
  echo "AZURE_CONTAINER_APP   $APP"
  echo "BACKEND_URL           https://$fqdn"
  echo "FRONTEND_URL          https://$host"
  echo
  echo "Then: Actions > CI/CD > the latest run on main > Re-run all jobs."
}

case "${1:-}" in
  setup) setup ;;
  app) app ;;
  regions) choose_regions ;;
  *)
    echo "usage: bash $0 setup|app|regions"
    exit 2
    ;;
esac
