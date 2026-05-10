/**
 * office-templates.ts — 6 ready-made starter OfficeLayout presets
 * Grid: 30 wide × 20 tall. 1 tile = 50 cm.
 * Each template returns a fresh deep-copy so mutations don't bleed between uses.
 */

import { OfficeLayout, PlacedTile, OfficeZone } from './office-types'

export interface OfficeTemplate {
  id: string
  name: string
  description: string
  capacity: number      // approx people
  emoji: string
  tags: string[]
  layout: OfficeLayout
}

// ─── helpers ────────────────────────────────────────────────────────────────

let _uid = 0
function uid(prefix = 't'): string {
  return `${prefix}-${++_uid}-${Math.random().toString(36).slice(2, 7)}`
}

function tile(assetId: string, x: number, y: number, rotation = 0, opts: Partial<PlacedTile> = {}): PlacedTile {
  return { id: uid('tile'), assetId, x, y, rotation, ...opts }
}

function zone(name: string, color: string, tiles: Array<{ x: number; y: number }>): OfficeZone {
  return { id: uid('zone'), name, color, tiles }
}

// Fill a rectangular region with zone tiles
function zoneRect(x: number, y: number, w: number, h: number): Array<{ x: number; y: number }> {
  const t: Array<{ x: number; y: number }> = []
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      t.push({ x: col, y: row })
    }
  }
  return t
}

// ─── Template 1: Startup Garage ─────────────────────────────────────────────
// 10 people, fully open plan. Quick to set up, casual vibe.

function startupGarage(): OfficeLayout {
  const tiles: PlacedTile[] = []

  // Row 1 of desks (5 standard desks facing south)
  for (let i = 0; i < 5; i++) {
    tiles.push(tile('desk-standard', 2 + i * 4, 2))
    tiles.push(tile('chair-task', 3 + i * 4, 4, 180))
  }

  // Row 2 of desks (5 standard desks facing north)
  for (let i = 0; i < 5; i++) {
    tiles.push(tile('desk-standard', 2 + i * 4, 7, 180))
    tiles.push(tile('chair-task', 3 + i * 4, 6))
  }

  // Standing desk + tall stool in corner
  tiles.push(tile('desk-standing', 25, 2))
  tiles.push(tile('chair-task', 26, 4, 180))

  // Meeting area (bottom-right)
  tiles.push(tile('table-meeting-4', 19, 13))
  for (const [x, y, r] of [[19,12,180],[21,12,180],[19,15,0],[21,15,0]] as [number,number,number][]) {
    tiles.push(tile('chair-task', x, y, r))
  }

  // Whiteboard beside meeting area
  tiles.push(tile('whiteboard-small', 24, 13, 90))

  // Coffee corner (top-right)
  tiles.push(tile('coffee-machine', 26, 2))
  tiles.push(tile('table-coffee', 25, 5))

  // Plants
  tiles.push(tile('plant-large', 0, 0))
  tiles.push(tile('plant-small', 28, 0))
  tiles.push(tile('plant-small', 0, 18))
  tiles.push(tile('plant-large', 27, 17))

  // Sofa lounge (bottom-left)
  tiles.push(tile('sofa-2seat', 1, 14))
  tiles.push(tile('table-coffee', 3, 13))

  const zones: OfficeZone[] = [
    zone('Work Pods',     '#3B82F6', zoneRect(1, 1, 24, 10)),
    zone('Meeting',       '#8B5CF6', zoneRect(18, 12, 8, 5)),
    zone('Lounge',        '#10B981', zoneRect(0, 13, 9, 6)),
    zone('Kitchen',       '#F59E0B', zoneRect(24, 0, 6, 5)),
  ]

  return {
    version: 2, gridWidth: 30, gridHeight: 20,
    floorAssetId: 'floor-hardwood',
    tiles, zones, mcCredits: 0, ownedAssets: [],
  }
}

// ─── Template 2: Creative Studio ────────────────────────────────────────────
// 20 people. Clusters of 4 desks, large whiteboard wall, chill lounge.

