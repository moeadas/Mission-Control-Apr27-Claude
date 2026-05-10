/**
 * office-assets.ts
 *
 * Top-down SVG furniture catalog for the Virtual Office Builder.
 * Each asset renders as a clean top-down illustration on the tile grid.
 *
 * Tiers:
 *   'free'    — available to all users
 *   'premium' — requires MC Credits (or superadmin role)
 *
 * Size: [w, h] in grid tiles. Each tile = 52×52 px.
 */

export type AssetCategory = 'floors' | 'desks' | 'chairs' | 'tables' | 'decor' | 'walls'
export type AssetTier = 'free' | 'premium'

export interface OfficeFurnitureAsset {
  id: string
  name: string
  category: AssetCategory
  tier: AssetTier
  price?: number          // MC Credits cost (premium only)
  size: [number, number]  // [cols, rows]
  svg: string             // raw SVG string (viewBox="0 0 W H" where W=52*cols H=52*rows)
  description?: string
}

// ─── Helper to inline-size SVGs consistently ────────────────────────────────
const T = 52 // tile size in px

// ─── FLOOR TILES (1×1) ──────────────────────────────────────────────────────

const floorHardwood: OfficeFurnitureAsset = {
  id: 'floor-hardwood',
  name: 'Hardwood Floor',
  category: 'floors',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <rect width="52" height="52" fill="#d4a96a"/>
    <line x1="0" y1="13" x2="52" y2="13" stroke="#c49458" stroke-width="0.8" opacity="0.6"/>
    <line x1="0" y1="26" x2="52" y2="26" stroke="#c49458" stroke-width="0.8" opacity="0.6"/>
    <line x1="0" y1="39" x2="52" y2="39" stroke="#c49458" stroke-width="0.8" opacity="0.6"/>
    <line x1="13" y1="0" x2="13" y2="13" stroke="#c49458" stroke-width="0.5" opacity="0.4"/>
    <line x1="39" y1="13" x2="39" y2="26" stroke="#c49458" stroke-width="0.5" opacity="0.4"/>
    <line x1="13" y1="26" x2="13" y2="39" stroke="#c49458" stroke-width="0.5" opacity="0.4"/>
    <line x1="39" y1="39" x2="39" y2="52" stroke="#c49458" stroke-width="0.5" opacity="0.4"/>
  </svg>`,
}

const floorCarpetBlue: OfficeFurnitureAsset = {
  id: 'floor-carpet-blue',
  name: 'Blue Carpet',
  category: 'floors',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <rect width="52" height="52" fill="#3b5bdb"/>
    <rect width="52" height="52" fill="url(#carpet)" opacity="0.3"/>
    <defs>
      <pattern id="carpet" width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.8" fill="#fff" opacity="0.4"/>
      </pattern>
    </defs>
  </svg>`,
}

const floorConcrete: OfficeFurnitureAsset = {
  id: 'floor-concrete',
  name: 'Concrete',
  category: 'floors',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <rect width="52" height="52" fill="#94a3b8"/>
    <line x1="0" y1="26" x2="52" y2="26" stroke="#7f8ea3" stroke-width="0.6" opacity="0.5"/>
    <line x1="26" y1="0" x2="26" y2="52" stroke="#7f8ea3" stroke-width="0.6" opacity="0.5"/>
  </svg>`,
}

const floorWhiteTile: OfficeFurnitureAsset = {
  id: 'floor-white-tile',
  name: 'White Tile',
  category: 'floors',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <rect width="52" height="52" fill="#f8fafc"/>
    <rect x="1" y="1" width="23" height="23" rx="1" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8"/>
    <rect x="28" y="1" width="23" height="23" rx="1" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8"/>
    <rect x="1" y="28" width="23" height="23" rx="1" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8"/>
    <rect x="28" y="28" width="23" height="23" rx="1" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8"/>
  </svg>`,
}

const floorDarkwood: OfficeFurnitureAsset = {
  id: 'floor-darkwood',
  name: 'Dark Oak',
  category: 'floors',
  tier: 'premium',
  price: 80,
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <rect width="52" height="52" fill="#5c3d1e"/>
    <line x1="0" y1="13" x2="52" y2="13" stroke="#4a2f14" stroke-width="1" opacity="0.7"/>
    <line x1="0" y1="26" x2="52" y2="26" stroke="#4a2f14" stroke-width="1" opacity="0.7"/>
    <line x1="0" y1="39" x2="52" y2="39" stroke="#4a2f14" stroke-width="1" opacity="0.7"/>
    <line x1="26" y1="0" x2="26" y2="13" stroke="#4a2f14" stroke-width="0.6" opacity="0.4"/>
    <line x1="10" y1="13" x2="10" y2="26" stroke="#4a2f14" stroke-width="0.6" opacity="0.4"/>
    <line x1="42" y1="26" x2="42" y2="39" stroke="#4a2f14" stroke-width="0.6" opacity="0.4"/>
    <line x1="20" y1="39" x2="20" y2="52" stroke="#4a2f14" stroke-width="0.6" opacity="0.4"/>
  </svg>`,
}

const floorGrass: OfficeFurnitureAsset = {
  id: 'floor-grass',
  name: 'Rooftop Grass',
  category: 'floors',
  tier: 'premium',
  price: 120,
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <rect width="52" height="52" fill="#4ade80"/>
    <rect width="52" height="52" fill="url(#grass)" opacity="0.4"/>
    <defs>
      <pattern id="grass" width="6" height="6" patternUnits="userSpaceOnUse">
        <line x1="3" y1="6" x2="3" y2="2" stroke="#22c55e" stroke-width="1.2" stroke-linecap="round"/>
        <line x1="1" y1="6" x2="0.5" y2="3" stroke="#16a34a" stroke-width="0.8" stroke-linecap="round"/>
        <line x1="5" y1="6" x2="5.5" y2="3" stroke="#16a34a" stroke-width="0.8" stroke-linecap="round"/>
      </pattern>
    </defs>
  </svg>`,
}

