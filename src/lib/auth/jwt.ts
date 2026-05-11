import { SignJWT, jwtVerify } from 'jose'

const ALG = 'HS256'
const EXPIRY = '7d'

function getSecret() {
  const raw = process.env.JWT_SECRET
  if (!raw || raw.length < 32) {
    throw new Error('JWT_SECRET env var is missing or shorter than 32 characters. Set it before starting the server.')
  }
  return new TextEncoder().encode(raw)
}

export async function signToken(payload: { sub: string; email: string; role: string; tenantId?: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<{ sub: string; email: string; role: string; tenantId?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as { sub: string; email: string; role: string; tenantId?: string }
  } catch {
    return null
  }
}