function creativeStudio(): OfficeLayout {
  const tiles: PlacedTile[] = []

  // 5 clusters of 4 desks (pods)
  const clusters = [
    [1, 1], [8, 1], [15, 1], [22, 1],
    [4, 11],
  ]
  for (const [cx, cy] of clusters) {
    // 2 desks facing each other
    tiles.push(tile('desk-standard', cx, cy))
    tiles.push(tile('chair-task', cx + 1, cy + 2, 180))
    tiles.push(tile('desk-standard', cx, cy + 4, 180))
    tiles.push(tile('chair-task', cx + 1, cy + 3))

    // side desks
    tiles.push(tile('desk-standard', cx + 4, cy, 90))
    tiles.push(tile('chair-task', cx + 3, cy + 1, 270))
    tiles.push(tile('desk-standard', cx + 4, cy + 4, 270))
    tiles.push(tile('chair-task', cx + 3, cy + 3, 90))
  }

  // Whiteboard wall (left side)
  tiles.push(tile('whiteboard-large', 0, 3, 0))
  tiles.push(tile('whiteboard-large', 0, 8, 0))

  // Large meeting table (right side)
  tiles.push(tile('table-meeting-8', 19, 12))
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('chair-executive', 19 + i * 2, 11, 180))
    tiles.push(tile('chair-executive', 19 + i * 2, 15))
  }

  // Lounge
  tiles.push(tile('sofa-3seat', 1, 14))
  tiles.push(tile('sofa-2seat', 7, 14, 90))
  tiles.push(tile('table-coffee', 4, 16))
  tiles.push(tile('plant-large', 0, 14))
  tiles.push(tile('plant-large', 0, 18))

  // Kitchen
  tiles.push(tile('kitchen-counter', 24, 0, 0))
  tiles.push(tile('coffee-machine', 27, 0))
  tiles.push(tile('fridge-mini', 28, 2))

  // Plants scattered
  tiles.push(tile('plant-small', 14, 0))
  tiles.push(tile('plant-small', 21, 0))
  tiles.push(tile('plant-large', 28, 14))
  tiles.push(tile('plant-small', 28, 18))

  const zones: OfficeZone[] = [
    zone('Studio Floor',  '#6366F1', zoneRect(0, 0, 28, 10)),
    zone('Collab Zone',   '#8B5CF6', zoneRect(4, 10, 25, 8)),
    zone('Lounge',        '#10B981', zoneRect(0, 12, 10, 8)),
    zone('Kitchen',       '#F59E0B', zoneRect(23, 0, 7, 6)),
  ]

  return {
    version: 2, gridWidth: 30, gridHeight: 20,
    floorAssetId: 'floor-concrete',
    tiles, zones, mcCredits: 0, ownedAssets: [],
  }
}

// ─── Template 3: Scale-up ────────────────────────────────────────────────────
// 30 people. 3 department rows, 2 meeting rooms, HR corner.

function scaleUp(): OfficeLayout {
  const tiles: PlacedTile[] = []

  // Engineering row (top) — 12 desks
  for (let i = 0; i < 6; i++) {
    tiles.push(tile('desk-standard', 1 + i * 4, 1))
    tiles.push(tile('chair-task', 2 + i * 4, 3, 180))
    tiles.push(tile('desk-standard', 1 + i * 4, 4, 180))
    tiles.push(tile('chair-task', 2 + i * 4, 3))
  }

  // Marketing row (middle) — 10 desks
  for (let i = 0; i < 5; i++) {
    tiles.push(tile('desk-standing', 1 + i * 4, 8))
    tiles.push(tile('chair-task', 2 + i * 4, 10, 180))
    tiles.push(tile('desk-standing', 1 + i * 4, 11, 180))
    tiles.push(tile('chair-task', 2 + i * 4, 10))
  }

  // Ops row (bottom) — 8 desks
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('desk-standard', 1 + i * 4, 15))
    tiles.push(tile('chair-task', 2 + i * 4, 17, 180))
    tiles.push(tile('desk-standard', 1 + i * 4, 18, 180))
    tiles.push(tile('chair-task', 2 + i * 4, 17))
  }

  // Meeting room 1 (right-top)
  tiles.push(tile('table-meeting-8', 22, 1))
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('chair-executive', 22 + i * 2, 0, 180))
    tiles.push(tile('chair-executive', 22 + i * 2, 4))
  }
  tiles.push(tile('whiteboard-small', 28, 2, 90))

  // Meeting room 2 (right-bottom)
  tiles.push(tile('table-meeting-4', 23, 10))
  for (const [x, y, r] of [[23,9,180],[25,9,180],[23,12,0],[25,12,0]] as [number,number,number][]) {
    tiles.push(tile('chair-task', x, y, r))
  }
  tiles.push(tile('whiteboard-small', 28, 10, 90))

  // HR / executive corner
  tiles.push(tile('desk-executive', 22, 15))
  tiles.push(tile('chair-executive', 24, 17, 180))
  tiles.push(tile('cabinet-filing', 27, 15))
  tiles.push(tile('cabinet-filing', 27, 16))

  // Kitchen
  tiles.push(tile('kitchen-counter', 16, 7, 0))
  tiles.push(tile('coffee-machine', 19, 7))
  tiles.push(tile('fridge-mini', 20, 7))

  // Plants + decor
  tiles.push(tile('plant-large', 0, 0))
  tiles.push(tile('plant-large', 0, 18))
  tiles.push(tile('plant-small', 29, 0))
  tiles.push(tile('plant-small', 29, 19))

  const zones: OfficeZone[] = [
    zone('Engineering',   '#3B82F6', zoneRect(0, 0, 21, 7)),
    zone('Marketing',     '#EC4899', zoneRect(0, 7, 21, 7)),
    zone('Operations',    '#F59E0B', zoneRect(0, 14, 18, 6)),
    zone('Meeting Rooms', '#8B5CF6', zoneRect(21, 0, 9, 13)),
    zone('Executive',     '#10B981', zoneRect(21, 14, 9, 6)),
  ]

  return {
    version: 2, gridWidth: 30, gridHeight: 20,
    floorAssetId: 'floor-carpet',
    tiles, zones, mcCredits: 0, ownedAssets: [],
  }
}

