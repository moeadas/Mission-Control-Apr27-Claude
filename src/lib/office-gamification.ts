/**
 * office-gamification.ts — score, quests, XP (Batch W Phase 3)
 *
 * Pure logic that takes the current office layout + the agency's recent task
 * history and produces:
 *   • An office score (0–100) across three axes: capacity, productivity, aesthetic
 *   • The current level + XP-to-next-level
 *   • A daily quest set that refreshes every 24 hours
 *   • Quest progress evaluation (counts placed assets, completed tasks, etc.)
 *
 * Everything is in the layout JSONB so no DB migration is needed. XP is
 * awarded externally (by the runner when a task completes) — this module
 * only owns the math + state shape.
 */

import { OFFICE_ASSETS } from '@/lib/office-assets'
import {
  DAILY_QUEST_REFRESH_MS,
  levelFromXp,
  type OfficeGamification,
  type OfficeLayout,
  type OfficeQuest,
} from '@/lib/office-types'

const assetMap = new Map(OFFICE_ASSETS.map((a) => [a.id, a]))

// ─── Scoring ──────────────────────────────────────────────────────────────

export interface OfficeScore {
  /** Total score, 0–100 */
  total: number
  capacity: number      // 0–100: desks vs agent roster size
  productivity: number  // 0–100: completed tasks last 24h vs target
  aesthetic: number     // 0–100: furniture variety + zones + decor
  /** Human-readable label e.g. "Cosy startup", "Buzzing studio" */
  label: string
  /** Free-form tips the user can act on to raise the score */
  tips: string[]
}

export function computeOfficeScore(input: {
  layout: OfficeLayout
  agentCount: number
  completedTasksLast24h: number
}): OfficeScore {
  const { layout, agentCount, completedTasksLast24h } = input

  // Capacity: how well-equipped the office is for the agent roster.
  const desks = layout.tiles.filter((t) => assetMap.get(t.assetId)?.category === 'desks').length
  const assignedDesks = layout.tiles.filter(
    (t) => assetMap.get(t.assetId)?.category === 'desks' && t.assignedAgentId
  ).length
  const targetDesks = Math.max(1, agentCount)
  const capacity = Math.min(
    100,
    Math.round((desks / targetDesks) * 60 + (assignedDesks / targetDesks) * 40)
  )

  // Productivity: 5 completed tasks/day = peak (100). Decays below that.
  const target = 5
  const productivity = Math.min(100, Math.round((completedTasksLast24h / target) * 100))

  // Aesthetic: variety + zones + decor + wellness.
  const categories = new Set<string>()
  let decorCount = 0
  let wellnessCount = 0
  for (const tile of layout.tiles) {
    const cat = assetMap.get(tile.assetId)?.category
    if (cat) categories.add(cat)
    if (cat === 'decor') decorCount += 1
    if (cat === 'wellness') wellnessCount += 1
  }
  const variety = Math.min(40, categories.size * 6)
  const decorScore = Math.min(20, decorCount * 4)
  const wellnessScore = Math.min(20, wellnessCount * 6)
  const zonesScore = Math.min(20, (layout.zones?.length || 0) * 7)
  const aesthetic = variety + decorScore + wellnessScore + zonesScore

  const total = Math.round(capacity * 0.35 + productivity * 0.35 + aesthetic * 0.3)

  const label = (() => {
    if (total < 25) return 'Empty shell'
    if (total < 50) return 'Cosy startup'
    if (total < 75) return 'Buzzing studio'
    if (total < 90) return 'Established agency'
    return 'World-class workspace'
  })()

  const tips: string[] = []
  if (capacity < 60) tips.push(`Add ${Math.max(0, targetDesks - desks)} more desk${targetDesks - desks === 1 ? '' : 's'} so every agent has somewhere to work.`)
  if (assignedDesks < desks) tips.push('Assign desks to specific agents — empty desks earn no capacity score.')
  if (productivity < 40) tips.push('Run more tasks today to lift the productivity score.')
  if (wellnessCount === 0) tips.push('Add a wellness item (plant, beanbag, etc.) to lift mood.')
  if ((layout.zones?.length || 0) === 0) tips.push('Define a zone (Creative / Strategy / Quiet) to organise the floor.')

  return { total, capacity, productivity, aesthetic, label, tips }
}

// ─── Quests ──────────────────────────────────────────────────────────────

/** Catalogue of quests we can roll into the daily set. Pick 3 each day. */
const QUEST_TEMPLATES: Array<Omit<OfficeQuest, 'progress' | 'completedAt'>> = [
  { id: 'tasks-3', title: 'Knock out 3 tasks',     description: 'Complete any 3 tasks today.',                          type: 'tasks',     target: 3,  reward: 60 },
  { id: 'tasks-5', title: 'Productive day',        description: 'Complete 5 tasks today.',                              type: 'tasks',     target: 5,  reward: 120 },
  { id: 'place-plant',     title: 'Bring nature in',    description: 'Place a plant in the office.',                    type: 'place',     target: 1,  reward: 30,  filter: 'wellness' },
  { id: 'place-meeting',   title: 'Make space to think', description: 'Add a meeting table or conference space.',       type: 'place',     target: 1,  reward: 40,  filter: 'tables' },
  { id: 'place-decor',     title: 'Brighten the walls', description: 'Add two decor items (art, lamps, etc.).',         type: 'place',     target: 2,  reward: 40,  filter: 'decor' },
  { id: 'org-dept',        title: 'Form a team',        description: 'Create a department in the Organization tab.',    type: 'org',       target: 1,  reward: 50 },
  { id: 'org-manager',     title: 'Assign a manager',   description: 'Set a reporting line for any agent.',             type: 'org',       target: 1,  reward: 40 },
  { id: 'capacity-full',   title: 'Everyone has a desk', description: 'Assign a desk to every active agent.',            type: 'capacity',  target: 1,  reward: 80 },
  { id: 'aesthetic-zone',  title: 'Zone the floor',     description: 'Create a zone covering at least 6 tiles.',        type: 'aesthetic', target: 6,  reward: 60 },
]

