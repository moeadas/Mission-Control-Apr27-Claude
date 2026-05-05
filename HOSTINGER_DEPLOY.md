# Hostinger VPS Deployment Guide
## Remove Supabase · Self-host PostgreSQL · Deploy Mission Control

> **Goal:** Everything — app code + database — on a single Hostinger KVM VPS.  
> No Supabase. No external managed DB. Just your VPS.

---

## Overview

| Layer | Before | After |
|---|---|---|
| Database | Supabase-hosted PostgreSQL | Self-hosted PostgreSQL 16 on VPS |
| Auth | Supabase Auth (JWT issued by Supabase) | Custom JWT (`jose` + `bcryptjs`) |
| DB client | `@supabase/supabase-js` query builder | `postgres` (npm: `postgres.js`) |
| Hosting | Vercel / local | Hostinger KVM VPS + PM2 + nginx |
| SSL | Managed by Vercel/Supabase | Let's Encrypt via Certbot |

**Migration effort:** The schema stays identical — only the client library and auth layer change. No data loss path exists if you export Supabase data before cutting over.

---

## Part 1 — Provision the VPS

### 1.1 Buy the right plan
- **Minimum:** KVM 2 (2 vCPU, 8 GB RAM, 100 GB NVMe) — ~$8–12/mo
- **OS:** Ubuntu 22.04 LTS (select at checkout or in the OS reinstall panel)
- Enable "Managed" backups if offered — cheap insurance

### 1.2 First login & hardening

```bash
# From your local machine
ssh root@YOUR_VPS_IP

# Create a non-root deploy user
adduser deploy
usermod -aG sudo deploy

# Copy your SSH key to the deploy user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Disable root SSH login (optional but recommended)
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# Switch to deploy user for everything else
su - deploy
```

### 1.3 Install system packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  git curl unzip build-essential \
  nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib \
  ufw
```

### 1.4 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## Part 2 — Set Up PostgreSQL

### 2.1 Secure the postgres user

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'CHOOSE_A_STRONG_PASSWORD';"
```

### 2.2 Create the app database and user

```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE mission_control;
CREATE USER mc_user WITH ENCRYPTED PASSWORD 'ANOTHER_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE mission_control TO mc_user;
\c mission_control
GRANT ALL ON SCHEMA public TO mc_user;
EOF
```

### 2.3 Create the schema

Connect and run the full DDL:

```bash
sudo -u postgres psql mission_control << 'EOF'

-- ─── Core state blob ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_control_state (
  agency_id   TEXT PRIMARY KEY,
  state       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Auth ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',   -- 'super_admin' | 'member'
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Relational tables (same shape as Supabase) ────────────────────────────
CREATE TABLE IF NOT EXISTS agencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id               TEXT PRIMARY KEY,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  role             TEXT,
  division         TEXT,
  specialty        TEXT,
  unit             TEXT,
  status           TEXT,
  bio              TEXT DEFAULT '',
  methodology      TEXT DEFAULT '',
  system_prompt    TEXT DEFAULT '',
  provider         TEXT,
  model            TEXT,
  temperature      NUMERIC,
  max_tokens       INT,
  color            TEXT,
  accent_color     TEXT,
  avatar           TEXT,
  photo_url        TEXT,
  current_task     TEXT,
  workload         NUMERIC,
  last_active      TEXT,
  tools            JSONB DEFAULT '[]',
  skills           JSONB DEFAULT '[]',
  responsibilities JSONB DEFAULT '[]',
  primary_outputs  JSONB DEFAULT '[]',
  position         JSONB DEFAULT '{}',
  metadata         JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS clients (
  id               TEXT PRIMARY KEY,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  industry         TEXT,
  website          TEXT,
  status           TEXT DEFAULT 'active',
  owner_user_id    UUID REFERENCES users(id),
  brief            JSONB DEFAULT '{}',
  knowledge_summary TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS skills (
  id          TEXT PRIMARY KEY,
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  description TEXT DEFAULT '',
  prompts     JSONB DEFAULT '{}',
  checklist   JSONB DEFAULT '[]',
  examples    JSONB DEFAULT '[]',
  metadata    JSONB DEFAULT '{}',
  source      TEXT DEFAULT 'config'
);

CREATE TABLE IF NOT EXISTS pipelines (
  id                 TEXT PRIMARY KEY,
  agency_id          UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT DEFAULT '',
  version            TEXT DEFAULT '1.0',
  is_default         BOOLEAN DEFAULT false,
  estimated_duration TEXT,
  definition         JSONB DEFAULT '{}',
  source             TEXT DEFAULT 'config'
);

CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT PRIMARY KEY,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id        TEXT REFERENCES clients(id),
  title            TEXT NOT NULL,
  summary          TEXT DEFAULT '',
  deliverable_type TEXT,
  status           TEXT,
  priority         TEXT,
  owner_user_id    UUID REFERENCES users(id),
  assigned_by      TEXT,
  lead_agent_id    TEXT,
  pipeline_id      TEXT,
  progress         NUMERIC DEFAULT 0,
  due_date         TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  execution_plan   JSONB DEFAULT '{}',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS task_assignments (
  id            SERIAL PRIMARY KEY,
  agency_id     UUID NOT NULL,
  task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,
  role          TEXT,
  status        TEXT,
  handoff_notes TEXT
);

CREATE TABLE IF NOT EXISTS outputs (
  id               TEXT PRIMARY KEY,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  task_id          TEXT REFERENCES tasks(id),
  client_id        TEXT REFERENCES clients(id),
  agent_id         TEXT,
  title            TEXT NOT NULL,
  deliverable_type TEXT,
  status           TEXT,
  owner_user_id    UUID REFERENCES users(id),
  format           TEXT,
  content          TEXT,
  rendered_html    TEXT,
  source_prompt    TEXT,
  notes            TEXT,
  storage_path     TEXT,
  public_url       TEXT,
  creative         JSONB DEFAULT '{}',
  exports          JSONB DEFAULT '[]',
  execution_steps  JSONB DEFAULT '[]',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  agency_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id     TEXT,
  task_id       TEXT,
  title         TEXT NOT NULL,
  preview       TEXT,
  agent_id      TEXT,
  owner_user_id UUID REFERENCES users(id),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  agent_id        TEXT,
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_assets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      UUID NOT NULL,
  client_id      TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  asset_type     TEXT,
  storage_bucket TEXT,
  storage_path   TEXT,
  public_url     TEXT,
  extracted_text TEXT,
  summary        TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ
);

-- Grant access to app user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mc_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mc_user;
EOF
```

### 2.4 (Optional) Import existing Supabase data

If you have existing data in Supabase, export it first **before** switching:

```bash
# On your local machine — dump from Supabase
pg_dump "postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --data-only --no-owner --no-acl \
  -t mission_control_state \
  -t agencies -t agents -t clients \
  -t tasks -t task_assignments -t outputs \
  -t conversations -t messages -t knowledge_assets \
  > supabase_export.sql

# Copy to VPS
scp supabase_export.sql deploy@YOUR_VPS_IP:/home/deploy/

# On VPS — import
psql -U mc_user -d mission_control -f /home/deploy/supabase_export.sql
```

> **Auth data:** Supabase passwords are hashed in a Supabase-specific format you can't import.  
> Create a fresh admin user via the seed script in Part 3.

---

## Part 3 — Code Changes

### 3.1 Install new dependencies, remove Supabase

```bash
# In your project root locally
npm install postgres jose bcryptjs
npm install --save-dev @types/bcryptjs
npm uninstall @supabase/supabase-js
```

### 3.2 New file: `src/lib/db/client.ts`

Replaces `src/lib/supabase/server.ts`. Single postgres.js connection pool used everywhere on the server.

```typescript
import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | null = null

export function getDb() {
  if (_sql) return _sql
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL env var is not set')
  }
  _sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  return _sql
}
```

### 3.3 New file: `src/lib/auth/jwt.ts`

Custom JWT — replaces Supabase Auth's token signing.

```typescript
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production-minimum-32-chars'
)
const ALG = 'HS256'
const EXPIRY = '7d'

export async function signToken(payload: { sub: string; email: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<{ sub: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { sub: string; email: string; role: string }
  } catch {
    return null
  }
}
```