// ─── DESKS (2×1 unless noted) ────────────────────────────────────────────────

const deskBasic: OfficeFurnitureAsset = {
  id: 'desk-basic',
  name: 'Basic Desk',
  category: 'desks',
  tier: 'free',
  size: [2, 1],
  svg: `<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Desk surface -->
    <rect x="4" y="8" width="96" height="36" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
    <!-- Desk top edge highlight -->
    <rect x="4" y="8" width="96" height="8" rx="4" fill="#f1f5f9"/>
    <!-- Monitor -->
    <rect x="28" y="14" width="22" height="16" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <rect x="37" y="30" width="4" height="6" fill="#334155"/>
    <!-- Keyboard -->
    <rect x="34" y="32" width="18" height="6" rx="1" fill="#64748b"/>
    <!-- Mouse -->
    <ellipse cx="57" cy="35" rx="3" ry="4" fill="#64748b"/>
    <!-- Pencil cup -->
    <rect x="72" y="15" width="10" height="12" rx="2" fill="#7c3aed" opacity="0.7"/>
    <!-- Legs -->
    <rect x="6" y="42" width="5" height="6" rx="1" fill="#94a3b8"/>
    <rect x="93" y="42" width="5" height="6" rx="1" fill="#94a3b8"/>
  </svg>`,
}

const deskStanding: OfficeFurnitureAsset = {
  id: 'desk-standing',
  name: 'Standing Desk',
  category: 'desks',
  tier: 'free',
  size: [2, 1],
  svg: `<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Frame / column -->
    <rect x="4" y="6" width="96" height="40" rx="4" fill="#dbeafe" stroke="#60a5fa" stroke-width="1.5"/>
    <rect x="4" y="6" width="96" height="9" rx="4" fill="#eff6ff"/>
    <!-- Adjustment column indicator -->
    <rect x="48" y="40" width="8" height="6" rx="1" fill="#93c5fd"/>
    <!-- Monitor - ultrawide -->
    <rect x="14" y="12" width="34" height="20" rx="2" fill="#0f172a" stroke="#1e40af" stroke-width="1"/>
    <rect x="28" y="32" width="6" height="4" fill="#1e40af"/>
    <!-- Laptop -->
    <rect x="56" y="18" width="20" height="14" rx="2" fill="#1e293b" stroke="#3b82f6" stroke-width="1"/>
    <rect x="57" y="19" width="18" height="11" rx="1" fill="#1e3a5f"/>
    <!-- Plant pot -->
    <ellipse cx="86" cy="26" rx="6" ry="8" fill="#16a34a" opacity="0.8"/>
    <rect x="82" y="32" width="8" height="6" rx="2" fill="#92400e"/>
    <!-- Height indicator arrows -->
    <text x="46" y="48" font-size="7" fill="#3b82f6" font-family="sans-serif">↕</text>
  </svg>`,
}

const deskL: OfficeFurnitureAsset = {
  id: 'desk-l-shape',
  name: 'L-Shape Desk',
  category: 'desks',
  tier: 'free',
  size: [3, 2],
  svg: `<svg viewBox="0 0 156 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Horizontal arm -->
    <rect x="4" y="4" width="148" height="44" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
    <!-- Vertical arm -->
    <rect x="4" y="48" width="72" height="52" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
    <!-- Highlight top -->
    <rect x="4" y="4" width="148" height="8" rx="4" fill="#f1f5f9"/>
    <!-- Monitor -->
    <rect x="52" y="10" width="28" height="20" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <rect x="63" y="30" width="6" height="8" fill="#334155"/>
    <!-- Second monitor -->
    <rect x="92" y="10" width="24" height="18" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <!-- Keyboard on vertical arm -->
    <rect x="12" y="74" width="40" height="14" rx="2" fill="#64748b"/>
    <!-- Mouse -->
    <ellipse cx="62" cy="81" rx="5" ry="6" fill="#64748b"/>
    <!-- Legs -->
    <rect x="6" y="48" width="5" height="5" rx="1" fill="#94a3b8"/>
    <rect x="147" y="42" width="5" height="5" rx="1" fill="#94a3b8"/>
    <rect x="70" y="94" width="5" height="5" rx="1" fill="#94a3b8"/>
  </svg>`,
}

const deskExecutive: OfficeFurnitureAsset = {
  id: 'desk-executive',
  name: 'Executive Desk',
  category: 'desks',
  tier: 'premium',
  price: 200,
  size: [3, 1],
  svg: `<svg viewBox="0 0 156 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Rich mahogany surface -->
    <rect x="4" y="6" width="148" height="40" rx="6" fill="#7c2d12" stroke="#92400e" stroke-width="1.5"/>
    <rect x="4" y="6" width="148" height="10" rx="6" fill="#9a3412" opacity="0.7"/>
    <!-- Leather pad -->
    <rect x="44" y="16" width="68" height="22" rx="3" fill="#1e3a5f"/>
    <!-- Dual monitors -->
    <rect x="10" y="10" width="22" height="16" rx="2" fill="#0f172a" stroke="#7c3aed" stroke-width="1"/>
    <rect x="14" y="26" width="14" height="4" fill="#4c1d95"/>
    <rect x="36" y="10" width="22" height="16" rx="2" fill="#0f172a" stroke="#7c3aed" stroke-width="1"/>
    <rect x="40" y="26" width="14" height="4" fill="#4c1d95"/>
    <!-- Nameplate -->
    <rect x="64" y="38" width="28" height="5" rx="1" fill="#b45309"/>
    <!-- Phone -->
    <rect x="122" y="12" width="16" height="20" rx="2" fill="#1e293b"/>
    <rect x="124" y="14" width="12" height="10" rx="1" fill="#1e3a5f"/>
    <!-- Trophy / award -->
    <path d="M106 12 L112 12 L112 22 L109 26 L106 22 Z" fill="#fbbf24" stroke="#d97706" stroke-width="0.8"/>
    <!-- Gold accents on desk -->
    <rect x="4" y="44" width="148" height="2" rx="1" fill="#d97706" opacity="0.5"/>
  </svg>`,
}

