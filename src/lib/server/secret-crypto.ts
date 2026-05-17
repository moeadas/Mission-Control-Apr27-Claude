/**
 * Symmetric envelope encryption for at-rest secrets (Batch F)
 *
 * AES-256-GCM via Node's built-in crypto module — no external dependency.
 * The master key comes from `PROVIDER_SECRETS_MASTER_KEY` (base64-encoded
 * 32 bytes). If the env var is unset, the helpers log a one-time warning
 * and return plaintext — that's the POC / dev-only path. Production must
 * set the master key.
 *
 * Wire format (JSON, stored verbatim in the secrets file):
 *
 *   {
 *     "v": 1,
 *     "alg": "aes-256-gcm",
 *     "iv": "<base64>",      // 12 bytes
 *     "tag": "<base64>",     // 16 bytes (GCM auth tag)
 *     "ciphertext": "<base64>"
 *   }
 *
 * On read, anything missing `ciphertext` is assumed to be a plaintext JSON
 * blob from a pre-encryption deployment — the helpers decode it as-is and
 * the next save will re-encrypt with the master key.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ENV_VAR = 'PROVIDER_SECRETS_MASTER_KEY'
const ALG = 'aes-256-gcm'
const IV_LENGTH = 12
const KEY_LENGTH = 32

let masterKeyWarned = false

function loadMasterKey(): Buffer | null {
  const raw = process.env[ENV_VAR]
  if (!raw) {
    if (!masterKeyWarned) {
      // Print exactly once per process so logs aren't flooded.
      console.warn(`[secret-crypto] ${ENV_VAR} is not set — provider secrets will be stored in plaintext. This is OK for local dev / POC; set the env var before going to production.`)
      masterKeyWarned = true
    }
    return null
  }
  // Allow both base64 and hex inputs (hex is friendlier for terminals).
  let buf: Buffer
  try {
    buf = /^[0-9a-f]+$/i.test(raw) && raw.length === KEY_LENGTH * 2
      ? Buffer.from(raw, 'hex')
      : Buffer.from(raw, 'base64')
  } catch {
    throw new Error(`${ENV_VAR} is not valid base64 or hex`)
  }
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`${ENV_VAR} must decode to ${KEY_LENGTH} bytes (got ${buf.length})`)
  }
  return buf
}

export interface EncryptedEnvelope {
  v: 1
  alg: 'aes-256-gcm'
  iv: string
  tag: string
  ciphertext: string
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (!value || typeof value !== 'object') return false
  const v = value as any
  return v.v === 1 && v.alg === ALG && typeof v.iv === 'string' && typeof v.tag === 'string' && typeof v.ciphertext === 'string'
}

/**
 * Encrypt a UTF-8 string. Returns the envelope as a plain object the caller
 * can JSON.stringify. If no master key is configured, returns null (caller
 * should serialise the plaintext as-is).
 */
export function encryptString(plaintext: string): EncryptedEnvelope | null {
  const key = loadMasterKey()
  if (!key) return null

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALG, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    v: 1,
    alg: ALG,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  }
}

/**
 * Decrypt an envelope back to a UTF-8 string. Throws if the master key is
 * not configured or the envelope is tampered with.
 */
export function decryptString(envelope: EncryptedEnvelope): string {
  const key = loadMasterKey()
  if (!key) throw new Error(`${ENV_VAR} is required to decrypt this envelope`)

  const iv = Buffer.from(envelope.iv, 'base64')
  const tag = Buffer.from(envelope.tag, 'base64')
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64')
  const decipher = createDecipheriv(ALG, key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

/** Convenience helper for the upcoming OAuth-token storage in Batch G. */
export function isCryptoConfigured(): boolean {
  return Boolean(process.env[ENV_VAR])
}
