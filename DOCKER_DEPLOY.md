# Docker Deployment Guide
## Mission Control → Hostinger KVM VPS (existing Docker setup)

> **Your VPS:** KVM 1 · Ubuntu 24.04 · 1 CPU · 4 GB RAM · 50 GB disk · IP 72.62.33.12  
> **Your setup:** Docker already running, n8n + other containers active  
> **Goal:** Add Mission Control (app + PostgreSQL) as two new Docker containers

---

## Before You Start

### Memory reality check

| What's running | RAM |
|---|---|
| Current containers (n8n etc.) | ~1.6 GB (41% of 4 GB) |
| PostgreSQL (mission_control) | ~150 MB at runtime |
| Next.js app (runtime) | ~400 MB at runtime |
| **Total at runtime** | ~2.2 GB ✅ fits |
| `next build` during image build | spikes to ~1.5 GB extra |
| **Total during build** | ~3.1 GB ⚠️ tight |

**Solution:** Add a 2 GB swap file before building. Do this once — it stays permanently.

```bash
# SSH into your VPS
ssh root@72.62.33.12

# Add 2 GB swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make it permanent across reboots
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verify
free -h
# Should now show ~2 GB swap
```

---

## Part 1 — Prepare the Code Changes

Complete all code changes from `HOSTINGER_DEPLOY.md` Part 3 **before** building the Docker image. The key changes are:

1. Install `postgres`, `jose`, `bcryptjs` — remove `@supabase/supabase-js`
2. Create `src/lib/db/client.ts`
3. Create `src/lib/auth/jwt.ts`, `src/lib/auth/server.ts`, `src/lib/auth/browser.ts`
4. Update `relational-sync.ts`, `app-state.ts`, auth routes, login page, SessionGate
5. Update all import paths

Once those changes are done, commit everything to your repo.

---

## Part 2 — Set Up on the VPS

### 2.1 SSH in

```bash
ssh root@72.62.33.12
```

### 2.2 Clone your repo

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/mission-control-remake.git mission-control
cd mission-control
```

> If you don't use GitHub, copy the project with `rsync`:
> ```bash
> # Run from your LOCAL machine
> rsync -avz --exclude node_modules --exclude .next \
>   /Users/moe/Desktop/Mission\ Control\ Remake/ \
>   root@72.62.33.12:/opt/mission-control/
> ```

### 2.3 Create your `.env` file

```bash
cd /opt/mission-control
cp .env.docker.example .env
nano .env
```

Fill in:

```env
DB_PASSWORD=PickAVeryStrongPassword123!
JWT_SECRET=<paste output of: openssl rand -base64 48>
SUPER_ADMIN_EMAIL=moeabuadas@googlemail.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ANTHROPIC_API_KEY=sk-ant-...
```

Generate the JWT secret on the VPS:
```bash
openssl rand -base64 48
```

Save and close (`Ctrl+O`, `Ctrl+X`).

---

## Part 3 — Build and Start

```bash
cd /opt/mission-control

# Build the Docker image (takes 3–5 minutes, uses swap during build)
docker compose build

# Start both containers (db first, app waits for db health check)
docker compose up -d