const deskPod: OfficeFurnitureAsset = {
  id: 'desk-pod',
  name: 'Hot Desk Pod',
  category: 'desks',
  tier: 'free',
  size: [2, 2],
  svg: `<svg viewBox="0 0 104 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Circular pod desk -->
    <circle cx="52" cy="52" r="46" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
    <circle cx="52" cy="52" r="36" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
    <!-- North station -->
    <rect x="38" y="14" width="28" height="16" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <rect x="48" y="30" width="8" height="4" fill="#334155"/>
    <!-- South station -->
    <rect x="38" y="74" width="28" height="16" rx="2" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <rect x="48" y="70" width="8" height="4" fill="#334155"/>
    <!-- Hub center -->
    <circle cx="52" cy="52" r="10" fill="#7c3aed" opacity="0.8"/>
    <circle cx="52" cy="52" r="6" fill="#a78bfa"/>
  </svg>`,
}

// ─── CHAIRS (1×1) ────────────────────────────────────────────────────────────

const chairBasic: OfficeFurnitureAsset = {
  id: 'chair-basic',
  name: 'Office Chair',
  category: 'chairs',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Base star -->
    <circle cx="26" cy="40" r="10" fill="#475569" opacity="0.4"/>
    <line x1="26" y1="40" x2="14" y2="46" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="26" y1="40" x2="38" y2="46" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="26" y1="40" x2="14" y2="34" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="26" y1="40" x2="38" y2="34" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="26" y1="40" x2="26" y2="48" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Seat -->
    <ellipse cx="26" cy="30" rx="14" ry="10" fill="#3b82f6"/>
    <ellipse cx="26" cy="29" rx="12" ry="8" fill="#60a5fa"/>
    <!-- Back -->
    <rect x="16" y="8" width="20" height="18" rx="4" fill="#2563eb"/>
    <rect x="18" y="10" width="16" height="14" rx="3" fill="#3b82f6"/>
    <!-- Armrests -->
    <rect x="8" y="18" width="7" height="3" rx="1.5" fill="#1d4ed8"/>
    <rect x="37" y="18" width="7" height="3" rx="1.5" fill="#1d4ed8"/>
  </svg>`,
}

const chairTask: OfficeFurnitureAsset = {
  id: 'chair-task',
  name: 'Task Chair',
  category: 'chairs',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Wheels -->
    <circle cx="18" cy="46" r="3" fill="#374151"/>
    <circle cx="34" cy="46" r="3" fill="#374151"/>
    <circle cx="12" cy="40" r="3" fill="#374151"/>
    <circle cx="40" cy="40" r="3" fill="#374151"/>
    <!-- Base -->
    <ellipse cx="26" cy="42" rx="14" ry="6" fill="#4b5563" opacity="0.6"/>
    <!-- Seat -->
    <ellipse cx="26" cy="32" rx="13" ry="9" fill="#111827"/>
    <ellipse cx="26" cy="31" rx="11" ry="7" fill="#1f2937"/>
    <!-- Back rest -->
    <rect x="18" y="10" width="16" height="18" rx="3" fill="#111827"/>
    <rect x="20" y="12" width="12" height="14" rx="2" fill="#1f2937"/>
    <!-- Lumbar curve -->
    <path d="M20 20 Q26 24 32 20" stroke="#374151" stroke-width="1.5" fill="none"/>
  </svg>`,
}

const chairSofa: OfficeFurnitureAsset = {
  id: 'chair-sofa',
  name: 'Lounge Sofa',
  category: 'chairs',
  tier: 'free',
  size: [2, 1],
  svg: `<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Sofa base -->
    <rect x="4" y="20" width="96" height="28" rx="6" fill="#7c3aed"/>
    <!-- Cushions -->
    <rect x="8" y="16" width="40" height="28" rx="5" fill="#8b5cf6"/>
    <rect x="56" y="16" width="40" height="28" rx="5" fill="#8b5cf6"/>
    <!-- Back rest -->
    <rect x="4" y="8" width="96" height="14" rx="5" fill="#6d28d9"/>
    <!-- Arms -->
    <rect x="4" y="12" width="10" height="32" rx="4" fill="#5b21b6"/>
    <rect x="90" y="12" width="10" height="32" rx="4" fill="#5b21b6"/>
    <!-- Cushion highlights -->
    <rect x="10" y="18" width="36" height="8" rx="3" fill="#a78bfa" opacity="0.4"/>
    <rect x="58" y="18" width="36" height="8" rx="3" fill="#a78bfa" opacity="0.4"/>
    <!-- Legs -->
    <rect x="10" y="46" width="6" height="5" rx="1" fill="#4c1d95"/>
    <rect x="88" y="46" width="6" height="5" rx="1" fill="#4c1d95"/>
  </svg>`,
}

