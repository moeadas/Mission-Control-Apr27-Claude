/**
 * Provider-secrets encryption tests (Batch K)
 *
 * Verifies the AES-256-GCM envelope wrapper used to encrypt
 * `data/provider-secrets.json` and the per-user OAuth token store.
 */
import { describe, expect, it, beforeAll } from 'vitest'

import {
  decryptString,
  encryptString,
  isCryptoConfigured,
  isEncryptedEnvelope,
} from '@/lib/server/secret-crypto'

// 32-byte test key; base64. The module re-reads process.env on every call so
// setting it once here is enough.
const TEST_KEY_B64 = Buffer.alloc(32, 7).toString('base64')

beforeAll(() => {
  process.env.PROVIDER_SECRETS_MASTER_KEY = TEST_KEY_B64
})

describe('isCryptoConfigured', () => {
  it('returns true when the master key is set', () => {
    expect(isCryptoConfigured()).toBe(true)
  })
})

describe('encryptString / decryptString round-trip', () => {
  it('round-trips a simple value', () => {
    const env = encryptString('sk-test-1234567890')!
    expect(isEncryptedEnvelope(env)).toBe(true)
    expect(decryptString(env)).toBe('sk-test-1234567890')
  })

  it('round-trips JSON', () => {
    const payload = JSON.stringify({ a: 1, b: 'two', nested: { c: [1, 2, 3] } })
    const env = encryptString(payload)!
    expect(decryptString(env)).toBe(payload)
  })

  it('uses a fresh IV each call (envelopes differ for the same plaintext)', () => {
    const a = encryptString('same input')!
    const b = encryptString('same input')!
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    // Both still decrypt correctly.
    expect(decryptString(a)).toBe('same input')
    expect(decryptString(b)).toBe('same input')
  })

  it('throws when the auth tag is tampered with', () => {
    const env = encryptString('top-secret')!
    const tampered = { ...env, tag: Buffer.alloc(16, 0).toString('base64') }
    expect(() => decryptString(tampered)).toThrow()
  })

  it('throws when the ciphertext is tampered with', () => {
    const env = encryptString('top-secret')!
    const tamperedBytes = Buffer.from(env.ciphertext, 'base64')
    tamperedBytes[0] = tamperedBytes[0] ^ 0xff
    const tampered = { ...env, ciphertext: tamperedBytes.toString('base64') }
    expect(() => decryptString(tampered)).toThrow()
  })
})

describe('isEncryptedEnvelope', () => {
  it('recognises a real envelope', () => {
    const env = encryptString('value')!
    expect(isEncryptedEnvelope(env)).toBe(true)
  })

  it('rejects plaintext JSON objects', () => {
    expect(isEncryptedEnvelope({ foo: 'bar' })).toBe(false)
    expect(isEncryptedEnvelope({ ciphertext: 'x' })).toBe(false)        // missing v/alg/iv/tag
    expect(isEncryptedEnvelope({ v: 2, alg: 'aes-256-gcm', iv: 'a', tag: 'b', ciphertext: 'c' })).toBe(false)  // wrong version
    expect(isEncryptedEnvelope(null)).toBe(false)
    expect(isEncryptedEnvelope('plain string')).toBe(false)
  })
})