/**
 * Seed or refresh the daily quest set. Picks 3 random quests from the
 * catalogue (deterministic per-day so refresh doesn't reroll on every load).
 */
export function refreshDailyQuests(state: OfficeGamification | undefined, now: number = Date.now()): OfficeGamification {
  const base: OfficeGamification = state || { level: 1, xp: 0, dailyQuests: [], achievements: [] }
  const last = base.questsRefreshedAt ? Date.parse(base.questsRefreshedAt) : 0
  if (now - last < DAILY_QUEST_REFRESH_MS && base.dailyQuests.length > 0) {
    return base
  }
  // Roll a stable seed from the calendar day.
  const day = Math.floor(now / DAILY_QUEST_REFRESH_MS)
  const picked: OfficeQuest[] = []
  const pool = [...QUEST_TEMPLATES]
  let cursor = day
  while (picked.length < 3 && pool.length > 0) {
    cursor = (cursor * 9301 + 49297) % 233280
    const idx = cursor % pool.length
    const tpl = pool.splice(idx, 1)[0]
    picked.push({ ...tpl, progress: 0 })
  }
  return {
    ...base,
    dailyQuests: picked,
    questsRefreshedAt: new Date(now).toISOString(),
  }
}

/**
 * Update quest progress against the current state of the layout +
 * completed-task counters. Returns a new OfficeGamification with progress
 * fields updated and any newly-completed quests stamped + their reward XP
 * added.
 */
export function evaluateQuests(
  state: OfficeGamification,
  layout: OfficeLayout,
  completedTasksToday: number
): OfficeGamification {
  const out: OfficeGamification = { ...state, dailyQuests: [...state.dailyQuests] }
  for (let i = 0; i < out.dailyQuests.length; i++) {
    const q = out.dailyQuests[i]
    if (q.completedAt) continue
    const progress = computeQuestProgress(q, layout, completedTasksToday)
    const completedAt = progress >= q.target ? new Date().toISOString() : undefined
    out.dailyQuests[i] = { ...q, progress, completedAt }
    if (completedAt) out.xp = (out.xp || 0) + q.reward
  }
  // Re-derive level from new XP.
  const lvl = levelFromXp(out.xp)
  out.level = lvl.level
  return out
}

function computeQuestProgress(q: OfficeQuest, layout: OfficeLayout, completedTasksToday: number): number {
  switch (q.type) {
    case 'tasks':
      return completedTasksToday
    case 'place': {
      const matches = layout.tiles.filter((t) => {
        const asset = assetMap.get(t.assetId)
        if (!asset) return false
        if (q.filter && asset.category !== q.filter && asset.id !== q.filter) return false
        return true
      })
      return matches.length
    }
    case 'org': {
      if (q.id === 'org-dept') return (layout.org?.departments || []).length > 0 ? 1 : 0
      if (q.id === 'org-manager') return (layout.org?.reportingLines || []).length > 0 ? 1 : 0
      return 0
    }
    case 'capacity': {
      const agentsWithDesks = new Set(
        layout.tiles
          .filter((t) => assetMap.get(t.assetId)?.category === 'desks' && t.assignedAgentId)
          .map((t) => t.assignedAgentId as string)
      )
      // Quest target=1 just means "everyone has a desk" — we treat any agent
      // count match as 1.
      return agentsWithDesks.size > 0 ? 1 : 0
    }
    case 'aesthetic': {
      const totalZoneTiles = (layout.zones || []).reduce((sum, z) => sum + z.tiles.length, 0)
      return totalZoneTiles
    }
    default:
      return 0
  }
}

// ─── XP awards (called by the runner when a task completes) ──────────────

/** XP awarded when a task completes (cleanly). Lower for failures. */
export const XP_PER_COMPLETED_TASK = 25
export const XP_PER_WARNING_TASK = 15
export const XP_PER_FAILED_TASK = 5

export function awardTaskXp(state: OfficeGamification | undefined, outcome: 'completed' | 'warnings' | 'failed'): OfficeGamification {
  const base: OfficeGamification = state || { level: 1, xp: 0, dailyQuests: [], achievements: [] }
  const delta =
    outcome === 'completed' ? XP_PER_COMPLETED_TASK :
    outcome === 'warnings'  ? XP_PER_WARNING_TASK :
                              XP_PER_FAILED_TASK
  const xp = (base.xp || 0) + delta
  const lvl = levelFromXp(xp)
  return { ...base, xp, level: lvl.level }
}