### 3.4 New file: `src/lib/auth/server.ts`

Replaces `src/lib/supabase/auth.ts`. Verifies JWTs and resolves the AuthContext.

```typescript
import { getDb } from '@/lib/db/client'
import { verifyToken } from '@/lib/auth/jwt'
import { loadPersistedProviderSettings, mergePersistedProviderSettings } from '@/lib/server/provider-secrets'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import type { ProviderSettings } from '@/lib/types'

export function getSuperAdminEmail() {
  return (process.env.SUPER_ADMIN_EMAIL || 'moeadas@yahoo.com').trim().toLowerCase()
}

export interface AuthContext {
  userId: string
  email: string
  role: 'super_admin' | 'member'
  providerSettings: ProviderSettings
}

export async function resolveAuthContextFromToken(token: string | null | undefined): Promise<AuthContext | null> {
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload?.sub || !payload?.email) return null

  const db = getDb()
  const email = payload.email.toLowerCase()
  const superAdminEmail = getSuperAdminEmail()

  // Upsert profile
  const [profile] = await db`
    INSERT INTO profiles (id, email, role, is_active)
    VALUES (${payload.sub}::uuid, ${email}, ${payload.role}, true)
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          role  = EXCLUDED.role,
          updated_at = now()
    RETURNING role, is_active
  `

  if (!profile?.is_active) return null

  const role = email === superAdminEmail
    ? 'super_admin'
    : (profile.role === 'super_admin' ? 'super_admin' : 'member')

  const persistedProviderSettings = await loadPersistedProviderSettings(payload.sub)

  return {
    userId: payload.sub,
    email,
    role,
    providerSettings: mergePersistedProviderSettings(
      normalizeProviderSettings(undefined),
      persistedProviderSettings
    ),
  }
}

export async function saveUserProviderSettings(userId: string, providerSettings: ProviderSettings) {
  const { savePersistedProviderSettings } = await import('@/lib/server/provider-secrets')
  const normalized = normalizeProviderSettings(providerSettings)
  await savePersistedProviderSettings(userId, normalized)
}
```

### 3.5 New file: `src/lib/auth/browser.ts`

Replaces `src/lib/supabase/browser.ts`. Stores the JWT in `localStorage`.

```typescript
const TOKEN_KEY = 'mc_auth_token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Drop-in replacement for getSupabaseAccessToken()
export async function getSupabaseAccessToken(): Promise<string | null> {
  return getStoredToken()
}
```

### 3.6 Update `src/lib/supabase/relational-sync.ts`

Replace the `getSupabaseServerClient()` call pattern with `getDb()` from postgres.js.  
The function signatures and data shape stay exactly the same — only the query syntax changes.

The core pattern to replace throughout the file:

```typescript
// BEFORE (Supabase)
const supabase = getSupabaseServerClient()
if (!supabase) return
const { data, error } = await supabase.from('agents').upsert(rows, { onConflict: 'id' })
if (error) throw error

// AFTER (postgres.js)
const db = getDb()
if (rows.length === 0) return
await db`
  INSERT INTO agents ${db(rows)}
  ON CONFLICT (id) DO UPDATE SET ${db(rows[0], Object.keys(rows[0]))}
`
```

> **Tip:** For this file specifically, the quickest migration path is to write a generic upsert helper and use it everywhere. See the complete rewritten file in the Appendix below.

### 3.7 Update `src/lib/supabase/app-state.ts`

Replace the Supabase client with raw SQL. The logic (load/save/patch/delta) stays identical.

```typescript
// BEFORE
import { getSupabaseServerClient } from '@/lib/supabase/server'
const supabase = getSupabaseServerClient()
const { data, error } = await supabase
  .from('mission_control_state')
  .select('agency_id, state, updated_at')
  .eq('agency_id', agencyId)
  .maybeSingle()

// AFTER
import { getDb } from '@/lib/db/client'
const db = getDb()
const [data] = await db`
  SELECT agency_id, state, updated_at
  FROM mission_control_state
  WHERE agency_id = ${agencyId}
  LIMIT 1