const chairBeanBag: OfficeFurnitureAsset = {
  id: 'chair-beanbag',
  name: 'Bean Bag',
  category: 'chairs',
  tier: 'premium',
  price: 60,
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Shadow -->
    <ellipse cx="26" cy="44" rx="18" ry="6" fill="#000" opacity="0.15"/>
    <!-- Bean bag body -->
    <ellipse cx="26" cy="30" rx="20" ry="18" fill="#f97316"/>
    <ellipse cx="26" cy="28" rx="18" ry="15" fill="#fb923c"/>
    <!-- Highlight -->
    <ellipse cx="20" cy="22" rx="7" ry="5" fill="#fed7aa" opacity="0.5"/>
    <!-- Tie at top -->
    <circle cx="26" cy="14" r="4" fill="#ea580c"/>
    <line x1="22" y1="12" x2="30" y2="16" stroke="#c2410c" stroke-width="1.5"/>
  </svg>`,
}

// ─── TABLES ──────────────────────────────────────────────────────────────────

const tableMeetingRound: OfficeFurnitureAsset = {
  id: 'table-meeting-round',
  name: 'Round Meeting Table',
  category: 'tables',
  tier: 'free',
  size: [2, 2],
  svg: `<svg viewBox="0 0 104 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Shadow -->
    <ellipse cx="52" cy="56" rx="44" ry="8" fill="#000" opacity="0.1"/>
    <!-- Table surface -->
    <circle cx="52" cy="50" r="42" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
    <circle cx="52" cy="50" r="38" fill="#e2e8f0"/>
    <!-- Table center detail -->
    <circle cx="52" cy="50" r="10" fill="#cbd5e1" opacity="0.6"/>
    <!-- Seats around -->
    <rect x="40" y="6" width="24" height="12" rx="6" fill="#60a5fa"/>
    <rect x="40" y="86" width="24" height="12" rx="6" fill="#60a5fa"/>
    <rect x="4" y="38" width="12" height="24" rx="6" fill="#60a5fa"/>
    <rect x="88" y="38" width="12" height="24" rx="6" fill="#60a5fa"/>
    <!-- Diagonal seats -->
    <rect x="14" y="12" width="16" height="10" rx="5" transform="rotate(45 22 17)" fill="#93c5fd"/>
    <rect x="74" y="12" width="16" height="10" rx="5" transform="rotate(-45 82 17)" fill="#93c5fd"/>
    <rect x="14" y="82" width="16" height="10" rx="5" transform="rotate(-45 22 87)" fill="#93c5fd"/>
    <rect x="74" y="82" width="16" height="10" rx="5" transform="rotate(45 82 87)" fill="#93c5fd"/>
    <!-- Leg -->
    <circle cx="52" cy="50" r="4" fill="#94a3b8"/>
  </svg>`,
}

const tableMeetingRect: OfficeFurnitureAsset = {
  id: 'table-meeting-rect',
  name: 'Boardroom Table',
  category: 'tables',
  tier: 'premium',
  price: 180,
  size: [4, 2],
  svg: `<svg viewBox="0 0 208 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Table surface -->
    <rect x="8" y="16" width="192" height="72" rx="8" fill="#1e293b" stroke="#334155" stroke-width="2"/>
    <rect x="10" y="18" width="188" height="68" rx="7" fill="#0f172a"/>
    <!-- Glass sheen -->
    <rect x="10" y="18" width="188" height="20" rx="7" fill="#ffffff" opacity="0.04"/>
    <!-- Center piece -->
    <rect x="70" y="44" width="68" height="16" rx="4" fill="#1e3a5f"/>
    <circle cx="104" cy="52" r="6" fill="#3b82f6" opacity="0.6"/>
    <!-- Seats top -->
    <rect x="20" y="4" width="22" height="10" rx="5" fill="#475569"/>
    <rect x="52" y="4" width="22" height="10" rx="5" fill="#475569"/>
    <rect x="84" y="4" width="22" height="10" rx="5" fill="#475569"/>
    <rect x="116" y="4" width="22" height="10" rx="5" fill="#475569"/>
    <rect x="148" y="4" width="22" height="10" rx="5" fill="#475569"/>
    <!-- Seats bottom -->
    <rect x="20" y="90" width="22" height="10" rx="5" fill="#475569"/>
    <rect x="52" y="90" width="22" height="10" rx="5" fill="#475569"/>
    <rect x="84" y="90" width="22" height="10" rx="5" fill="#475569"/>
    <rect x="116" y="90" width="22" height="10" rx="5" fill="#475569"/>
    <rect x="148" y="90" width="22" height="10" rx="5" fill="#475569"/>
    <!-- Seats sides -->
    <rect x="0" y="32" width="10" height="18" rx="5" fill="#334155"/>
    <rect x="0" y="54" width="10" height="18" rx="5" fill="#334155"/>
    <rect x="198" y="32" width="10" height="18" rx="5" fill="#334155"/>
    <rect x="198" y="54" width="10" height="18" rx="5" fill="#334155"/>
  </svg>`,
}

const tableCoffee: OfficeFurnitureAsset = {
  id: 'table-coffee',
  name: 'Coffee Table',
  category: 'tables',
  tier: 'free',
  size: [2, 1],
  svg: `<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Table -->
    <rect x="10" y="14" width="84" height="28" rx="14" fill="#d4a96a" stroke="#c49458" stroke-width="1.5"/>
    <rect x="12" y="16" width="80" height="24" rx="12" fill="#e8c17a"/>
    <!-- Coffee cups -->
    <ellipse cx="36" cy="28" rx="7" ry="6" fill="#fef3c7"/>
    <ellipse cx="36" cy="27" rx="5" ry="4" fill="#92400e"/>
    <ellipse cx="68" cy="28" rx="7" ry="6" fill="#fef3c7"/>
    <ellipse cx="68" cy="27" rx="5" ry="4" fill="#92400e"/>
    <!-- Magazine -->
    <rect x="45" y="22" width="14" height="10" rx="1" fill="#ef4444" opacity="0.8"/>
    <!-- Legs -->
    <rect x="20" y="40" width="5" height="8" rx="1" fill="#b45309"/>
    <rect x="79" y="40" width="5" height="8" rx="1" fill="#b45309"/>
  </svg>`,
}

// ─── DECOR ───────────────────────────────────────────────────────────────────

const decorPlantLarge: OfficeFurnitureAsset = {
  id: 'decor-plant-large',
  name: 'Large Plant',
  category: 'decor',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Pot shadow -->
    <ellipse cx="26" cy="46" rx="12" ry="4" fill="#000" opacity="0.15"/>
    <!-- Pot -->
    <path d="M18 38 L20 48 L32 48 L34 38 Z" fill="#b45309"/>
    <rect x="16" y="36" width="20" height="4" rx="1" fill="#92400e"/>
    <!-- Soil -->
    <ellipse cx="26" cy="38" rx="9" ry="3" fill="#5c3d1e"/>
    <!-- Leaves -->
    <ellipse cx="26" cy="24" rx="14" ry="16" fill="#16a34a"/>
    <ellipse cx="16" cy="20" rx="9" ry="11" fill="#15803d"/>
    <ellipse cx="36" cy="20" rx="9" ry="11" fill="#15803d"/>
    <ellipse cx="26" cy="14" rx="8" ry="10" fill="#22c55e"/>
    <!-- Shine -->
    <ellipse cx="22" cy="18" rx="4" ry="5" fill="#4ade80" opacity="0.4"/>
  </svg>`,
}

