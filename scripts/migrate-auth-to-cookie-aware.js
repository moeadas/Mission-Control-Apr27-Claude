#!/usr/bin/env node
/**
 * Batch P.2 migration: route inline getBearerToken() helpers to delegate to
 * the shared getAuthTokenFromRequest() helper that reads the session cookie
 * OR the Authorization bearer header.
 *
 * Approach: minimal-diff. Per file we replace ONLY the function body so
 * call sites don't need to change. The function signature stays the same;
 * the body becomes `return getAuthTokenFromRequest(req)`.
 *
 * Idempotent — running again on already-migrated files is a no-op.
 *
 * Run from the repo root:  node scripts/migrate-auth-to-cookie-aware.js
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const API_DIR = path.join(ROOT, 'src/app/api')

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(p))
    else if (entry.name === 'route.ts') out.push(p)
  }
  return out
}

// Two body patterns observed in the codebase. Both reduce to the same
// delegate. The (req|request) capture is the arg name so we substitute it.
const PATTERN_TWO_LINE = (arg) => new RegExp(
  `function getBearerToken\\(${arg}: NextRequest\\)\\s*\\{\\s*` +
  `const h = ${arg}\\.headers\\.get\\('authorization'\\) \\|\\| ''\\s*` +
  `return h\\.toLowerCase\\(\\)\\.startsWith\\('bearer '\\)\\s*\\?\\s*` +
  `h\\.slice\\(7\\)\\.trim\\(\\)\\s*:\\s*null\\s*` +
  `\\}`,
  'm'
)

const PATTERN_THREE_LINE = (arg) => new RegExp(
  `function getBearerToken\\(${arg}: NextRequest\\)\\s*\\{\\s*` +
  `const authHeader = ${arg}\\.headers\\.get\\('authorization'\\) \\|\\| ''\\s*` +
  `if \\(!authHeader\\.toLowerCase\\(\\)\\.startsWith\\('bearer '\\)\\) return null\\s*` +
  `return authHeader\\.slice\\(7\\)\\.trim\\(\\)\\s*` +
  `\\}`,
  'm'
)

const DELEGATE = (arg) =>
  `function getBearerToken(${arg}: NextRequest) {\n` +
  `  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.\n` +
  `  return getAuthTokenFromRequest(${arg})\n` +
  `}`

const FALLBACK_IMPORT = `import { getAuthTokenFromRequest } from '@/lib/auth/server'`

function migrate(src) {
  let changed = false
  for (const arg of ['req', 'request', 'r']) {
    for (const make of [PATTERN_TWO_LINE, PATTERN_THREE_LINE]) {
      const re = make(arg)
      if (re.test(src)) {
        src = src.replace(re, DELEGATE(arg))
        changed = true
      }
    }
  }
  if (!changed) return null

  // Ensure getAuthTokenFromRequest is imported. Two cases:
  // (a) file already imports something from @/lib/auth/server → append to list
  // (b) no such import → insert a new line after the last existing import
  const authServerRe = /import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/auth\/server['"]/
  const match = src.match(authServerRe)
  if (match) {
    const imports = match[1].split(',').map((s) => s.trim()).filter(Boolean)
    if (!imports.includes('getAuthTokenFromRequest')) {
      imports.push('getAuthTokenFromRequest')
      src = src.replace(
        authServerRe,
        `import { ${imports.join(', ')} } from '@/lib/auth/server'`
      )
    }
  } else if (!src.includes(FALLBACK_IMPORT)) {
    // Insert after the LAST import line.
    const lines = src.split('\n')
    let lastImportIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i])) lastImportIdx = i
    }
    if (lastImportIdx === -1) {
      // No imports at all — unlikely for a route.ts but handle it.
      src = `${FALLBACK_IMPORT}\n\n${src}`
    } else {
      lines.splice(lastImportIdx + 1, 0, FALLBACK_IMPORT)
      src = lines.join('\n')
    }
  }
  return src
}

const files = walk(API_DIR).sort()
const skipped = []
const migrated = []
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  if (!src.includes('function getBearerToken')) continue
  // Skip files that already delegate (idempotency check).
  if (src.includes('return getAuthTokenFromRequest(')) {
    skipped.push(`${f} (already delegated)`)
    continue
  }
  const next = migrate(src)
  if (next === null) {
    skipped.push(`${f} (pattern not matched)`)
    continue
  }
  fs.writeFileSync(f, next, 'utf8')
  migrated.push(f)
}

console.log(`Migrated: ${migrated.length}`)
for (const f of migrated) console.log(`  ✓ ${path.relative(ROOT, f)}`)
if (skipped.length) {
  console.log(`Skipped: ${skipped.length}`)
  for (const f of skipped) console.log(`  – ${path.relative(ROOT, f)}`)
}
