/**
 * Text-utility tests (Batch K)
 */
import { describe, expect, it } from 'vitest'

import {
  escapeHtml,
  looksLikeBoilerplateResponse,
  truncate,
} from '@/lib/server/text-utils'

describe('escapeHtml', () => {
  it('escapes the five core characters', () => {
    expect(escapeHtml('<script>alert("x") & \'y\'</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;) &amp; &#039;y&#039;&lt;/script&gt;'
    )
  })

  it('handles empty input', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('truncate', () => {
  it('returns the input untouched when within max', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('appends ellipsis when truncating', () => {
    expect(truncate('abcdefghij', 5)).toBe('ab...')
    expect(truncate('abcdefghij', 5).length).toBe(5)
  })

  it('trims whitespace before measuring length', () => {
    expect(truncate('   hello   ', 20)).toBe('hello')
  })
})

describe('looksLikeBoilerplateResponse', () => {
  it('flags coordination-language phrases', () => {
    expect(looksLikeBoilerplateResponse('Task routed to Echo.')).toBe(true)
    expect(looksLikeBoilerplateResponse('Status: in progress, next steps: ...')).toBe(true)
    expect(looksLikeBoilerplateResponse('Delivery: by EOD.')).toBe(true)
  })

  it('returns false for real deliverable content', () => {
    expect(
      looksLikeBoilerplateResponse('# Q4 Strategy Brief\n\n## Objective\nGrow market share to 30%.')
    ).toBe(false)
  })

  it('returns false for empty/nullish input', () => {
    expect(looksLikeBoilerplateResponse('')).toBe(false)
    expect(looksLikeBoilerplateResponse(undefined)).toBe(false)
    expect(looksLikeBoilerplateResponse(null)).toBe(false)
  })
})