`
```

For the upsert in `saveSharedAppState`:

```typescript
// AFTER
const [saved] = await db`
  INSERT INTO mission_control_state (agency_id, state, updated_at)
  VALUES (${agencyId}, ${db.json(state)}, now())
  ON CONFLICT (agency_id) DO UPDATE
    SET state = EXCLUDED.state, updated_at = now()
  RETURNING agency_id, state, updated_at
`
return saved
```

### 3.8 Update login route: `src/app/api/auth/session/route.ts`

Replace Supabase session check with a JWT verify + DB lookup.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { signToken, verifyToken } from '@/lib/auth/jwt'
import bcrypt from 'bcryptjs'

// GET /api/auth/session — verify existing token
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ user: null }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ user: null }, { status: 401 })

  return NextResponse.json({ user: { id: payload.sub, email: payload.email, role: payload.role } })
}

// POST /api/auth/session — login with email + password
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = getDb()
  const [user] = await db`
    SELECT id, email, role, password_hash, is_active
    FROM users WHERE email = ${email.toLowerCase()}
  `

  if (!user || !user.is_active) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const token = await signToken({ sub: user.id, email: user.email, role: user.role })
  return NextResponse.json({ token, user: { id: user.id, email: user.email, role: user.role } })
}
```

### 3.9 Add a seed script to create the first admin user

Create `scripts/seed-admin.ts`:

```typescript
import postgres from 'postgres'
import bcrypt from 'bcryptjs'

const db = postgres(process.env.DATABASE_URL!, { max: 1 })

const email = process.env.ADMIN_EMAIL || 'moeadas@yahoo.com'
const password = process.env.ADMIN_PASSWORD || 'changeme123!'

const hash = await bcrypt.hash(password, 12)

await db`
  INSERT INTO users (email, password_hash, role, is_active)
  VALUES (${email}, ${hash}, 'super_admin', true)
  ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
`

console.log(`✅ Admin user created: ${email}`)
await db.end()
```

Add to `package.json`:
```json
"scripts": {
  "seed:admin": "tsx scripts/seed-admin.ts"
}
```

Run on the VPS after deployment:
```bash
ADMIN_EMAIL=moeabuadas@googlemail.com ADMIN_PASSWORD=YourNewPassword123 npm run seed:admin
```

### 3.10 Update `src/components/auth/SessionGate.tsx`

Replace `getSupabaseBrowserClient().auth.getSession()` with a call to `GET /api/auth/session` using the stored token:

```typescript
// Replace the Supabase session check with:
import { getStoredToken } from '@/lib/auth/browser'

const token = getStoredToken()
if (!token) {
  setIsAuthed(false)
  return
}

const res = await fetch('/api/auth/session', {
  headers: { Authorization: `Bearer ${token}` },
})
if (!res.ok) {
  setIsAuthed(false)
  return
}
const { user } = await res.json()
setIsAuthed(!!user)
```

### 3.11 Update `src/app/login/page.tsx`

Replace Supabase `signInWithPassword` with a POST to `/api/auth/session`:

```typescript
import { setStoredToken } from '@/lib/auth/browser'