// ─── Template 4: Tech Company ────────────────────────────────────────────────
// 40 people. Dense engineering floor + server room + 3 meeting rooms.

function techCompany(): OfficeLayout {
  const tiles: PlacedTile[] = []

  // Main engineering floor — 5 rows × 4 pairs = 40 desks
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 1 + col * 4
      const y = 1 + row * 4
      tiles.push(tile('desk-standard', x, y))
      tiles.push(tile('chair-task', x + 1, y + 2, 180))
      tiles.push(tile('desk-standard', x, y + 2, 180))
      tiles.push(tile('chair-task', x + 1, y + 1))
    }
  }

  // Standing desk row (rightmost column)
  for (let row = 0; row < 4; row++) {
    tiles.push(tile('desk-standing', 22, 1 + row * 4))
    tiles.push(tile('chair-task', 23, 1 + row * 4 + 2, 180))
  }

  // Server room (right side)
  tiles.push(tile('server-rack', 25, 1))
  tiles.push(tile('server-rack', 25, 3))
  tiles.push(tile('server-rack', 25, 5))
  tiles.push(tile('server-rack', 27, 1))
  tiles.push(tile('server-rack', 27, 3))
  tiles.push(tile('server-rack', 27, 5))

  // Three small meeting pods (bottom)
  for (let i = 0; i < 3; i++) {
    const mx = 1 + i * 9
    tiles.push(tile('table-meeting-4', mx, 14))
    tiles.push(tile('chair-executive', mx,     13, 180))
    tiles.push(tile('chair-executive', mx + 2, 13, 180))
    tiles.push(tile('chair-executive', mx,     16))
    tiles.push(tile('chair-executive', mx + 2, 16))
    tiles.push(tile('whiteboard-small', mx + 4, 14, 90))
  }

  // Kitchen / break area
  tiles.push(tile('kitchen-counter', 24, 12))
  tiles.push(tile('coffee-machine', 27, 12))
  tiles.push(tile('fridge-mini',    28, 12))
  tiles.push(tile('table-coffee',   25, 14))
  tiles.push(tile('sofa-2seat',     24, 16))

  // Plants
  tiles.push(tile('plant-large', 0, 0))
  tiles.push(tile('plant-large', 0, 17))
  tiles.push(tile('plant-small', 29, 8))
  tiles.push(tile('plant-small', 29, 19))

  const zones: OfficeZone[] = [
    zone('Engineering Floor', '#3B82F6', zoneRect(0, 0, 24, 13)),
    zone('Server Room',       '#1E293B', zoneRect(24, 0, 6, 11)),
    zone('Meeting Pods',      '#8B5CF6', zoneRect(0, 13, 21, 7)),
    zone('Break Area',        '#10B981', zoneRect(23, 11, 7, 9)),
  ]

  return {
    version: 2, gridWidth: 30, gridHeight: 20,
    floorAssetId: 'floor-concrete',
    tiles, zones, mcCredits: 0, ownedAssets: [],
  }
}

// ─── Template 5: Corporate Floor ─────────────────────────────────────────────
// 60 people. Formal layout: private offices along walls, open plan in centre.

