# Deployment on Azure

The pipeline (`.github/workflows/ci-cd.yml`) tests every push. After a push to `main` it builds
one Docker image (`Dockerfile` in the repository root), publishes it to GitHub Container
Registry and deploys it to **Azure Container Apps**:

| In the image | Served at |
| --- | --- |
| the React build (`frontend/dist`) | `/` and every page of the app (`/players/hikaru`, `/play`, …) |
| the FastAPI backend | `/api/v1/...`, `/health`, API docs at `/docs` |
| Stockfish 17 (Debian package) | used by the backend, never committed to git |

The site and the API share one origin, so the browser needs no CORS settings and there is only
one Azure service to pay for. (Azure Static Web Apps was the first plan, but our Azure for
Students subscription allows none of its regions.)

The deploy job is **skipped** until the Azure resources and the GitHub settings below exist.

## 1. Create the Azure resources (Cloud Shell)

`infra/azure-setup.sh` creates everything with the Azure CLI and picks a region your
subscription allows. In the Azure portal open **Cloud Shell** (the `>_` icon at the top) →
**Bash** → **No storage account required** → your subscription → **Apply**, then:

```bash
curl -fsSLO https://raw.githubusercontent.com/mtu-sdh-agile-avengers/checkmate/refs/heads/main/infra/azure-setup.sh
bash azure-setup.sh regions   # shows the allowed regions and the one it will use; creates nothing
bash azure-setup.sh setup     # 5-10 minutes
```

`setup` creates, in resource group `checkmate-rg`:

- **Container Apps environment** `checkmate-env` (with a Log Analytics workspace for the logs);
- **managed identity** `checkmate-github` with federated credentials that trust only the
  `production` environment of `mtu-sdh-agile-avengers/checkmate` (by name, and by the IDs our
  organisation puts in GitHub's token), and the **Contributor** role on `checkmate-rg`, so
  GitHub deploys without a stored password.

It prints three values. Add them in GitHub → repository **Settings** → **Secrets and
variables** → **Actions** → **Secrets** → **New repository secret**:

| Secret | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | client ID of `checkmate-github` |
| `AZURE_TENANT_ID` | tenant (directory) ID |
| `AZURE_SUBSCRIPTION_ID` | subscription ID |

Do not add the variables yet: the deploy job starts as soon as `AZURE_CONTAINER_APP` exists.

## 2. Publish the first image

1. Merge the pull request into `main`. The `App image` job pushes
   `ghcr.io/mtu-sdh-agile-avengers/checkmate:latest` (the deploy job is still skipped).
2. Make the image public so Azure can download it: GitHub → organisation
   **mtu-sdh-agile-avengers** → **Packages** → `checkmate` → **Package settings** →
   **Danger Zone** → **Change visibility** → **Public**.
   - If the organisation does not allow public packages: create a classic token with only
     `read:packages` (GitHub → Settings → Developer settings → Personal access tokens) and run
     step 3 as `GHCR_USER=<your GitHub name> GHCR_TOKEN=<token> bash azure-setup.sh app`.

## 3. Create the Container App

In Cloud Shell (download the script again if the session was closed):

```bash
bash azure-setup.sh app
```

It creates `checkmate-api`: the image above, 1 CPU / 2 GiB (Stockfish is slow on less),
0–2 replicas, public HTTPS ingress to port 8000 and the variable `API_CHESSCOM_USER_AGENT` with
a contact email (Chess.com answers 403 without one). Then it checks `/health` and whether
Chess.com answers from Azure, and prints the site's address.

With 0 replicas the app sleeps when nobody uses it and costs nothing; the first request after
a pause takes a few seconds.

## 4. Turn on the deploy job

GitHub → **Settings** → **Secrets and variables** → **Actions** → **Variables** → **New
repository variable**:

| Variable | Value |
| --- | --- |
| `AZURE_RESOURCE_GROUP` | `checkmate-rg` |
| `AZURE_CONTAINER_APP` | `checkmate-api` |
| `APP_URL` | the address printed by step 3, e.g. `https://checkmate-api.<id>.francecentral.azurecontainerapps.io` (no `/` at the end) |

Then **Actions** → **CI/CD** → the latest run on `main` → **Re-run all jobs**. From now on every
push to `main` that passes CI deploys its own image (tagged with the commit SHA) and checks the
site and `/health`. The `production` environment shows the deploys and the site's address.

## Cost (90 EUR credit)

- Container Apps **Consumption**: each subscription gets 180,000 vCPU-seconds and
  360,000 GiB-seconds free per month, which at 1 CPU / 2 GiB is 50 hours of the app being
  awake; asleep it costs nothing. Beyond that it is billed per second from the credit.
- Log Analytics: a few MB of logs a month.
- GitHub Container Registry and GitHub Actions: free for a public repository.

Safety net: portal → **Cost Management** → **Budgets** → **Add**: the subscription, 10 EUR a
month, email alert at 80%.

## Doing it in the portal instead

The same resources by hand: **Managed Identities** → Create `checkmate-github` → **Federated
credentials** → Add → scenario *GitHub Actions deploying Azure resources*, organisation
`mtu-sdh-agile-avengers`, repository `checkmate`, entity *Environment* `production`;
`checkmate-rg` → **Access control (IAM)** → Add role assignment → **Contributor** → the
identity. **Container Apps** → Create `checkmate-api` (new environment `checkmate-env`), image
source *Docker Hub or other registries*, `ghcr.io` / `mtu-sdh-agile-avengers/checkmate:latest`,
1 CPU / 2 Gi, ingress from anywhere to port `8000`, variable `API_CHESSCOM_USER_AGENT`.
Use a region your subscription allows (Azure Policy → Assignments → *Allowed resource
deployment regions*); `bash azure-setup.sh regions` lists them.

## When something fails

| Symptom | Where to look / fix |
| --- | --- |
| `RequestDisallowedByAzure` | the region is not allowed for the subscription: `bash azure-setup.sh regions` |
| Deploy job: `AADSTS700213` / no matching federated identity record | the subject in the error must match a federated credential exactly. Our organisation puts IDs in it (`repo:mtu-sdh-agile-avengers@329470617/checkmate@1391446843:environment:production`); `setup` adds that form too, or add it in the portal with *Other issuer* |
| Deploy job: `AuthorizationFailed` | the Contributor role on `checkmate-rg` |
| Container App does not start, image pull error | the package is private: make it public or use the token (step 2) |
| `/health` works but players are not found (403 in the logs) | `API_CHESSCOM_USER_AGENT` must contain a contact email |
| "The computer can't play right now" | Container App → **Monitoring** → **Log stream**; the image has Stockfish at `/usr/games/stockfish` |
