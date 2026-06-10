import { lookup } from 'dns/promises'
import { isIP } from 'net'

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'host.docker.internal',
  'gateway.docker.internal',
  'docker.for.mac.localhost',
  'docker.for.win.localhost',
  'metadata.google.internal',
])

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal']

type SafeFetchOptions = {
  timeoutMs?: number
  maxRedirects?: number
}

type SafeFetchResult = {
  response: Response
  finalUrl: string
  redirected: boolean
}

function isBlockedHostname(hostname: string) {
  const lower = hostname.toLowerCase().replace(/\.$/, '')
  if (BLOCKED_HOSTNAMES.has(lower)) return true
  return BLOCKED_HOST_SUFFIXES.some((suffix) => lower.endsWith(suffix))
}

function isPublicIpv4(address: string) {
  const parts = address.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts

  if (a === 0) return false
  if (a === 10) return false
  if (a === 100 && b >= 64 && b <= 127) return false
  if (a === 127) return false
  if (a === 169 && b === 254) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a === 192 && b === 0) return false
  if (a === 198 && (b === 18 || b === 19)) return false
  if (a >= 224) return false

  return true
}

function isPublicIpv6(address: string) {
  const lower = address.toLowerCase()
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPublicIpv4(mapped[1])

  if (lower === '::' || lower === '::1') return false
  if (lower.startsWith('fc') || lower.startsWith('fd')) return false
  if (/^fe[89ab]/.test(lower)) return false
  if (lower.startsWith('ff')) return false

  return true
}

function isPublicIpAddress(address: string) {
  const version = isIP(address)
  if (version === 4) return isPublicIpv4(address)
  if (version === 6) return isPublicIpv6(address)
  return false
}

async function assertPublicHttpUrl(input: string | URL) {
  const parsed = new URL(input.toString())
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed.')
  }

  const hostname = parsed.hostname
  if (!hostname || isBlockedHostname(hostname)) {
    throw new Error('Private or internal hostnames are not allowed.')
  }

  if (isIP(hostname)) {
    if (!isPublicIpAddress(hostname)) throw new Error('Private or internal IP addresses are not allowed.')
    return parsed
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (!addresses.length) throw new Error('URL hostname could not be resolved.')
  const blocked = addresses.find((entry) => !isPublicIpAddress(entry.address))
  if (blocked) throw new Error('URL hostname resolves to a private or internal address.')
  return parsed
}

export async function safeFetchUrl(
  input: string | URL,
  init: RequestInit = {},
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const maxRedirects = options.maxRedirects ?? 4
  const timeoutMs = options.timeoutMs ?? 10000
  let current = await assertPublicHttpUrl(input)
  let redirected = false

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await fetch(current.toString(), {
      ...init,
      redirect: 'manual',
      signal: init.signal || AbortSignal.timeout(timeoutMs),
    })

    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      if (redirectCount === maxRedirects) throw new Error('Too many redirects while fetching URL.')
      current = await assertPublicHttpUrl(new URL(location, current))
      redirected = true
      continue
    }

    return {
      response,
      finalUrl: current.toString(),
      redirected,
    }
  }

  throw new Error('Too many redirects while fetching URL.')
}

export async function readResponseTextWithLimit(response: Response, maxBytes = 1_000_000) {
  const contentLength = Number(response.headers.get('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error('Response body is too large.')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    const text = await response.text()
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('Response body is too large.')
    return text
  }

  const chunks: Buffer[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = Buffer.from(value)
    total += chunk.length
    if (total > maxBytes) throw new Error('Response body is too large.')
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}