function corporateFloor(): OfficeLayout {
  const tiles: PlacedTile[] = []

  // Open plan centre — 6 rows × 4 desks = 48 workstations
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 5 + col * 4
      const y = 2 + row * 3
      tiles.push(tile('desk-standard', x, y))
      tiles.push(tile('chair-task', x + 1, y + 1, 180))
    }
  }

  // Left wall — 4 executive offices
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('desk-executive', 0, 1 + i * 4, 90))
    tiles.push(tile('chair-executive', 2, 2 + i * 4, 270))
    tiles.push(tile('cabinet-filing', 0, 3 + i * 4))
  }

  // Top row — 4 director offices
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('desk-executive', 5 + i * 5, 0))
    tiles.push(tile('chair-executive', 6 + i * 5, 2, 180))
  }

  // Right side — 2 large meeting rooms
  tiles.push(tile('table-meeting-12', 22, 1))
  for (let i = 0; i < 6; i++) {
    tiles.push(tile('chair-executive', 22 + (i < 4 ? i * 1 : 0), i < 4 ? 0 : i - 4, i < 4 ? 180 : 90))
  }

  tiles.push(tile('table-meeting-8', 22, 10))
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('chair-executive', 22 + i * 2, 9,  180))
    tiles.push(tile('chair-executive', 22 + i * 2, 13))
  }
  tiles.push(tile('whiteboard-large', 29, 1, 90))
  tiles.push(tile('whiteboard-small', 29, 10, 90))

  // Bottom — reception + lounge
  tiles.push(tile('sofa-3seat', 5, 17))
  tiles.push(tile('sofa-2seat', 11, 17, 90))
  tiles.push(tile('table-coffee', 9,  18))
  tiles.push(tile('plant-large', 3,  16))
  tiles.push(tile('plant-large', 16, 16))

  // Kitchen
  tiles.push(tile('kitchen-counter', 17, 0))
  tiles.push(tile('coffee-machine',  20, 0))
  tiles.push(tile('fridge-mini',     21, 0))

  // Storage wall
  for (let i = 0; i < 3; i++) {
    tiles.push(tile('cabinet-storage', 22, 15 + i))
  }

  // Plants
  tiles.push(tile('plant-small', 0,  0))
  tiles.push(tile('plant-small', 29, 19))
  tiles.push(tile('plant-large', 0,  18))

  const zones: OfficeZone[] = [
    zone('Executive Suite',   '#1E293B', zoneRect(0, 0, 5, 16)),
    zone('Director Offices',  '#334155', zoneRect(5, 0, 16, 2)),
    zone('Open Plan',         '#3B82F6', zoneRect(5, 2, 17, 14)),
    zone('Board Room',        '#7C3AED', zoneRect(22, 0, 8, 9)),
    zone('Meeting Room',      '#8B5CF6', zoneRect(22, 9, 8, 7)),
    zone('Reception & Lobby', '#10B981', zoneRect(3, 16, 19, 4)),
  ]

  return {
    version: 2, gridWidth: 30, gridHeight: 20,
    floorAssetId: 'floor-carpet',
    tiles, zones, mcCredits: 0, ownedAssets: [],
  }
}

// ─── Template 6: Coworking Space ─────────────────────────────────────────────
// Mixed community office: hot desks, phone booths, lounge zones, event space.