const decorCactus: OfficeFurnitureAsset = {
  id: 'decor-cactus',
  name: 'Cactus',
  category: 'decor',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Pot -->
    <path d="M18 40 L20 50 L32 50 L34 40 Z" fill="#ef4444"/>
    <rect x="16" y="38" width="20" height="4" rx="1" fill="#dc2626"/>
    <!-- Soil -->
    <ellipse cx="26" cy="40" rx="9" ry="3" fill="#5c3d1e"/>
    <!-- Main trunk -->
    <rect x="22" y="14" width="8" height="26" rx="4" fill="#15803d"/>
    <!-- Left arm -->
    <rect x="12" y="22" width="12" height="6" rx="3" fill="#15803d"/>
    <rect x="10" y="14" width="6" height="12" rx="3" fill="#15803d"/>
    <!-- Right arm -->
    <rect x="28" y="26" width="12" height="6" rx="3" fill="#15803d"/>
    <rect x="36" y="18" width="6" height="14" rx="3" fill="#15803d"/>
    <!-- Spines -->
    <line x1="26" y1="18" x2="24" y2="15" stroke="#d1fae5" stroke-width="1"/>
    <line x1="26" y1="24" x2="28" y2="21" stroke="#d1fae5" stroke-width="1"/>
    <line x1="26" y1="30" x2="24" y2="27" stroke="#d1fae5" stroke-width="1"/>
    <!-- Flower -->
    <circle cx="26" cy="12" r="5" fill="#fbbf24"/>
    <circle cx="26" cy="12" r="3" fill="#f59e0b"/>
  </svg>`,
}

const decorWhiteboard: OfficeFurnitureAsset = {
  id: 'decor-whiteboard',
  name: 'Whiteboard',
  category: 'decor',
  tier: 'free',
  size: [2, 1],
  svg: `<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Frame -->
    <rect x="4" y="6" width="96" height="40" rx="3" fill="#64748b"/>
    <!-- Board surface -->
    <rect x="7" y="9" width="90" height="34" rx="2" fill="#f8fafc"/>
    <!-- Written content -->
    <line x1="14" y1="18" x2="50" y2="18" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="14" y1="24" x2="60" y2="24" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="14" y1="30" x2="44" y2="30" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
    <!-- Arrow / diagram -->
    <path d="M64 16 L82 22 L64 28" stroke="#22c55e" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Tray -->
    <rect x="7" y="41" width="90" height="4" rx="1" fill="#475569"/>
    <!-- Markers -->
    <rect x="20" y="41" width="6" height="3" rx="1" fill="#ef4444"/>
    <rect x="30" y="41" width="6" height="3" rx="1" fill="#3b82f6"/>
    <rect x="40" y="41" width="6" height="3" rx="1" fill="#22c55e"/>
  </svg>`,
}

const decorCoffeeMachine: OfficeFurnitureAsset = {
  id: 'decor-coffee-machine',
  name: 'Coffee Machine',
  category: 'decor',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Machine body -->
    <rect x="8" y="8" width="36" height="36" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <!-- Screen -->
    <rect x="14" y="12" width="24" height="12" rx="2" fill="#0ea5e9"/>
    <rect x="16" y="14" width="20" height="8" rx="1" fill="#38bdf8"/>
    <!-- Coffee icon on screen -->
    <path d="M24 16 Q26 14 28 16 Q26 20 24 16" stroke="#0c4a6e" stroke-width="1" fill="#bae6fd" opacity="0.8"/>
    <!-- Buttons -->
    <circle cx="16" cy="30" r="3" fill="#7c3aed"/>
    <circle cx="26" cy="30" r="3" fill="#7c3aed"/>
    <circle cx="36" cy="30" r="3" fill="#ef4444"/>
    <!-- Spout -->
    <rect x="20" y="36" width="12" height="4" rx="2" fill="#334155"/>
    <!-- Cup area -->
    <rect x="14" y="40" width="24" height="6" rx="2" fill="#0f172a"/>
    <!-- Steam lines -->
    <path d="M20 8 Q21 4 20 2" stroke="#94a3b8" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M26 8 Q27 4 26 2" stroke="#94a3b8" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M32 8 Q33 4 32 2" stroke="#94a3b8" stroke-width="1" fill="none" stroke-linecap="round"/>
  </svg>`,
}

