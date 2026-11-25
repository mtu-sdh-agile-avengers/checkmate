# Deployment on Azure

The pipeline (`.github/workflows/ci-cd.yml`) tests every push. After a push to `main` it
also publishes the backend image to GitHub Container Registry and deploys:

| Part | Azure service | What runs there |
| --- | --- | --- |
| Backend (FastAPI + Stockfish) | Azure Container Apps, Consumption plan | the Docker image `ghcr.io/mtu-sdh-agile-avengers/checkmate-backend` |
| Frontend (React build) | Azure Static Web Apps, Free plan | the files of `frontend/dist` |

Stockfish is installed inside the Docker image (`backend/app/Dockerfile`), so the server has
the engine without the binary ever being in git.

The deploy jobs are **skipped** until the Azure resources and the GitHub settings below exist.
Do the steps once, in this order. Names in `code` are suggestions; if you choose others, use
yours everywhere.

## 0. Let the pipeline publish the first image

1. Merge the DevOps pull request into `main`. The pipeline runs; the `Backend image` job pushes
   `ghcr.io/mtu-sdh-agile-avengers/checkmate-backend:latest` (the deploy jobs are skipped).
2. Make the image public so Azure can download it: GitHub → the organisation
   **mtu-sdh-agile-avengers** → **Packages** → `checkmate-backend` → **Package settings** →
   **Danger Zone** → **Change visibility** → **Public**.
   - If the organisation does not allow public packages, keep it private and use a token
     instead: GitHub → your avatar → **Settings** → **Developer settings** → **Personal access
     tokens** → **Tokens (classic)** → **Generate new token (classic)** with only the
     `read:packages` scope. In step 3 choose **Image type: Private** and enter
     `ghcr.io`, your GitHub username and this token.

## 1. Resource group

Azure portal → **Resource groups** → **Create**:

- Resource group: `checkmate-rg`
- Region: **North Europe** (Ireland). Azure for Students subscriptions only allow some regions:
  if a later step says the region is not allowed, use **West Europe** or another allowed one
  for every resource.

## 2. Static Web App (frontend)

Portal → **Static Web Apps** → **Create**:

- Resource group: `checkmate-rg`, Name: `checkmate-web`
- Plan type: **Free**
- Deployment details → Source: **Other** (the pipeline uploads the build; Azure must not add a
  workflow of its own)
- Review + create → Create

When it is ready, open it and copy:

- **URL** on the Overview page, e.g. `https://<random-name>.azurestaticapps.net` → this is
  `FRONTEND_URL`
- **Manage deployment token** (Overview toolbar) → copy the token → this is
  `AZURE_STATIC_WEB_APPS_API_TOKEN`

## 3. Container App (backend)

Portal → **Container Apps** → **Create** → **Container App**:

**Basics**

- Resource group: `checkmate-rg`, Container app name: `checkmate-api`
- Deployment source: **Container image**
- Region: the same as the resource group
- Container Apps environment: **Create new** → name `checkmate-env`, plan **Consumption**;
  Monitoring: **Azure Log Analytics** (logs are useful when something fails) → Create

**Container**

- Untick **Use quickstart image**
- Image source: **Docker Hub or other registries**
- Image type: **Public** (or **Private** with the token from step 0)
- Registry login server: `ghcr.io`
- Image and tag: `mtu-sdh-agile-avengers/checkmate-backend:latest`
- CPU and Memory: **1 CPU core, 2 Gi memory** (Stockfish is slow on less)
- Environment variables (Source: Manual entry):

| Name | Value |
| --- | --- |
| `API_CHESSCOM_USER_AGENT` | `Checkmate/1.0 (MTU student project; contact: pavloautomation@gmail.com)` |
| `CORS_ORIGINS` | `["https://<random-name>.azurestaticapps.net"]` (the `FRONTEND_URL` from step 2, as a JSON list) |

`RUN_MODE=prod`, `API_CHESSCOM_BASE_URL` and `STOCKFISH_PATH` are already set in the image.
Chess.com answers 403 to requests without contact details in the User-Agent.

**Ingress**

- Ingress: **Enabled**, traffic: **Accepting traffic from anywhere**, type **HTTP**
- Target port: `8000`

Review + create → Create. Then open the app:

- Copy **Application Url** from Overview, e.g. `https://checkmate-api.<id>.northeurope.azurecontainerapps.io`
  → this is `BACKEND_URL` (no `/` at the end)
- Check it: `<BACKEND_URL>/health` shows `{"status":"ok"}`, `<BACKEND_URL>/docs` shows the API
- **Application** → **Scale** (or **Scale and replicas**) → **Edit and deploy** → Scale: min
  replicas `0`, max replicas `2`. With 0 the app sleeps when nobody uses it and costs nothing;
  the first request after a pause takes a few seconds.

## 4. Let GitHub deploy without a password (managed identity)

GitHub signs in to Azure with a short-lived OpenID Connect token; no Azure password is stored.

1. Portal → **Managed Identities** → **Create**: resource group `checkmate-rg`, name
   `checkmate-github` → Create.
2. Open it → **Settings** → **Federated credentials** → **Add Credential**:
   - Federated credential scenario: **GitHub Actions deploying Azure resources**
   - Organization: `mtu-sdh-agile-avengers`, Repository: `checkmate`
   - Entity: **Environment**, Environment: `production`
   - Name: `github-production`
   - The subject identifier becomes `repo:mtu-sdh-agile-avengers/checkmate:environment:production` → **Add**
3. Copy from the identity's **Overview**: **Client ID**, **Subscription ID**, and the
   **Directory (tenant) ID** (also under Microsoft Entra ID → Overview → Tenant ID).
4. Give it the right to update the app: resource group `checkmate-rg` → **Access control (IAM)**
   → **Add** → **Add role assignment** → **Privileged administrator roles** → **Contributor**
   → Next → Assign access to **Managed identity** → **Select members** → `checkmate-github`
   → Review + assign.

## 5. GitHub settings

Repository → **Settings** → **Secrets and variables** → **Actions**.

**Secrets** tab → New repository secret:

| Secret | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | Client ID of `checkmate-github` |
| `AZURE_TENANT_ID` | Directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | deployment token of `checkmate-web` |

**Variables** tab → New repository variable:

| Variable | Value |
| --- | --- |
| `AZURE_RESOURCE_GROUP` | `checkmate-rg` |
| `AZURE_CONTAINER_APP` | `checkmate-api` |
| `BACKEND_URL` | Application Url of `checkmate-api` |
| `FRONTEND_URL` | URL of `checkmate-web` |

The `production` environment appears under **Settings → Environments** after the first deploy;
you can add required reviewers there to approve each production deploy.

## 6. Deploy

**Actions** → **CI/CD** → the latest run on `main` → **Re-run all jobs** (or push to `main`).
The two deploy jobs now run: the backend gets the image of that commit, then the frontend is
built against `BACKEND_URL` and uploaded. Open `FRONTEND_URL`: search `hikaru`, then play a
move on "02 / In-Game Chess".

## Cost (90 EUR credit)

- Static Web Apps **Free**: 0 EUR (100 GB bandwidth per month).
- Container Apps **Consumption**: each subscription gets 180,000 vCPU-seconds and
  360,000 GiB-seconds free per month, which at 1 CPU / 2 Gi is 50 hours of the app being
  awake; with min replicas 0 it sleeps the rest of the time. Beyond that it is billed per second
  from the credit.
- Log Analytics: a few MB of logs a month.
- GitHub Container Registry and GitHub Actions: free for a public repository.

Set a safety net: portal → **Cost Management** → **Budgets** → **Add**: scope the subscription,
10 EUR per month, alert by email at 80%.

## When something fails

| Symptom | Where to look / fix |
| --- | --- |
| Deploy job: `AADSTS70021` / no matching federated identity | The federated credential must say environment `production`, organisation and repository exactly as on GitHub |
| Deploy job: `AuthorizationFailed` | The Contributor role on `checkmate-rg` (step 4.4) |
| Container App does not start, image pull error | The package is private: make it public or add the registry token (step 0) |
| `/health` works but players are not found (403 in the logs) | `API_CHESSCOM_USER_AGENT` must contain a contact email |
| The website shows "Cannot reach the Checkmate server" | `BACKEND_URL` variable, and `CORS_ORIGINS` must contain `FRONTEND_URL` exactly (no `/` at the end) |
| "The computer can't play right now" | Container App → **Monitoring** → **Log stream**; the image has Stockfish at `/usr/games/stockfish` |
