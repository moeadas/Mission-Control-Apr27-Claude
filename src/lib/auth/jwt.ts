import { SignJWT, jwtVerify } from 'jose'

const ALG = 'HS256'
const EXPIRY = '7d'

function getSecret() {
  const raw = process.env.JWT_SECRET || 'dev-secret-change-in-production-minimum-32-chars!!'
  return new TextEncoder().encode(raw)
}

export async function signToken(payload: { sub: string; email: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<{ sub: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as { sub: string; email: string; role: string }
  } catch {
    return null
  }
}
