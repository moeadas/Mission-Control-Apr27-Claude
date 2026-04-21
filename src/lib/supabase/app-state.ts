import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { AppPersistencePatch, AppPersistenceSnapshot, EntityDeltaPatch } from '@/lib/agents-store'
import { syncSnapshotToRelationalTables, syncEntityDeltaToRelationalTables } from '@/lib/supabase/relational-sync'

const APP_STATE_TABLE = 'mission_control_state'
const DEFAULT_AGENCY_ID = 'default-agency'

interface SupabaseStateRow {
  agency_id: string
  state: AppPersistenceSnapshot
  updated_at?: string
}

export async function loadSharedAppState(agencyId = DEFAULT_AGENCY_ID): Promise<SupabaseStateRow | null> {
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(APP_STATE_TABLE)
    .select('agency_id, state, updated_at')
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as SupabaseStateRow | null) || null
}

export async function saveSharedAppState(
  state: AppPersistenceSnapshot,
  agencyId = DEFAULT_AGENCY_ID
): Promise<SupabaseStateRow | null> {
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(APP_STATE_TABLE)
    .upsert(
      {
        agency_id: agencyId,
        state,
      },
      { onConflict: 'agency_id' }
    )
    .select('agency_id, state, updated_at')
    .single()

  if (error) {
    throw error
  }

  await syncSnapshotToRelationalTables(state)

  return data as SupabaseStateRow
}

export async function saveSharedAppStatePatch(
  patch: AppPersistencePatch,
  agencyId = DEFAULT_AGENCY_ID
): Promise<SupabaseStateRow | null> {
  const current = await loadSharedAppState(agencyId)
  const nextState = {
    ...(current?.state || {}),
    ...patch,
  } as AppPersistenceSnapshot

  return saveSharedAppState(nextState, agencyId)
}

export async function saveSharedAppStateDelta(
  input: {
    statePatch?: AppPersistencePatch
    entityPatch?: EntityDeltaPatch
  },
  agencyId = DEFAULT_AGENCY_ID
): Promise<SupabaseStateRow | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const current = await loadSharedAppState(agencyId)
  const nextState = {
    ...(current?.state || {}),
    ...(input.statePatch || {}),
  } as AppPersistenceSnapshot

  const applyEntityDelta = <T extends { id: string }>(
    currentItems: T[] = [],
    patch?: { upserts: T[]; deletes: string[] }
  ) => {
    if (!patch) return currentItems
    const next = new Map(currentItems.map((item) => [item.id, item]))
    for (const id of patch.deletes || []) next.delete(id)
    for (const item of patch.upserts || []) next.set(item.id, item)
    return [...next.values()]
  }

  nextState.agents = applyEntityDelta(nextState.agents, input.entityPatch?.agents)
  nextState.clients = applyEntityDelta(nextState.clients, input.entityPatch?.clients)
  nextState.missions = applyEntityDelta(nextState.missions, input.entityPatch?.missions)
  nextState.artifacts = applyEntityDelta(nextState.artifacts, input.entityPatch?.artifacts)
  nextState.conversations = applyEntityDelta(nextState.conversations, input.entityPatch?.conversations)

  const { data, error } = await supabase
    .from(APP_STATE_TABLE)
    .upsert(
      {
        agency_id: agencyId,
        state: nextState,
      },
      { onConflict: 'agency_id' }
    )
    .select('agency_id, state, updated_at')
    .single()

  if (error) {
    throw error
  }

  if (input.statePatch || input.entityPatch) {
    await syncEntityDeltaToRelationalTables(
      {
        statePatch: input.statePatch,
        entityPatch: input.entityPatch,
      },
      nextState
    )
  } else {
    await syncSnapshotToRelationalTables(nextState)
  }

  return data as SupabaseStateRow
}
