#!/usr/bin/env node
/**
 * One-shot migration: re-write data/provider-secrets.json under the AES-256-GCM
 * envelope expected by src/lib/server/secret-crypto.ts.
 *
 * Run inside the live container with PROVIDER_SECRETS_MASTER_KEY in env:
 *   docker exec -e PROVIDER_SECRETS_MASTER_KEY=<key> mc_app node \
 *     /app/.next/standalone/scripts/encrypt-provider-secrets.js
 *
 * Idempotent: detects an already-encrypted envelope and exits without writing.
 */
const fs = require('node:fs')
const crypto = require('node:crypto')
const path = require('node:path')

const SECRETS_PATH = process.env.SECRETS_FILE || path.join('/app', 'data', 'provider-secrets.json')
const KEY_ENV = 'PROVIDER_SECRETS_MASTER_KEY'
const ALG = 'aes-256-gcm'
const IV_LENGTH = 12
const KEY_LENGTH = 32

function loadMasterKey() {
  const raw = process.env[KEY_ENV]
  if (!raw) {
    console.error(`Missing ${KEY_ENV} in environment. Aborting — refusing to migrate without a key.`)
    process.exit(2)
  }
  const buf = /^[0-9a-f]+$/i.test(raw) && raw.length === KEY_LENGTH * 2
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64')
  if (buf.length !== KEY_LENGTH) {
    console.error(`${KEY_ENV} must decode to ${KEY_LENGTH} bytes; got ${buf.length}.`)
    process.exit(2)
  }
  return buf
}

function isEnvelope(value) {
  return value && typeof value === 'object'
    && value.v === 1 && value.alg === ALG
    && typeof value.iv === 'string' && typeof value.tag === 'string'
    && typeof value.ciphertext === 'string'
}

function encryptString(plaintext, key) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALG, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    v: 1,
    alg: ALG,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

function main() {
  if (!fs.existsSync(SECRETS_PATH)) {
    console.log(`No secrets file at ${SECRETS_PATH} — nothing to migrate.`)
    return
  }
  const raw = fs.readFileSync(SECRETS_PATH, 'utf8')
  if (!raw.trim()) {
    console.log('Secrets file is empty — nothing to migrate.')
    return
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    console.error(`Secrets file is not valid JSON: ${err.message}`)
    process.exit(3)
  }
  if (isEnvelope(parsed)) {
    console.log('Secrets file is already encrypted. Nothing to do.')
    return
  }

  const key = loadMasterKey()
  // Backup before overwriting.
  const backup = `${SECRETS_PATH}.plaintext-backup-${Date.now()}.json`
  fs.writeFileSync(backup, raw, 'utf8')
  console.log(`Backed up plaintext to ${backup}`)

  const envelope = encryptString(JSON.stringify(parsed), key)
  fs.writeFileSync(SECRETS_PATH, JSON.stringify(envelope, null, 2), 'utf8')
  console.log(`Encrypted ${Object.keys(parsed).length} user record(s) — wrote envelope to ${SECRETS_PATH}.`)
}

main()