const decorBookshelf: OfficeFurnitureAsset = {
  id: 'decor-bookshelf',
  name: 'Bookshelf',
  category: 'decor',
  tier: 'free',
  size: [1, 2],
  svg: `<svg viewBox="0 0 52 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Frame -->
    <rect x="4" y="4" width="44" height="96" rx="3" fill="#92400e" stroke="#78350f" stroke-width="1.5"/>
    <!-- Shelves -->
    <rect x="4" y="32" width="44" height="3" fill="#6b2d0c"/>
    <rect x="4" y="62" width="44" height="3" fill="#6b2d0c"/>
    <!-- Books row 1 -->
    <rect x="8" y="8" width="6" height="22" rx="1" fill="#ef4444"/>
    <rect x="15" y="10" width="5" height="20" rx="1" fill="#3b82f6"/>
    <rect x="21" y="8" width="7" height="22" rx="1" fill="#22c55e"/>
    <rect x="29" y="10" width="5" height="20" rx="1" fill="#f59e0b"/>
    <rect x="35" y="8" width="8" height="22" rx="1" fill="#8b5cf6"/>
    <!-- Books row 2 -->
    <rect x="8" y="37" width="7" height="22" rx="1" fill="#06b6d4"/>
    <rect x="16" y="39" width="5" height="20" rx="1" fill="#ec4899"/>
    <rect x="22" y="37" width="6" height="22" rx="1" fill="#f97316"/>
    <rect x="29" y="39" width="8" height="20" rx="1" fill="#64748b"/>
    <rect x="38" y="37" width="6" height="22" rx="1" fill="#a3e635"/>
    <!-- Books row 3 -->
    <rect x="8" y="67" width="5" height="28" rx="1" fill="#8b5cf6"/>
    <rect x="14" y="69" width="7" height="26" rx="1" fill="#ef4444"/>
    <rect x="22" y="67" width="6" height="28" rx="1" fill="#0ea5e9"/>
    <rect x="29" y="70" width="5" height="25" rx="1" fill="#22c55e"/>
    <rect x="35" y="67" width="8" height="28" rx="1" fill="#fbbf24"/>
  </svg>`,
}

const decorRug: OfficeFurnitureAsset = {
  id: 'decor-rug',
  name: 'Area Rug',
  category: 'decor',
  tier: 'premium',
  price: 100,
  size: [3, 2],
  svg: `<svg viewBox="0 0 156 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Rug base -->
    <rect x="4" y="4" width="148" height="96" rx="8" fill="#7c3aed"/>
    <!-- Fringe -->
    <rect x="4" y="4" width="148" height="8" rx="4" fill="#6d28d9"/>
    <rect x="4" y="92" width="148" height="8" rx="4" fill="#6d28d9"/>
    <!-- Border pattern -->
    <rect x="14" y="14" width="128" height="76" rx="4" fill="none" stroke="#a78bfa" stroke-width="2"/>
    <rect x="22" y="22" width="112" height="60" rx="3" fill="none" stroke="#c4b5fd" stroke-width="1.5"/>
    <!-- Center motif -->
    <circle cx="78" cy="52" r="20" fill="none" stroke="#ddd6fe" stroke-width="2"/>
    <circle cx="78" cy="52" r="12" fill="none" stroke="#ddd6fe" stroke-width="1.5"/>
    <circle cx="78" cy="52" r="5" fill="#ddd6fe" opacity="0.5"/>
    <!-- Diamond corners -->
    <path d="M30 30 L38 22 L46 30 L38 38 Z" fill="#a78bfa" opacity="0.4"/>
    <path d="M110 30 L118 22 L126 30 L118 38 Z" fill="#a78bfa" opacity="0.4"/>
    <path d="M30 74 L38 66 L46 74 L38 82 Z" fill="#a78bfa" opacity="0.4"/>
    <path d="M110 74 L118 66 L126 74 L118 82 Z" fill="#a78bfa" opacity="0.4"/>
  </svg>`,
}

const decorPingPong: OfficeFurnitureAsset = {
  id: 'decor-ping-pong',
  name: 'Ping Pong Table',
  category: 'decor',
  tier: 'premium',
  price: 250,
  size: [3, 2],
  svg: `<svg viewBox="0 0 156 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Table surface -->
    <rect x="8" y="14" width="140" height="76" rx="4" fill="#1d4ed8" stroke="#1e40af" stroke-width="2"/>
    <!-- Net -->
    <rect x="74" y="12" width="8" height="80" fill="#fff" opacity="0.9"/>
    <rect x="76" y="12" width="4" height="80" fill="none" stroke="#94a3b8" stroke-width="0.5" stroke-dasharray="4 2"/>
    <!-- White lines -->
    <line x1="8" y1="52" x2="72" y2="52" stroke="#fff" stroke-width="1.5" opacity="0.8"/>
    <line x1="84" y1="52" x2="148" y2="52" stroke="#fff" stroke-width="1.5" opacity="0.8"/>
    <rect x="8" y="14" width="140" height="76" rx="4" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
    <!-- Ball -->
    <circle cx="50" cy="38" r="6" fill="#f97316" stroke="#ea580c" stroke-width="1"/>
    <circle cx="110" cy="68" r="6" fill="#f97316" stroke="#ea580c" stroke-width="1"/>
    <!-- Paddles -->
    <ellipse cx="28" cy="52" rx="10" ry="8" fill="#dc2626" stroke="#b91c1c" stroke-width="1"/>
    <rect x="25" y="58" width="6" height="14" rx="2" fill="#92400e"/>
    <ellipse cx="128" cy="52" rx="10" ry="8" fill="#2563eb" stroke="#1d4ed8" stroke-width="1"/>
    <rect x="125" y="58" width="6" height="14" rx="2" fill="#92400e"/>
    <!-- Legs -->
    <rect x="12" y="88" width="6" height="12" rx="2" fill="#374151"/>
    <rect x="138" y="88" width="6" height="12" rx="2" fill="#374151"/>
    <rect x="12" y="4" width="6" height="12" rx="2" fill="#374151"/>
    <rect x="138" y="4" width="6" height="12" rx="2" fill="#374151"/>
  </svg>`,
}

