import { NextRequest, NextResponse } from 'next/server'

import { loadSharedAppState, saveSharedAppState, saveSharedAppStateDelta } from '@/lib/supabase/app-state'
import { hasSupabaseBrowserConfig, hasSupabaseServerConfig } from '@/lib/supabase/config'
import type { AppPersistencePatch, AppPersistenceSnapshot, EntityDeltaPatch } from '@/lib/agents-store'
import { resolveAuthContextFromToken, saveUserProviderSettings } from '@/lib/supabase/auth'
import { loadRelationalAppState } from '@/lib/supabase/relational-sync'
import { normalizeProviderSettings } from '@/lib/provider-settings'

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

    const row = await loadSharedAppState()
    const relationalState = await loadRelationalAppState(auth.userId, auth.role === 'super_admin')
    const fallbackState = row?.state
      ? auth.role === 'super_admin'
        ? row.state
        : filterStateForUser(row.state, auth.userId)
      : null
    const state = relationalState
      ? {
          ...(fallbackState || {}),
          ...relationalState,
        }
      : fallbackState
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

    const currentRow = await loadSharedAppState()
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
        ? await saveSharedAppStateDelta({
            statePatch:
              auth.role === 'super_admin'
                ? {
                    ...(body.statePatch || {}),
                    providerSettings: normalizedProviderSettings,
                  }
                : body.statePatch,
            entityPatch: body.entityPatch,
          })
        : await saveSharedAppState(nextState)

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