# Watch logs — app should say "Ready on http://0.0.0.0:3000"
docker compose logs -f app
```

You should see:
```
mc_db   | database system is ready to accept connections
mc_app  | ▲ Next.js 16.x.x
mc_app  | - Local: http://localhost:3000
mc_app  | ✓ Ready in 2.1s
```

### 3.1 Seed the admin user

```bash
docker compose exec app node -e "
const postgres = require('postgres');
const bcrypt = require('bcryptjs');
(async () => {
  const db = postgres(process.env.DATABASE_URL, { max: 1 });
  const hash = await bcrypt.hash('YOUR_ADMIN_PASSWORD', 12);
  await db\`
    INSERT INTO users (email, password_hash, role, is_active)
    VALUES (\${process.env.SUPER_ADMIN_EMAIL}, \${hash}, 'super_admin', true)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  \`;
  console.log('✅ Admin user created');
  await db.end();
})();
"
```

Or, if you added the `seed:admin` script from the main guide:
```bash
docker compose exec app npm run seed:admin
```

---

## Part 4 — nginx Reverse Proxy

Your VPS already has other containers running. The app listens on port **3000** inside Docker (mapped to host port 3000). You need nginx to route your domain to it.

### 4.1 Check if nginx is installed on the host

```bash
nginx -v   # if not found:
apt install -y nginx
```

> If your existing containers already use a reverse proxy (e.g., Traefik, or an nginx container), skip to **Option B** below.

### Option A — nginx on the host (most common)

```bash
nano /etc/nginx/sites-available/mission-control
```

Paste:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        # Required for NDJSON streaming (pipeline progress in Iris chat)
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

Enable and reload:
```bash
ln -s /etc/nginx/sites-available/mission-control /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Get SSL:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Option B — Add to docker-compose.yml as a container

If you prefer everything in Docker, add this service to `docker-compose.yml`:

```yaml
  nginx:
    image: nginx:alpine
    container_name: mc_nginx
    restart: unless-stopped
    depends_on:
      - app
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - mc_certs:/etc/letsencrypt
      - mc_certbot_www:/var/www/certbot
    networks:
      - mc_external

volumes:
  mc_certs:
  mc_certbot_www:
```

And create `docker/nginx.conf`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    client_max_body_size 50M;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

---

## Part 5 — DNS

Point your domain to `72.62.33.12` in your domain registrar:

| Type | Name | Value |
|---|---|---|
| A | `@` (or `yourdomain.com`) | `72.62.33.12` |
| A | `www` | `72.62.33.12` |

Wait ~5 minutes, then test:
```bash
curl -I http://yourdomain.com
# Should return nginx 200 or 301 redirect
```

---

## Part 6 — Verify

```bash
# Both containers healthy?
docker compose ps
# Expected: mc_db (healthy), mc_app (running)

# App responding?
curl http://localhost:3000/api/auth/session
# Expected: HTTP 401, body {"user":null}

# Login works?
curl -X POST http://localhost:3000/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"email":"moeabuadas@googlemail.com","password":"YOUR_ADMIN_PASSWORD"}'
# Expected: {"token":"eyJ...","user":{...}}

# Database has tables?
docker compose exec db psql -U mc_user -d mission_control -c "\dt"
```

---

## Part 7 — Deploying Updates

Every time you push code changes:

```bash
# On the VPS
cd /opt/mission-control
git pull origin main

# Rebuild and restart (zero-downtime: db stays up, only app restarts)
docker compose build app
docker compose up -d app

# Check logs
docker compose logs -f app --tail 20
```

Or create `/opt/deploy-mc.sh`:

```bash
#!/bin/bash
set -e
cd /opt/mission-control
echo "🔄 Pulling..."
git pull origin main
echo "🔨 Building app..."
docker compose build app
echo "♻️  Restarting app..."
docker compose up -d app
echo "✅ Done"
docker compose ps
```

```bash
chmod +x /opt/deploy-mc.sh
./deploy-mc.sh
```

---

## Useful Commands

```bash
# Container status
docker compose ps

# Live logs
docker compose logs -f app
docker compose logs -f db

# Restart just the app (no rebuild)
docker compose restart app

# Shell into the app container
docker compose exec app sh

# Shell into the database
docker compose exec db psql -U mc_user -d mission_control

# Stop everything
docker compose down

# Stop and wipe database (DESTRUCTIVE)
docker compose down -v
```

## Database Backups

```bash
# Manual backup
docker compose exec db pg_dump -U mc_user mission_control | gzip \
  > /opt/backups/mc_$(date +%Y%m%d_%H%M%S).sql.gz

# Add to crontab (daily at 3am, keep 7 days)
mkdir -p /opt/backups
crontab -e
# Add: 0 3 * * * docker compose -f /opt/mission-control/docker-compose.yml exec -T db pg_dump -U mc_user mission_control | gzip > /opt/backups/mc_$(date +\%Y\%m\%d).sql.gz && find /opt/backups -mtime +7 -delete
```

---

## Checklist

```
Prep
 [ ] Swap file created (2 GB)
 [ ] Code changes complete (postgres.js + custom auth)
 [ ] next.config.mjs has output: 'standalone' when DOCKER_BUILD=1

VPS
 [ ] Repo cloned to /opt/mission-control
 [ ] .env file created with real values
 [ ] docker compose build — success
 [ ] docker compose up -d — mc_db healthy, mc_app running
 [ ] Admin user seeded

Network
 [ ] Domain A record → 72.62.33.12
 [ ] nginx config created and reloaded
 [ ] SSL cert issued (certbot)
 [ ] https://yourdomain.com loads the app
 [ ] Login works
```
