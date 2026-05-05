#!/usr/bin/env node
/**
 * Seed the first super_admin user + default agency.
 *
 * Usage (on VPS after docker compose up):
 *   docker compose exec app node scripts/seed-admin.mjs
 *
 * Or locally with DATABASE_URL set:
 *   DATABASE_URL=postgres://... node scripts/seed-admin.mjs
 */

import postgres from 'postgres'
import { createHash, randomBytes } from 'crypto'

// Simple bcrypt-compatible hash via node built-ins isn't available,
// so we bundle a minimal pbkdf2-based fallback — OR install bcryptjs.
// If bcryptjs is available (it is in the app), use it.
let hash
try {
  const { hashSync } = await import('bcryptjs')
  hash = (pw) => hashSync(pw, 12)
} catch {
  // Fallback: pbkdf2 (not bcrypt, but works for dev seeding)
  hash = (pw) => {
    const salt = randomBytes(16).toString('hex')
    const h = createHash('sha256').update(salt + pw).digest('hex')
    return `sha256:${salt}:${h}`
  }
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.')
  process.exit(1)
}

const email = process.env.ADMIN_EMAIL || 'admin@example.com'
const password = process.env.ADMIN_PASSWORD || 'changeme123'

const db = postgres(DATABASE_URL, { max: 1 })

try {
  // 1. Ensure default agency exists
  await db`
    INSERT INTO agencies (id, name, slug, settings)
    VALUES (gen_random_uuid(), 'Default Agency', 'default-agency', '{}')
    ON CONFLICT (slug) DO NOTHING
  `
  const agencyRows = await db`SELECT id FROM agencies WHERE slug = 'default-agency' LIMIT 1`
  const agencyId = agencyRows[0]?.id
  if (!agencyId) throw new Error('Agency not found after insert')
  console.log('✓ Agency:', agencyId)

  // 2. Hash password
  const passwordHash = hash(password)

  // 3. Insert user
  const userRows = await db`
    INSERT INTO users (id, email, password_hash, role, is_active, created_at)
    VALUES (gen_random_uuid(), ${email}, ${passwordHash}, 'super_admin', true, NOW())
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role = 'super_admin',
      is_active = true
    RETURNING id
  `
  const userId = userRows[0]?.id
  console.log('✓ User:', userId, email)

  // 4. Ensure profile row
  await db`
    INSERT INTO profiles (id, email, role, is_active)
    VALUES (${userId}, ${email}, 'super_admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true
  `
  console.log('✓ Profile created')
  console.log('')
  console.log('Done! Log in with:')
  console.log('  Email:   ', email)
  console.log('  Password:', password)
} catch (err) {
  console.error('Seed failed:', err)
  process.exit(1)
} finally {
  await db.end()
}
