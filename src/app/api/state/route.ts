import { NextRequest, NextResponse } from 'next/server'

import { loadSharedAppState, saveSharedAppState, saveSharedAppStateDelta } from '@/lib/db/app-state'
import { hasSupabaseBrowserConfig, hasSupabaseServerConfig } from '@/lib/db/config'
import type { AppPersistencePatch, AppPersistenceSnapshot, EntityDeltaPatch } from '@/lib/agents-store'
import { resolveAuthContextFromToken, saveUserProviderSettings } from '@/lib/auth/server'
import { loadRelationalAppState } from '@/lib/db/relational-sync'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { canAddAgent, syncAgentCount } from '@/lib/server/tenants'

export const dynamic = 'force-dynamic'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

function applyOwnershipDefaults(state: AppPersistenceSnapshot, userId: string): AppPersistenceSnapshot {
  return {
    ...state,
    clients: state.clients.map((client) => ({
      ...client,
      ownerUserId: client.ownerUserId || userId,
    })),
    missions: state.missions.map((mission) => ({
      ...mission,
      ownerUserId: mission.ownerUserId || userId,
    })),
    artifacts: state.artifacts.map((artifact) => ({
      ...artifact,
      ownerUserId: artifact.ownerUserId || userId,
    })),
    conversations: [],
  }
}

function mergeStatePatch(
  currentState: AppPersistenceSnapshot | null,
  patch: AppPersistencePatch
): AppPersistenceSnapshot {
  return {
    ...(currentState || {}),
    ...patch,
  } as AppPersistenceSnapshot
}

function filterStateForUser(state: AppPersistenceSnapshot, userId: string): AppPersistenceSnapshot {
  const scopedClients = state.clients.filter((client) => client.ownerUserId === userId)
  const scopedClientIds = new Set(scopedClients.map((client) => client.id))
  const scopedMissions = state.missions.filter(
    (mission) => mission.ownerUserId === userId || (mission.clientId ? scopedClientIds.has(mission.clientId) : false)
  )
  const scopedMissionIds = new Set(scopedMissions.map((mission) => mission.id))
  const scopedArtifacts = state.artifacts.filter(
    (artifact) =>
      artifact.ownerUserId === userId ||
      (artifact.clientId ? scopedClientIds.has(artifact.clientId) : false) ||
      (artifact.missionId ? scopedMissionIds.has(artifact.missionId) : false)
  )
  return {
    ...state,
    clients: scopedClients,
    missions: scopedMissions,
    artifacts: scopedArtifacts,
    conversations: [],
  }
}

function mergeOwnedCollection<T extends { id: string; ownerUserId?: string }>(
  currentItems: T[],
  incomingItems: T[],
  userId: string
) {
  const preserved = currentItems.filter((item) => item.ownerUserId !== userId)
  const incomingOwned = incomingItems.filter((item) => item.ownerUserId === userId)
  const dedupedPreserved = preserved.filter(
    (item) => !incomingOwned.some((incoming) => incoming.id === item.id)
  )
  return [...dedupedPreserved, ...incomingOwned]
}

function mergeScopedState(
  currentState: AppPersistenceSnapshot | null,
  incomingState: AppPersistenceSnapshot,
  userId: string
): AppPersistenceSnapshot {
  const normalizedIncoming = applyOwnershipDefaults(incomingState, userId)
  if (!currentState) return normalizedIncoming

  return {
    ...currentState,
    clients: mergeOwnedCollection(currentState.clients, normalizedIncoming.clients, userId),
    missions: mergeOwnedCollection(currentState.missions, normalizedIncoming.missions, userId),
    artifacts: mergeOwnedCollection(currentState.artifacts, normalizedIncoming.artifacts, userId),
    conversations: currentState.conversations,
  }
}

