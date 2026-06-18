# Deploy to VPS (CI/CD)

How a push reaches your server:

```
push to main
  → .github/workflows/docker-publish.yml   builds & pushes 3 images to GHCR
       (ui-generator-backend-api, -backend-worker, -frontend)
  → .github/workflows/deploy.yml           SSHes into the VPS, copies the compose
       file, `docker compose pull` + `up -d`  → app live
```

You can also run **Deploy to VPS** manually from the Actions tab (pick an image tag).

---

## 1. GitHub secrets & variables

Repo → **Settings → Secrets and variables → Actions**.

### Secrets (required)
| Secret | What |
|---|---|
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | SSH user (e.g. `deploy` or `root`) |
| `VPS_SSH_KEY` | **private** SSH key (whole file) whose public key is in the VPS `~/.ssh/authorized_keys` |
| `VPS_PORT` | SSH port — omit if `22` |
| `VPS_DEPLOY_PATH` | dir on the VPS holding the compose + `.env`, e.g. `/opt/ui-generator` |
| `GHCR_USER` | your GitHub username (`RivaelManurung`) — for the VPS to pull private images |
| `GHCR_TOKEN` | a GitHub PAT with **`read:packages`** scope |

> If you make the GHCR packages **public** (package → Settings → Change visibility), the VPS doesn't need to log in and `GHCR_USER`/`GHCR_TOKEN` can be skipped — but the `docker login` step is harmless either way.

### Variables (required for the frontend to reach the API)
| Variable | What |
|---|---|
| `NEXT_PUBLIC_API_URL` | public API base URL **baked into the frontend at build time**, e.g. `https://api.your-domain.com/v1` or `http://VPS_IP:8081/v1` |

After setting it, re-run **Docker Publish (GHCR)** so the frontend image picks it up.

---

## 2. One-time VPS setup

```bash
# Install Docker Engine + compose plugin (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh

# Deploy dir
sudo mkdir -p /opt/ui-generator && sudo chown "$USER" /opt/ui-generator
cd /opt/ui-generator

# Env: copy deploy/.env.prod.example from the repo to `.env` here and fill it in
#   (strong JWT_SECRET + DB password, AI keys, Midtrans keys, CORS origin).
nano .env

# Log in to GHCR (only if packages are private)
echo "<GHCR_TOKEN>" | docker login ghcr.io -u "<github-username>" --password-stdin
```

The compose file itself is copied by the deploy workflow, but for the **first** boot
you can also pull it manually and start once:

```bash
# (the workflow will overwrite docker-compose.prod.yml on every deploy)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The API container runs DB migrations on startup. Postgres + Redis data persist in
named volumes (`postgres_data`, `redis_data`).

---

## 3. Ports & reverse proxy

The compose exposes:
- API → `${API_PORT:-8081}` (container `:8081`)
- Frontend → `${FRONTEND_PORT:-3001}` (container `:3000`)

For real HTTPS + a domain, put a reverse proxy in front (Caddy = automatic TLS):

```caddyfile
# /etc/caddy/Caddyfile  (example)
your-domain.com        { reverse_proxy localhost:3001 }
api.your-domain.com    { reverse_proxy localhost:8081 }
```

Then set `NEXT_PUBLIC_API_URL=https://api.your-domain.com/v1` (variable) and
`CORS_ALLOWED_ORIGINS=https://your-domain.com` (.env), and re-publish + redeploy.

---

## 4. Useful commands (on the VPS)

```bash
cd /opt/ui-generator
docker compose -f docker-compose.prod.yml ps          # status
docker compose -f docker-compose.prod.yml logs -f api # logs
docker compose -f docker-compose.prod.yml restart api # restart one service
docker compose -f docker-compose.prod.yml down        # stop all
```

---

## Files
- `deploy/docker-compose.prod.yml` — full prod stack (GHCR images).
- `deploy/.env.prod.example` — copy to `.env` on the VPS.
- `.github/workflows/docker-publish.yml` — builds & pushes images.
- `.github/workflows/deploy.yml` — SSH pull + restart on the VPS.

> When you're ready, give me the VPS details (host/user, or how you want me to connect)
> and I'll wire the secrets / verify the first deploy.