function coworkingSpace(): OfficeLayout {
  const tiles: PlacedTile[] = []

  // Hot desk island A (top-left)
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('desk-standard', 1 + i * 4, 1))
    tiles.push(tile('chair-task', 2 + i * 4, 3, 180))
  }

  // Hot desk island B (facing back)
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('desk-standard', 1 + i * 4, 5, 180))
    tiles.push(tile('chair-task', 2 + i * 4, 4))
  }

  // Standing desks row
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('desk-standing', 18 + i * 2, 1))
    tiles.push(tile('chair-task', 18 + i * 2, 3, 180))
  }

  // Phone booths / focus pods (right wall)
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('desk-standard', 26, 1 + i * 3, 90))
    tiles.push(tile('chair-task', 25, 2 + i * 3, 270))
  }

  // Lounge A (centre-bottom)
  tiles.push(tile('sofa-3seat', 3, 13))
  tiles.push(tile('sofa-3seat', 10, 13, 180))
  tiles.push(tile('sofa-2seat', 3, 11, 0))
  tiles.push(tile('table-coffee', 7, 13))
  tiles.push(tile('plant-large', 1, 12))
  tiles.push(tile('plant-large', 15, 12))

  // Large collab / event table
  tiles.push(tile('table-meeting-12', 3, 7))
  for (let i = 0; i < 6; i++) {
    tiles.push(tile('chair-task', 3 + i * 2, 6,  180))
    tiles.push(tile('chair-task', 3 + i * 2, 10))
  }

  // Whiteboard wall
  tiles.push(tile('whiteboard-large', 0, 7))
  tiles.push(tile('whiteboard-small', 0, 12))

  // Kitchen / cafe bar
  tiles.push(tile('kitchen-counter', 17, 8))
  tiles.push(tile('coffee-machine',  20, 8))
  tiles.push(tile('fridge-mini',     21, 8))
  tiles.push(tile('table-meeting-4', 18, 11))
  for (const [x, y, r] of [[18,10,180],[20,10,180],[18,13,0],[20,13,0]] as [number,number,number][]) {
    tiles.push(tile('chair-task', x, y, r))
  }

  // Storage / lockers row
  for (let i = 0; i < 4; i++) {
    tiles.push(tile('cabinet-storage', 22 + i, 17))
  }

  // Lounge B (right-bottom)
  tiles.push(tile('sofa-2seat', 22, 13))
  tiles.push(tile('sofa-2seat', 22, 15, 180))
  tiles.push(tile('table-coffee', 24, 14))
  tiles.push(tile('plant-large', 28, 12))
  tiles.push(tile('plant-small', 28, 17))

  // Plants
  tiles.push(tile('plant-small', 0,  0))
  tiles.push(tile('plant-small', 16, 0))
  tiles.push(tile('plant-large', 0,  18))
  tiles.push(tile('plant-small', 29, 0))
  tiles.push(tile('plant-small', 29, 19))

  const zones: OfficeZone[] = [
    zone('Hot Desks',       '#3B82F6', zoneRect(0, 0, 17, 7)),
    zone('Focus Pods',      '#6366F1', zoneRect(24, 0, 6, 13)),
    zone('Standing Zone',   '#0EA5E9', zoneRect(17, 0, 7, 7)),
    zone('Collab Table',    '#8B5CF6', zoneRect(2, 6, 15, 5)),
    zone('Community Lounge',  '#10B981', zoneRect(1, 11, 20, 9)),
    zone('Café & Kitchen',  '#F59E0B', zoneRect(16, 7, 8, 8)),
    zone('Lounge B',        '#EC4899', zoneRect(21, 12, 9, 8)),
  ]

  return {
    version: 2, gridWidth: 30, gridHeight: 20,
    floorAssetId: 'floor-hardwood',
    tiles, zones, mcCredits: 0, ownedAssets: [],
  }
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const OFFICE_TEMPLATES: OfficeTemplate[] = [
  {
    id: 'startup-garage',
    name: 'Startup Garage',
    description: 'Open-plan for 10. Fast to set up, no private offices — energy and ideas flow freely.',
    capacity: 10,
    emoji: '🚀',
    tags: ['open plan', 'small team', 'casual'],
    layout: startupGarage(),
  },
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    description: 'Cluster pods for 20 creatives with a big whiteboard wall and chill lounge zone.',
    capacity: 20,
    emoji: '🎨',
    tags: ['creative', 'collaborative', 'lounge'],
    layout: creativeStudio(),
  },
  {
    id: 'scale-up',
    name: 'Scale-up',
    description: 'Three department rows for 30 people with dedicated meeting rooms and a shared kitchen.',
    capacity: 30,
    emoji: '📈',
    tags: ['departments', 'structured', 'meeting rooms'],
    layout: scaleUp(),
  },
  {
    id: 'tech-company',
    name: 'Tech Company',
    description: 'Dense engineering floor for 40 with a server room, three huddle pods, and a break area.',
    capacity: 40,
    emoji: '💻',
    tags: ['engineering', 'server room', 'dense'],
    layout: techCompany(),
  },
  {
    id: 'corporate-floor',
    name: 'Corporate Floor',
    description: 'Formal layout for 60: executive offices along walls, open plan centre, boardroom, reception.',
    capacity: 60,
    emoji: '🏢',
    tags: ['corporate', 'executive offices', 'boardroom'],
    layout: corporateFloor(),
  },
  {
    id: 'coworking-space',
    name: 'Coworking Space',
    description: 'Mixed hot desks, focus pods, a community lounge, café bar, and event table.',
    capacity: 50,
    emoji: '🤝',
    tags: ['hot desks', 'community', 'flexible'],
    layout: coworkingSpace(),
  },
]

/** Return a deep-copy of a template layout (safe to mutate) */
export function getTemplateLayout(templateId: string): OfficeLayout | null {
  const tpl = OFFICE_TEMPLATES.find(t => t.id === templateId)
  if (!tpl) return null
  return JSON.parse(JSON.stringify(tpl.layout)) as OfficeLayout
}