const res = await fetch('/api/auth/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})

if (!res.ok) {
  setError('Invalid email or password')
  return
}

const { token } = await res.json()
setStoredToken(token)
router.push('/')
```

### 3.12 Update all API routes that read the auth token

Any route that calls `resolveAuthContextFromToken(token)` just needs its import updated:

```typescript
// BEFORE
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'

// AFTER
import { resolveAuthContextFromToken } from '@/lib/auth/server'
```

Run this across the project:
```bash
grep -rl "from '@/lib/supabase/auth'" src/ | xargs sed -i "s|from '@/lib/supabase/auth'|from '@/lib/auth/server'|g"
grep -rl "from '@/lib/supabase/browser'" src/ | xargs sed -i "s|from '@/lib/supabase/browser'|from '@/lib/auth/browser'|g"
grep -rl "getSupabaseAccessToken" src/ | grep -v "auth/browser" | xargs sed -i "s|getSupabaseAccessToken|getSupabaseAccessToken|g"
```

### 3.13 Update `.env.local.example` → `.env.production`

```bash
# Database
DATABASE_URL=postgresql://mc_user:YOUR_DB_PASSWORD@localhost:5432/mission_control

# Auth
JWT_SECRET=generate-with-openssl-rand-base64-48

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
SUPER_ADMIN_EMAIL=moeabuadas@googlemail.com

# AI providers (same as before)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
# ... etc
```

Generate a JWT secret:
```bash
openssl rand -base64 48
```

---

## Part 4 — Set Up Node.js and the App

### 4.1 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should print v20.x.x
```

### 4.2 Install PM2 globally

```bash
sudo npm install -g pm2
```

### 4.3 Clone the repo on the VPS

```bash
cd /home/deploy
git clone https://github.com/YOUR_USERNAME/mission-control-remake.git app
cd app
```

> Or use `git pull` if already cloned. If you don't use GitHub, use `rsync` or `scp` to copy the project.

### 4.4 Create `.env.production` on the VPS

```bash
nano /home/deploy/app/.env.production
# Paste the env vars from 3.13 above
# Save with Ctrl+O, exit with Ctrl+X
```

### 4.5 Build the app

```bash
cd /home/deploy/app
npm ci --omit=dev
npm run build
```

Build time is typically 1–3 minutes. Fix any TypeScript errors before this step.

### 4.6 Seed the admin user

```bash
cd /home/deploy/app
npm install tsx --save-dev   # if not already in devDeps
ADMIN_EMAIL=moeabuadas@googlemail.com ADMIN_PASSWORD="YourSecurePassword" npm run seed:admin
```

### 4.7 Start with PM2

```bash
cd /home/deploy/app
pm2 start npm --name "mission-control" -- start -- -p 3000
pm2 save
pm2 startup   # follow the printed instruction to enable auto-start on reboot
```

Check it's running:
```bash
pm2 status
pm2 logs mission-control --lines 50
```

---

## Part 5 — nginx Reverse Proxy + SSL

### 5.1 Point your domain to the VPS

In your domain registrar's DNS panel:
- Add an **A record**: `yourdomain.com` → `YOUR_VPS_IP`
- Add an **A record**: `www.yourdomain.com` → `YOUR_VPS_IP`

Allow ~5 minutes for propagation.

### 5.2 nginx config

```bash
sudo nano /etc/nginx/sites-available/mission-control
```

Paste:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Large body for file uploads (agent photos, client assets)
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

        # Needed for NDJSON streaming (chat pipeline progress)
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/mission-control /etc/nginx/sites-enabled/
sudo nginx -t           # test config — should say "ok"
sudo systemctl reload nginx
```

### 5.3 SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts — choose option 2 (redirect HTTP to HTTPS)
```

Certbot auto-modifies the nginx config and sets up a cron for renewal.

Verify auto-renewal:
```bash
sudo certbot renew --dry-run
```

---

## Part 6 — Deployment Workflow (ongoing updates)

Every time you push code changes, run on the VPS:

```bash
cd /home/deploy/app
git pull origin main
npm ci --omit=dev
npm run build
pm2 restart mission-control
pm2 logs mission-control --lines 20
```

Or create a one-liner deploy script `/home/deploy/deploy.sh`:

```bash
#!/bin/bash
set -e
cd /home/deploy/app
echo "🔄 Pulling latest..."
git pull origin main
echo "📦 Installing deps..."
npm ci --omit=dev
echo "🔨 Building..."
npm run build
echo "♻️  Restarting PM2..."
pm2 restart mission-control
echo "✅ Deploy complete"
pm2 logs mission-control --lines 10
```

```bash
chmod +x /home/deploy/deploy.sh
# Usage:
./deploy.sh
```

---

## Part 7 — Verify Everything Works

```bash
# 1. PostgreSQL is running
sudo systemctl status postgresql

# 2. App process is running
pm2 status

# 3. nginx is serving
curl -I https://yourdomain.com

# 4. App health check
curl https://yourdomain.com/api/auth/session
# Expected: {"user":null} with 401 (not a 500)

# 5. Login works — should return a JWT
curl -X POST https://yourdomain.com/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"email":"moeabuadas@googlemail.com","password":"YourSecurePassword"}'
# Expected: {"token":"eyJ...","user":{...}}
```

---

## Part 8 — File Upload Storage (replacing Supabase Storage)

Supabase Storage is used for agent photos and client assets. After migration, files go to the **local filesystem** on the VPS.

### 8.1 Create the uploads directory

```bash
mkdir -p /home/deploy/app/public/uploads/agent-photos
mkdir -p /home/deploy/app/public/uploads/client-assets
chmod -R 755 /home/deploy/app/public/uploads
```

### 8.2 Update upload routes

In `src/app/api/agent-photos/upload/route.ts` and `src/app/api/client-assets/upload/route.ts`:

```typescript
// Replace Supabase storage upload with local fs write
import { writeFile } from 'fs/promises'
import path from 'path'

const uploadDir = path.join(process.cwd(), 'public/uploads/agent-photos')
const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}`
const filepath = path.join(uploadDir, filename)

await writeFile(filepath, Buffer.from(await file.arrayBuffer()))
const publicUrl = `/uploads/agent-photos/${filename}`
```

Files in `/public` are served statically by Next.js, so `/uploads/agent-photos/xxx.jpg` just works.

---

## Summary Checklist

```
VPS
 [ ] KVM VPS provisioned (Ubuntu 22.04)
 [ ] Non-root deploy user created
 [ ] UFW firewall configured (22, 80, 443)
 [ ] System packages installed (nginx, postgresql, certbot, nodejs)

Database
 [ ] PostgreSQL running
 [ ] mission_control database + mc_user created
 [ ] Schema DDL executed
 [ ] Supabase data exported and imported (if applicable)

Code changes
 [ ] postgres.js + jose + bcryptjs installed
 [ ] @supabase/supabase-js removed from package.json
 [ ] src/lib/db/client.ts created
 [ ] src/lib/auth/jwt.ts created
 [ ] src/lib/auth/server.ts created (replaces supabase/auth.ts)
 [ ] src/lib/auth/browser.ts created (replaces supabase/browser.ts)
 [ ] src/lib/supabase/relational-sync.ts updated (postgres.js queries)
 [ ] src/lib/supabase/app-state.ts updated (postgres.js queries)
 [ ] src/app/api/auth/session/route.ts updated (custom JWT)
 [ ] src/app/login/page.tsx updated
 [ ] src/components/auth/SessionGate.tsx updated
 [ ] All import paths updated (supabase/auth → auth/server, etc.)
 [ ] .env.production created on VPS with DATABASE_URL + JWT_SECRET

App
 [ ] Node.js 20 installed
 [ ] PM2 installed globally
 [ ] Repo cloned to /home/deploy/app
 [ ] npm ci + npm run build succeeds
 [ ] Admin user seeded (npm run seed:admin)
 [ ] PM2 process started + saved

nginx + SSL
 [ ] Domain A record pointing to VPS IP
 [ ] nginx config created and tested
 [ ] Certbot SSL cert issued
 [ ] HTTPS working

Final checks
 [ ] GET /api/auth/session → 401 (not 500)
 [ ] POST /api/auth/session → returns JWT
 [ ] Can log in via the browser
 [ ] Can load dashboard data
 [ ] Pipeline/Iris chat works
```

---

## Appendix — Quick Reference

### Useful PM2 commands
```bash
pm2 status                      # process list
pm2 logs mission-control        # tail logs
pm2 restart mission-control     # zero-downtime restart
pm2 stop mission-control        # stop
pm2 delete mission-control      # remove from PM2
```

### Useful PostgreSQL commands
```bash
sudo -u postgres psql mission_control   # psql shell
\dt                                     # list tables
\d agents                               # describe table
SELECT count(*) FROM agents;            # quick row check
```

### Database backups (add to cron)
```bash
# /home/deploy/backup.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U mc_user mission_control | gzip > /home/deploy/backups/mc_${TIMESTAMP}.sql.gz
find /home/deploy/backups -mtime +7 -delete   # keep 7 days

# Add to crontab: 0 3 * * * /home/deploy/backup.sh
```
