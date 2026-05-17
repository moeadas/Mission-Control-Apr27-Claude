import { NextRequest, NextResponse } from 'next/server'

import { loadSharedAppState, saveSharedAppState, saveSharedAppStateDelta } from '@/lib/db/app-state'
import { hasDatabaseConfig } from '@/lib/db/config'
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

// Batch C — team collaboration model.
//
// Tenant data is shared across all tenant members by default. Per-resource
// access lists (`assignedUserIds`) let tenant admins restrict who can see /
// edit specific clients, missions, or artifacts. The behaviour:
//
//   • Super-admin (platform-wide): sees everything, can edit anything.
//   • Tenant admin (admin role + has tenantId): sees everything in their
//     tenant, can edit anything in their tenant, can set/clear assignedUserIds.
//   • Tenant member: sees everything in their tenant EXCEPT resources with a
//     non-empty `assignedUserIds` that doesn't include them. They can edit
//     resources they have access to, plus resources they own.
//
// An empty/missing `assignedUserIds` means "shared with the whole tenant".

type AnyResource = {
  id: string
  ownerUserId?: string
  assignedUserIds?: string[] | null
}

function canSeeResource(resource: AnyResource, userId: string, isTenantAdmin: boolean): boolean {
  if (isTenantAdmin) return true
  const assigned = Array.isArray(resource.assignedUserIds) ? resource.assignedUserIds : []
  if (assigned.length === 0) return true
  return resource.ownerUserId === userId || assigned.includes(userId)
}

function applyOwnershipDefaults(state: AppPersistenceSnapshot, userId: string): AppPersistenceSnapshot {
  // ownerUserId is the "created by" stamp. New rows default to the caller.
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

function filterStateForCaller(
  state: AppPersistenceSnapshot,
  userId: string,
  isTenantAdmin: boolean
): AppPersistenceSnapshot {
  const visibleClients = state.clients.filter((client) =>
    canSeeResource(client as AnyResource, userId, isTenantAdmin)
  )
  const visibleClientIds = new Set(visibleClients.map((client) => client.id))
  const visibleMissions = state.missions.filter((mission) => {
    if (!canSeeResource(mission as AnyResource, userId, isTenantAdmin)) return false
    // A mission tied to a client the caller can't see is also hidden, to keep
    // the chain consistent. Missions with no client (free-standing tasks) are
    // governed only by the mission's own ACL.
    if (mission.clientId && !visibleClientIds.has(mission.clientId)) return false
    return true
  })
  const visibleMissionIds = new Set(visibleMissions.map((mission) => mission.id))
  const visibleArtifacts = state.artifacts.filter((artifact) => {
    if (!canSeeResource(artifact as AnyResource, userId, isTenantAdmin)) return false
    if (artifact.clientId && !visibleClientIds.has(artifact.clientId)) return false
    if (artifact.missionId && !visibleMissionIds.has(artifact.missionId)) return false
    return true
  })
  return {
    ...state,
    clients: visibleClients,
    missions: visibleMissions,
    artifacts: visibleArtifacts,
    conversations: [],
  }
}

/**
 * Merge incoming tenant state writes:
 *   • Tenant admins can edit anything in the tenant (and set assignedUserIds).
 *   • Tenant members can only modify rows they're allowed to see; attempted
 *     edits to invisible rows are silently dropped (the original row is
 *     preserved).
 */
function mergeTenantCollection<T extends AnyResource>(
  currentItems: T[],
  incomingItems: T[],
  userId: string,
  isTenantAdmin: boolean
): T[] {
  const currentById = new Map(currentItems.map((item) => [item.id, item]))
  const incomingById = new Map(incomingItems.map((item) => [item.id, item]))

  const result: T[] = []
  // Pass 1: incoming rows the caller is allowed to write
  for (const incoming of incomingItems) {
    const existing = currentById.get(incoming.id)
    if (!existing) {
      // New row — must be visible to the caller (i.e. their ACL must include
      // them if they set one). For convenience, members can't set
      // assignedUserIds on a brand-new row; only tenant admins can.
      if (!isTenantAdmin && Array.isArray(incoming.assignedUserIds) && incoming.assignedUserIds.length > 0) {
        // strip ACL — members can't restrict resources at creation time
        result.push({ ...incoming, assignedUserIds: [] as any })
      } else {
        result.push(incoming)
      }
      continue
    }
    if (isTenantAdmin || canSeeResource(existing, userId, isTenantAdmin)) {
      // Members can update the row but can't change assignedUserIds.
      if (!isTenantAdmin) {
        result.push({ ...incoming, assignedUserIds: existing.assignedUserIds ?? [] })
      } else {
        result.push(incoming)
      }
    } else {
      // Member tried to edit an invisible row — keep the existing version.
      result.push(existing)
    }
  }
  // Pass 2: existing rows the caller didn't send — preserve them.
  for (const existing of currentItems) {
    if (!incomingById.has(existing.id)) result.push(existing)
  }
  return result
}

function mergeScopedState(
  currentState: AppPersistenceSnapshot | null,
  incomingState: AppPersistenceSnapshot,
  userId: string,
  isTenantAdmin: boolean
): AppPersistenceSnapshot {
  const normalizedIncoming = applyOwnershipDefaults(incomingState, userId)
  if (!currentState) return normalizedIncoming

  return {
    ...currentState,
    clients: mergeTenantCollection(currentState.clients as any, normalizedIncoming.clients as any, userId, isTenantAdmin) as any,
    missions: mergeTenantCollection(currentState.missions as any, normalizedIncoming.missions as any, userId, isTenantAdmin) as any,
    artifacts: mergeTenantCollection(currentState.artifacts as any, normalizedIncoming.artifacts as any, userId, isTenantAdmin) as any,
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
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      {
        connected: false,
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
    const isTenantAdmin = auth.role === 'super_admin' || auth.role === 'admin'
    const row = await loadSharedAppState(stateKey)
    const relationalState = await loadRelationalAppState(auth.userId, auth.role === 'super_admin', auth.tenantId)
    // Apply per-resource ACL filter for non-admin tenant members. Tenant admins
    // and super-admins see everything the tenant owns.
    const fallbackState = row?.state
      ? isTenantAdmin
        ? row.state
        : filterStateForCaller(row.state, auth.userId, isTenantAdmin)
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
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      {
        connected: false,
        serverConfigured: false,
        error: 'DATABASE_URL is not configured',
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

    const isTenantAdminWrite = auth.role === 'super_admin' || auth.role === 'admin'
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
    // providerSettings is always written from the caller's session (per-user)
    // regardless of role — it's not tenant-shared data.
    const nextIncomingState = {
      ...incomingState,
      providerSettings: normalizedProviderSettings,
    }
    // Tenant admins (and super-admin) can rewrite the whole tenant blob; tenant
    // members go through the ACL-aware merge that protects rows they can't see.
    const nextState = isTenantAdminWrite
      ? nextIncomingState
      : mergeScopedState(currentRow?.state || null, nextIncomingState, auth.userId, isTenantAdminWrite)
    const row =
      body.statePatch || body.entityPatch
        ? await saveSharedAppStateDelta(
            {
              statePatch: isTenantAdminWrite
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
      serverConfigured: true,
      updatedAt: row?.updated_at || null,
    })
  } catch (error) {
    console.error('Failed to save shared app state:', error)
    return NextResponse.json({ connected: true, error: 'Failed to save shared app state' }, { status: 500 })
  }
}