function mergeProviderSettings(base: any, override: any) {
  return normalizeProviderSettings({
    ...(base || {}),
    ...(override || {}),
    routing: { ...(base?.routing || {}), ...(override?.routing || {}) },
    ollama: { ...(base?.ollama || {}), ...(override?.ollama || {}) },
    gemini: {
      ...(base?.gemini || {}),
      ...(override?.gemini || {}),
      apiKey: override?.gemini?.apiKey || base?.gemini?.apiKey || '',
      maskedKey: override?.gemini?.maskedKey || base?.gemini?.maskedKey || '',
    },
    visual: { ...(base?.visual || {}), ...(override?.visual || {}) },
    mcp: {
      ...(base?.mcp || {}),
      ...(override?.mcp || {}),
    },
  })
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json(
      {
        connected: false,
        browserConfigured: hasSupabaseBrowserConfig(),
        serverConfigured: false,
        state: null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 })
    }

    const stateKey = auth.tenantId ?? undefined
    const row = await loadSharedAppState(stateKey)
    const relationalState = await loadRelationalAppState(auth.userId, auth.role === 'super_admin', auth.tenantId)
    const fallbackState = row?.state
      ? auth.role === 'super_admin'
        ? row.state
        : filterStateForUser(row.state, auth.userId)
      : null

    // Merge relational state over the JSON blob, but for entity collections
    // (clients, missions, artifacts) only override the blob when the relational
    // table actually has rows — an empty array means "not yet synced from client",
    // not "the user deleted everything".
    const mergeRelational = (
      relational: Partial<AppPersistenceSnapshot> | null,
      fallback: AppPersistenceSnapshot | null
    ): AppPersistenceSnapshot | null => {
      if (!relational) return fallback
      const base = fallback || ({} as AppPersistenceSnapshot)
      const entityKeys = ['clients', 'missions', 'artifacts', 'agents', 'conversations'] as const
      const merged: any = { ...base, ...relational }
      for (const key of entityKeys) {
        const relArr = (relational as any)[key]
        if (!relArr || (Array.isArray(relArr) && relArr.length === 0)) {
          // Relational table empty — keep blob version if it has data
          merged[key] = (base as any)[key] || relArr || []
        }
      }
      return merged
    }
    const state = mergeRelational(relationalState, fallbackState)
    const providerSettings = mergeProviderSettings(state?.providerSettings, auth.providerSettings)
    const nextState = state
      ? { ...state, providerSettings }
      : ({ providerSettings } as Partial<AppPersistenceSnapshot>)

    return NextResponse.json(
      {
        connected: true,
        browserConfigured: true,
        serverConfigured: true,
        state: nextState,
        updatedAt: row?.updated_at || null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Failed to load shared app state:', error)
    return NextResponse.json({ connected: true, error: 'Failed to load shared app state' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json(
      {
        connected: false,
        browserConfigured: hasSupabaseBrowserConfig(),
        serverConfigured: false,
        error: 'Supabase server key is not configured',
      },
      { status: 503 }
    )
  }

  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      state?: AppPersistenceSnapshot
      statePatch?: AppPersistencePatch
      entityPatch?: EntityDeltaPatch
      updatedAt?: string | null
    }

    if (!body?.state && !body?.statePatch && !body?.entityPatch) {
      return NextResponse.json({ error: 'Missing state payload' }, { status: 400 })
    }

    const currentRow = await loadSharedAppState(auth.tenantId ?? undefined)

    // ── Agent limit enforcement ─────────────────────────────────────────────
    // Check when new agents are being upserted — canAddAgent queries the DB
    // live so the count is always accurate.
    if (body.entityPatch?.agents?.upserts?.length && auth.tenantId) {
      const existingAgentIds = new Set(
        (currentRow?.state?.agents || []).map((a: any) => a.id)
      )
      const newAgents = body.entityPatch.agents.upserts.filter(
        (a: any) => !existingAgentIds.has(a.id)
      )
      if (newAgents.length > 0) {
        const check = await canAddAgent(auth.tenantId)
        if (!check.allowed) {
          return NextResponse.json(
            {
              error: `Agent limit reached. Your ${check.limit}-agent plan is full (${check.current}/${check.limit}). Upgrade to add more agents.`,
              code: 'AGENT_LIMIT_EXCEEDED',
              limit: check.limit,
              current: check.current,
            },
            { status: 402 }
          )
        }
      }
    }
    if (body.updatedAt && currentRow?.updated_at && body.updatedAt !== currentRow.updated_at) {
      return NextResponse.json(
        {
          connected: true,
          error: 'State conflict detected. Please refresh and retry your change.',
          updatedAt: currentRow.updated_at,
        },
        { status: 409 }
      )
    }

    const incomingState =
      body.state ||
      mergeStatePatch(
        currentRow?.state || null,
        body.statePatch || {}
      )
    const normalizedProviderSettings = mergeProviderSettings(
      mergeProviderSettings(currentRow?.state?.providerSettings, incomingState.providerSettings),
      auth.providerSettings
    )
    await saveUserProviderSettings(auth.userId, normalizedProviderSettings)
    const nextIncomingState =
      auth.role === 'super_admin'
        ? {
            ...incomingState,
            providerSettings: normalizedProviderSettings,
          }
        : incomingState
    const nextState =
      auth.role === 'super_admin'
        ? nextIncomingState
        : mergeScopedState(currentRow?.state || null, nextIncomingState, auth.userId)
    const row =
      body.statePatch || body.entityPatch
        ? await saveSharedAppStateDelta(
            {
              statePatch:
                auth.role === 'super_admin'
                  ? {
                      ...(body.statePatch || {}),
                      providerSettings: normalizedProviderSettings,
                    }
                  : body.statePatch,
              entityPatch: body.entityPatch,
            },
            undefined,
            auth.tenantId
          )
        : await saveSharedAppState(nextState, undefined, auth.tenantId)

    // Keep subscription.current_agent_count in sync (best-effort)
    if (auth.tenantId && body.entityPatch?.agents) {
      syncAgentCount(auth.tenantId).catch(() => {})
    }

    return NextResponse.json({
      connected: true,
      browserConfigured: true,
      serverConfigured: true,
      updatedAt: row?.updated_at || null,
    })
  } catch (error) {
    console.error('Failed to save shared app state:', error)
    return NextResponse.json({ connected: true, error: 'Failed to save shared app state' }, { status: 500 })
  }
}