const decorVendingMachine: OfficeFurnitureAsset = {
  id: 'decor-vending',
  name: 'Vending Machine',
  category: 'decor',
  tier: 'premium',
  price: 150,
  size: [1, 2],
  svg: `<svg viewBox="0 0 52 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <rect x="4" y="4" width="44" height="96" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <!-- Glass window -->
    <rect x="8" y="8" width="36" height="55" rx="3" fill="#0ea5e9" opacity="0.3"/>
    <rect x="8" y="8" width="36" height="55" rx="3" fill="none" stroke="#38bdf8" stroke-width="1"/>
    <!-- Products (colorful grid) -->
    <rect x="12" y="12" width="10" height="10" rx="1" fill="#ef4444"/>
    <rect x="24" y="12" width="10" height="10" rx="1" fill="#3b82f6"/>
    <rect x="12" y="24" width="10" height="10" rx="1" fill="#22c55e"/>
    <rect x="24" y="24" width="10" height="10" rx="1" fill="#f59e0b"/>
    <rect x="12" y="36" width="10" height="10" rx="1" fill="#8b5cf6"/>
    <rect x="24" y="36" width="10" height="10" rx="1" fill="#ec4899"/>
    <rect x="12" y="48" width="10" height="10" rx="1" fill="#06b6d4"/>
    <rect x="24" y="48" width="10" height="10" rx="1" fill="#f97316"/>
    <!-- Panel -->
    <rect x="8" y="67" width="36" height="26" rx="2" fill="#0f172a"/>
    <!-- Screen -->
    <rect x="12" y="70" width="20" height="10" rx="2" fill="#1e40af"/>
    <!-- Keypad -->
    <circle cx="38" cy="72" r="2" fill="#475569"/>
    <circle cx="38" cy="78" r="2" fill="#475569"/>
    <circle cx="38" cy="84" r="2" fill="#475569"/>
    <!-- Tray -->
    <rect x="8" y="90" width="36" height="5" rx="1" fill="#334155"/>
  </svg>`,
}

// ─── WALLS / STRUCTURE ───────────────────────────────────────────────────────

const wallSolid: OfficeFurnitureAsset = {
  id: 'wall-solid',
  name: 'Wall',
  category: 'walls',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <rect width="52" height="52" fill="#334155"/>
    <rect x="0" y="0" width="52" height="14" fill="#3d4f63"/>
    <rect x="0" y="14" width="52" height="1" fill="#1e293b"/>
    <rect x="0" y="28" width="52" height="1" fill="#1e293b"/>
    <rect x="0" y="42" width="52" height="1" fill="#1e293b"/>
    <rect x="26" y="14" width="1" height="14" fill="#1e293b"/>
    <rect x="0" y="28" width="1" height="14" fill="#1e293b"/>
    <rect x="52" y="28" width="1" height="14" fill="#1e293b"/>
  </svg>`,
}

const wallGlass: OfficeFurnitureAsset = {
  id: 'wall-glass',
  name: 'Glass Divider',
  category: 'walls',
  tier: 'free',
  size: [1, 1],
  svg: `<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Frame -->
    <rect x="4" y="2" width="44" height="48" rx="2" fill="#94a3b8" stroke="#64748b" stroke-width="1"/>
    <!-- Glass -->
    <rect x="6" y="4" width="40" height="44" rx="1" fill="#bae6fd" opacity="0.4"/>
    <!-- Glare -->
    <line x1="10" y1="8" x2="20" y2="44" stroke="#fff" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
    <line x1="18" y1="8" x2="24" y2="24" stroke="#fff" stroke-width="1" opacity="0.3" stroke-linecap="round"/>
    <!-- Handle -->
    <rect x="23" y="22" width="6" height="8" rx="2" fill="#475569"/>
  </svg>`,
}

const wallWindow: OfficeFurnitureAsset = {
  id: 'wall-window',
  name: 'Window',
  category: 'walls',
  tier: 'free',
  size: [2, 1],
  svg: `<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg">
    <!-- Frame -->
    <rect x="4" y="4" width="96" height="44" rx="2" fill="#475569"/>
    <!-- Sky / outside -->
    <rect x="8" y="8" width="88" height="36" rx="1" fill="#bae6fd"/>
    <!-- Cross divider -->
    <rect x="4" y="26" width="96" height="3" fill="#475569"/>
    <rect x="52" y="4" width="3" height="44" fill="#475569"/>
    <!-- Clouds -->
    <ellipse cx="30" cy="18" rx="12" ry="6" fill="#fff" opacity="0.9"/>
    <ellipse cx="42" cy="16" rx="8" ry="5" fill="#fff" opacity="0.9"/>
    <ellipse cx="74" cy="38" rx="10" ry="5" fill="#fff" opacity="0.7"/>
    <!-- Sun -->
    <circle cx="80" cy="18" rx="8" fill="#fbbf24" opacity="0.8"/>
    <!-- Latch -->
    <rect x="50" y="24" width="7" height="5" rx="1" fill="#334155"/>
  </svg>`,
}

// ─── PREMIUM SPECIALS ────────────────────────────────────────────────────────

const decorPhoneBoothPod: OfficeFurnitureAsset = {
  id: 'decor-phone-booth',
  name: 'Focus Pod',
  category: 'decor',
  tier: 'premium',
  price: 300,
  size: [2, 2],
  svg: `<svg viewBox="0 0 104 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Pod shell -->
    <rect x="8" y="8" width="88" height="88" rx="12" fill="#0f172a" stroke="#7c3aed" stroke-width="2"/>
    <!-- Interior -->
    <rect x="14" y="14" width="76" height="76" rx="8" fill="#1e293b"/>
    <!-- Glass door (front) -->
    <rect x="30" y="14" width="44" height="76" rx="4" fill="#a78bfa" opacity="0.12"/>
    <rect x="30" y="14" width="44" height="76" rx="4" fill="none" stroke="#7c3aed" stroke-width="1.5"/>
    <!-- Desk inside -->
    <rect x="20" y="50" width="64" height="20" rx="3" fill="#334155"/>
    <!-- Monitor on desk -->
    <rect x="34" y="34" width="36" height="16" rx="2" fill="#1e3a5f" stroke="#3b82f6" stroke-width="1"/>
    <rect x="48" y="50" width="8" height="4" fill="#1e3a5f"/>
    <!-- LED accent strip -->
    <rect x="8" y="8" width="88" height="4" rx="12" fill="#7c3aed" opacity="0.8"/>
    <!-- Sound wave icon (quiet zone) -->
    <path d="M72 68 Q76 64 76 72 Q76 80 72 76" stroke="#7c3aed" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M76 66 Q82 60 82 72 Q82 84 76 78" stroke="#a78bfa" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`,
}

