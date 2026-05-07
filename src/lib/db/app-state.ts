import { getDb } from '@/lib/db/client'
import type { AppPersistencePatch, AppPersistenceSnapshot, EntityDeltaPatch } from '@/lib/agents-store'
import { syncSnapshotToRelationalTables, syncEntityDeltaToRelationalTables } from '@/lib/db/relational-sync'

const APP_STATE_TABLE = 'mission_control_state'
const DEFAULT_AGENCY_ID = 'default-agency'

interface StateRow {
  agency_id: string
  state: AppPersistenceSnapshot
  updated_at?: string
}

// postgres.js returns TIMESTAMPTZ as a Date object; normalize to ISO string so
// string comparisons in the 409 conflict check always work correctly.
function normalizeRow(row: any): StateRow {
  return {
    ...row,
    updated_at: row.updated_at
      ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at))
      : undefined,
  }
}

export async function loadSharedAppState(agencyId = DEFAULT_AGENCY_ID): Promise<StateRow | null> {
  const db = getDb()
  const rows = await db`
    SELECT agency_id, state, updated_at
    FROM ${db(APP_STATE_TABLE)}
    WHERE agency_id = ${agencyId}
    LIMIT 1
  `
  const row = rows[0]
  return row ? normalizeRow(row) : null
}

export async function saveSharedAppState(
  state: AppPersistenceSnapshot,
  agencyId = DEFAULT_AGENCY_ID
): Promise<StateRow | null> {
  const db = getDb()
  const rows = await db`
    INSERT INTO ${db(APP_STATE_TABLE)} (agency_id, state, updated_at)
    VALUES (${agencyId}, ${db.json(state as any)}, now())
    ON CONFLICT (agency_id) DO UPDATE
      SET state = EXCLUDED.state,
          updated_at = now()
    RETURNING agency_id, state, updated_at
  `
  const row = rows[0]
  if (row) {
    try {
      await syncSnapshotToRelationalTables(state)
    } catch (syncErr) {
      console.error('[app-state] relational sync failed (non-fatal):', syncErr)
    }
  }
  return row ? normalizeRow(row) : null
}

export async function saveSharedAppStatePatch(
  patch: AppPersistencePatch,
  agencyId = DEFAULT_AGENCY_ID
): Promise<StateRow | null> {
  const current = await loadSharedAppState(agencyId)
  const nextState = { ...(current?.state || {}), ...patch } as AppPersistenceSnapshot
  return saveSharedAppState(nextState, agencyId)
}

export async function saveSharedAppStateDelta(
  input: { statePatch?: AppPersistencePatch; entityPatch?: EntityDeltaPatch },
  agencyId = DEFAULT_AGENCY_ID
): Promise<StateRow | null> {
  const db = getDb()
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

  nextState.agents        = applyEntityDelta(nextState.agents,        input.entityPatch?.agents)
  nextState.clients       = applyEntityDelta(nextState.clients,       input.entityPatch?.clients)
  nextState.missions      = applyEntityDelta(nextState.missions,      input.entityPatch?.missions)
  nextState.artifacts     = applyEntityDelta(nextState.artifacts,     input.entityPatch?.artifacts)
  nextState.conversations = applyEntityDelta(nextState.conversations, input.entityPatch?.conversations)

  const rows = await db`
    INSERT INTO ${db(APP_STATE_TABLE)} (agency_id, state, updated_at)
    VALUES (${agencyId}, ${db.json(nextState as any)}, now())
    ON CONFLICT (agency_id) DO UPDATE
      SET state = EXCLUDED.state,
          updated_at = now()
    RETURNING agency_id, state, updated_at
  `
  const row = rows[0]

  // Relational sync is best-effort — the JSON blob is already committed above.
  // A sync failure must not roll back the PUT or return 500 to the client.
  try {
    if (input.statePatch || input.entityPatch) {
      await syncEntityDeltaToRelationalTables({ statePatch: input.statePatch, entityPatch: input.entityPatch }, nextState)
    } else {
      await syncSnapshotToRelationalTables(nextState)
    }
  } catch (syncErr) {
    console.error('[app-state] relational sync failed (non-fatal):', syncErr)
  }

  return row ? normalizeRow(row) : null
}