const decorArcadeGame: OfficeFurnitureAsset = {
  id: 'decor-arcade',
  name: 'Arcade Cabinet',
  category: 'decor',
  tier: 'premium',
  price: 220,
  size: [1, 2],
  svg: `<svg viewBox="0 0 52 104" xmlns="http://www.w3.org/2000/svg">
    <!-- Cabinet body -->
    <rect x="4" y="18" width="44" height="82" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
    <!-- Top angled piece -->
    <path d="M4 18 L12 4 L40 4 L48 18 Z" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
    <!-- Screen -->
    <rect x="10" y="22" width="32" height="28" rx="3" fill="#0ea5e9"/>
    <rect x="12" y="24" width="28" height="24" rx="2" fill="#0c4a6e"/>
    <!-- Game on screen -->
    <rect x="18" y="28" width="4" height="4" rx="1" fill="#4ade80"/>
    <rect x="26" y="32" width="4" height="4" rx="1" fill="#f87171"/>
    <rect x="22" y="36" width="4" height="4" rx="1" fill="#fbbf24"/>
    <!-- Controls panel -->
    <rect x="8" y="54" width="36" height="22" rx="3" fill="#0f172a"/>
    <!-- Joystick -->
    <circle cx="22" cy="64" r="6" fill="#374151"/>
    <circle cx="22" cy="64" r="4" fill="#ef4444"/>
    <!-- Buttons -->
    <circle cx="36" cy="60" r="3.5" fill="#ef4444"/>
    <circle cx="36" cy="68" r="3.5" fill="#3b82f6"/>
    <circle cx="30" cy="64" r="3.5" fill="#22c55e"/>
    <!-- Coin slot -->
    <rect x="20" y="78" width="12" height="3" rx="1.5" fill="#374151"/>
    <!-- Neon sign -->
    <rect x="14" y="6" width="24" height="8" rx="2" fill="#7c3aed" opacity="0.8"/>
    <text x="26" y="13" text-anchor="middle" fill="#ddd6fe" font-size="5" font-family="monospace" font-weight="bold">PLAY</text>
  </svg>`,
}

// ─── CATALOG EXPORT ──────────────────────────────────────────────────────────

export const OFFICE_ASSETS: OfficeFurnitureAsset[] = [
  // Floors
  floorHardwood,
  floorCarpetBlue,
  floorConcrete,
  floorWhiteTile,
  floorDarkwood,
  floorGrass,
  // Desks
  deskBasic,
  deskStanding,
  deskL,
  deskPod,
  deskExecutive,
  // Chairs
  chairBasic,
  chairTask,
  chairSofa,
  chairBeanBag,
  // Tables
  tableMeetingRound,
  tableMeetingRect,
  tableCoffee,
  // Decor
  decorPlantLarge,
  decorCactus,
  decorWhiteboard,
  decorCoffeeMachine,
  decorBookshelf,
  decorRug,
  decorPingPong,
  decorVendingMachine,
  decorPhoneBoothPod,
  decorArcadeGame,
  // Walls
  wallSolid,
  wallGlass,
  wallWindow,
]

export const ASSET_CATEGORIES: { id: AssetCategory; label: string; icon: string }[] = [
  { id: 'floors', label: 'Floors', icon: '🪵' },
  { id: 'desks', label: 'Desks', icon: '🖥️' },
  { id: 'chairs', label: 'Chairs', icon: '🪑' },
  { id: 'tables', label: 'Tables', icon: '📋' },
  { id: 'decor', label: 'Decor', icon: '🌿' },
  { id: 'walls', label: 'Walls', icon: '🧱' },
]

export function getAssetById(id: string): OfficeFurnitureAsset | undefined {
  return OFFICE_ASSETS.find((a) => a.id === id)
}

export function isAssetUnlocked(asset: OfficeFurnitureAsset, isSuperAdmin: boolean, ownedAssets: string[]): boolean {
  if (asset.tier === 'free') return true
  if (isSuperAdmin) return true
  return ownedAssets.includes(asset.id)
}

// Zone preset colors
export const ZONE_COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#9333ea', '#0284c7',
]
