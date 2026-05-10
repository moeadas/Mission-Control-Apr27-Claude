/**
 * office-assets.ts — SVG furniture catalog for the Virtual Office Builder
 * Scale: 1 tile = 50 cm. Sizes [w, h] in tiles (width × depth, unrotated).
 * defaultColor: the primary fill hex in the SVG — replaced when user picks a custom color.
 * accentColor: secondary fill hex (frame, legs, details).
 */

export type AssetCategory =
  | 'desks' | 'seating' | 'tables' | 'storage'
  | 'kitchen' | 'wellness' | 'it' | 'decor'
  | 'structural' | 'floors'

export type AssetTier = 'free' | 'premium'

export interface OfficeFurnitureAsset {
  id: string
  name: string
  category: AssetCategory
  tier: AssetTier
  price?: number
  size: [number, number]
  defaultColor: string
  accentColor: string
  svg: string
  assignable?: boolean
  placement?: 'wall' | 'floor' | 'ceiling'
}

export const ASSET_CATEGORIES: { id: AssetCategory; label: string; icon: string }[] = [
  { id: 'desks',      label: 'Desks',       icon: '🖥️' },
  { id: 'seating',    label: 'Seating',     icon: '🪑' },
  { id: 'tables',     label: 'Tables',      icon: '🪵' },
  { id: 'storage',    label: 'Storage',     icon: '🗄️' },
  { id: 'kitchen',    label: 'Kitchen',     icon: '☕' },
  { id: 'wellness',   label: 'Wellness',    icon: '🌿' },
  { id: 'it',         label: 'IT & Infra',  icon: '🖧' },
  { id: 'decor',      label: 'Decor',       icon: '🎨' },
  { id: 'structural', label: 'Structural',  icon: '🏗️' },
  { id: 'floors',     label: 'Floors',      icon: '🟫' },
]

export const OFFICE_ASSETS: OfficeFurnitureAsset[] = [
  // DESKS
  { id:'desk-standard', name:'Standard Desk', category:'desks', tier:'free', size:[3,2], defaultColor:'#d4a96a', accentColor:'#8B6340', assignable:true,
    svg:`<svg viewBox="0 0 156 104" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="152" height="100" rx="4" fill="#8B6340"/><rect x="6" y="6" width="144" height="92" rx="3" fill="#d4a96a"/><rect x="10" y="88" width="20" height="8" rx="2" fill="#8B6340" opacity="0.6"/><rect x="126" y="88" width="20" height="8" rx="2" fill="#8B6340" opacity="0.6"/><rect x="50" y="30" width="56" height="40" rx="3" fill="#c49050" opacity="0.3"/></svg>` },
  { id:'desk-executive', name:'Executive Desk', category:'desks', tier:'free', size:[4,2], defaultColor:'#8B4513', accentColor:'#5C2D0A', assignable:true,
    svg:`<svg viewBox="0 0 208 104" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="204" height="100" rx="4" fill="#5C2D0A"/><rect x="6" y="6" width="196" height="92" rx="3" fill="#8B4513"/><rect x="10" y="88" width="24" height="8" rx="2" fill="#5C2D0A" opacity="0.6"/><rect x="174" y="88" width="24" height="8" rx="2" fill="#5C2D0A" opacity="0.6"/><rect x="14" y="14" width="80" height="60" rx="3" fill="#7a3b0e" opacity="0.3"/><rect x="100" y="14" width="100" height="60" rx="3" fill="#7a3b0e" opacity="0.2"/></svg>` },
  { id:'desk-standing', name:'Standing Desk', category:'desks', tier:'free', size:[3,2], defaultColor:'#e8e0d0', accentColor:'#334155', assignable:true,
    svg:`<svg viewBox="0 0 156 104" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="152" height="100" rx="4" fill="#334155"/><rect x="6" y="6" width="144" height="92" rx="3" fill="#e8e0d0"/><rect x="10" y="88" width="20" height="8" rx="2" fill="#334155" opacity="0.5"/><rect x="126" y="88" width="20" height="8" rx="2" fill="#334155" opacity="0.5"/><rect x="60" y="40" width="36" height="10" rx="3" fill="#334155" opacity="0.35"/></svg>` },
  { id:'desk-corner', name:'Corner Desk', category:'desks', tier:'free', size:[4,4], defaultColor:'#c8a97a', accentColor:'#7a5230', assignable:true,
    svg:`<svg viewBox="0 0 208 208" xmlns="http://www.w3.org/2000/svg"><path d="M4 4 h200 v100 h-100 v100 h-100 z" fill="#7a5230"/><path d="M8 8 h192 v92 h-92 v92 h-92 z" fill="#c8a97a"/><rect x="12" y="192" width="20" height="8" rx="2" fill="#7a5230" opacity="0.5"/><rect x="190" y="88" width="8" height="8" rx="2" fill="#7a5230" opacity="0.5"/></svg>` },
  { id:'desk-bench', name:'Bench Desk (2p)', category:'desks', tier:'free', size:[4,2], defaultColor:'#f0f0ea', accentColor:'#475569', assignable:true,
    svg:`<svg viewBox="0 0 208 104" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="204" height="100" rx="4" fill="#475569"/><rect x="6" y="6" width="96" height="92" rx="3" fill="#f0f0ea"/><rect x="106" y="6" width="96" height="92" rx="3" fill="#f0f0ea"/><rect x="101" y="6" width="6" height="92" fill="#475569" opacity="0.5"/></svg>` },
  { id:'desk-reception', name:'Reception Desk', category:'desks', tier:'premium', price:120, size:[5,3], defaultColor:'#f8f8f4', accentColor:'#1e293b', assignable:true,
    svg:`<svg viewBox="0 0 260 156" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="50" width="252" height="102" rx="4" fill="#1e293b"/><rect x="8" y="54" width="244" height="94" rx="3" fill="#f8f8f4"/><rect x="4" y="4" width="160" height="50" rx="4" fill="#1e293b"/><rect x="8" y="8" width="152" height="42" rx="3" fill="#f8f8f4" opacity="0.9"/><rect x="12" y="140" width="30" height="8" rx="2" fill="#1e293b" opacity="0.4"/><rect x="218" y="140" width="30" height="8" rx="2" fill="#1e293b" opacity="0.4"/></svg>` },
  { id:'desk-pod', name:'Pod Desk (4p)', category:'desks', tier:'premium', price:150, size:[4,4], defaultColor:'#e8e0d0', accentColor:'#334155', assignable:true,
    svg:`<svg viewBox="0 0 208 208" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="200" height="200" rx="6" fill="#334155"/><rect x="8" y="8" width="92" height="92" rx="4" fill="#e8e0d0"/><rect x="108" y="8" width="92" height="92" rx="4" fill="#e8e0d0"/><rect x="8" y="108" width="92" height="92" rx="4" fill="#e8e0d0"/><rect x="108" y="108" width="92" height="92" rx="4" fill="#e8e0d0"/><rect x="96" y="96" width="16" height="16" rx="3" fill="#1e293b"/></svg>` },

  // SEATING
  { id:'chair-office', name:'Office Chair', category:'seating', tier:'free', size:[1,1], defaultColor:'#1e293b', accentColor:'#475569', assignable:true,
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><ellipse cx="26" cy="30" rx="18" ry="18" fill="#1e293b"/><ellipse cx="26" cy="16" rx="13" ry="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/><rect x="18" y="12" width="16" height="14" rx="3" fill="#1e293b"/><circle cx="14" cy="42" r="3.5" fill="#475569" opacity="0.7"/><circle cx="38" cy="42" r="3.5" fill="#475569" opacity="0.7"/><circle cx="14" cy="20" r="2.5" fill="#475569" opacity="0.5"/><circle cx="38" cy="20" r="2.5" fill="#475569" opacity="0.5"/></svg>` },
  { id:'chair-ergonomic', name:'Ergonomic Chair', category:'seating', tier:'free', size:[1,1], defaultColor:'#0f172a', accentColor:'#64748b', assignable:true,
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><ellipse cx="26" cy="30" rx="18" ry="18" fill="#0f172a"/><rect x="14" y="10" width="24" height="16" rx="4" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/><rect x="18" y="24" width="16" height="8" rx="2" fill="#64748b" opacity="0.4"/><circle cx="12" cy="44" r="3.5" fill="#64748b" opacity="0.7"/><circle cx="40" cy="44" r="3.5" fill="#64748b" opacity="0.7"/><line x1="10" y1="26" x2="6" y2="34" stroke="#64748b" stroke-width="2" stroke-linecap="round"/><line x1="42" y1="26" x2="46" y2="34" stroke="#64748b" stroke-width="2" stroke-linecap="round"/></svg>` },
  { id:'chair-guest', name:'Guest Chair', category:'seating', tier:'free', size:[1,1], defaultColor:'#94a3b8', accentColor:'#475569', assignable:true,
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="18" width="36" height="26" rx="4" fill="#94a3b8"/><rect x="10" y="6" width="32" height="16" rx="3" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/><rect x="6" y="18" width="6" height="22" rx="2" fill="#475569" opacity="0.7"/><rect x="40" y="18" width="6" height="22" rx="2" fill="#475569" opacity="0.7"/><rect x="8" y="40" width="8" height="6" rx="2" fill="#475569"/><rect x="36" y="40" width="8" height="6" rx="2" fill="#475569"/></svg>` },
  { id:'chair-executive', name:'Executive Chair', category:'seating', tier:'premium', price:80, size:[1,1], defaultColor:'#1a0a00', accentColor:'#7c3a00', assignable:true,
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><ellipse cx="26" cy="30" rx="18" ry="18" fill="#1a0a00"/><rect x="12" y="8" width="28" height="18" rx="5" fill="#1a0a00" stroke="#7c3a00" stroke-width="1.5"/><ellipse cx="26" cy="30" rx="14" ry="12" fill="#7c3a00" opacity="0.3"/><circle cx="14" cy="44" r="3.5" fill="#7c3a00" opacity="0.8"/><circle cx="38" cy="44" r="3.5" fill="#7c3a00" opacity="0.8"/><circle cx="8" cy="26" r="2.5" fill="#7c3a00" opacity="0.5"/><circle cx="44" cy="26" r="2.5" fill="#7c3a00" opacity="0.5"/></svg>` },
  { id:'sofa-single', name:'Armchair', category:'seating', tier:'free', size:[2,2], defaultColor:'#7c5cbf', accentColor:'#4a3580',
    svg:`<svg viewBox="0 0 104 104" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="104" height="104" rx="8" fill="#4a3580"/><rect x="8" y="34" width="88" height="64" rx="6" fill="#7c5cbf"/><rect x="8" y="8" width="88" height="28" rx="5" fill="#7c5cbf" opacity="0.9"/><rect x="0" y="34" width="14" height="64" rx="4" fill="#4a3580" opacity="0.7"/><rect x="90" y="34" width="14" height="64" rx="4" fill="#4a3580" opacity="0.7"/></svg>` },
  { id:'sofa-double', name:'2-Seat Sofa', category:'seating', tier:'free', size:[3,2], defaultColor:'#7c5cbf', accentColor:'#4a3580',
    svg:`<svg viewBox="0 0 156 104" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="156" height="104" rx="8" fill="#4a3580"/><rect x="8" y="34" width="140" height="64" rx="6" fill="#7c5cbf"/><rect x="8" y="8" width="140" height="28" rx="5" fill="#7c5cbf" opacity="0.9"/><rect x="76" y="34" width="4" height="64" fill="#4a3580" opacity="0.3"/><rect x="0" y="34" width="14" height="64" rx="4" fill="#4a3580" opacity="0.7"/><rect x="142" y="34" width="14" height="64" rx="4" fill="#4a3580" opacity="0.7"/></svg>` },
  { id:'sofa-triple', name:'3-Seat Sofa', category:'seating', tier:'free', size:[5,2], defaultColor:'#4a80bf', accentColor:'#2a5080',
    svg:`<svg viewBox="0 0 260 104" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="260" height="104" rx="8" fill="#2a5080"/><rect x="8" y="34" width="244" height="64" rx="6" fill="#4a80bf"/><rect x="8" y="8" width="244" height="28" rx="5" fill="#4a80bf" opacity="0.9"/><rect x="88" y="34" width="4" height="64" fill="#2a5080" opacity="0.3"/><rect x="168" y="34" width="4" height="64" fill="#2a5080" opacity="0.3"/><rect x="0" y="34" width="14" height="64" rx="4" fill="#2a5080" opacity="0.7"/><rect x="246" y="34" width="14" height="64" rx="4" fill="#2a5080" opacity="0.7"/></svg>` },
  { id:'stool-bar', name:'Bar Stool', category:'seating', tier:'free', size:[1,1], defaultColor:'#d4a96a', accentColor:'#8B6340',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="18" r="16" fill="#d4a96a"/><circle cx="26" cy="18" r="11" fill="#c49050" opacity="0.6"/><rect x="24" y="32" width="4" height="16" rx="2" fill="#8B6340"/><rect x="12" y="44" width="28" height="4" rx="2" fill="#8B6340" opacity="0.6"/></svg>` },
  { id:'beanbag', name:'Bean Bag', category:'seating', tier:'free', size:[2,2], defaultColor:'#ef4444', accentColor:'#991b1b',
    svg:`<svg viewBox="0 0 104 104" xmlns="http://www.w3.org/2000/svg"><ellipse cx="52" cy="52" rx="46" ry="46" fill="#ef4444"/><ellipse cx="52" cy="52" rx="34" ry="32" fill="#f87171" opacity="0.5"/><ellipse cx="52" cy="42" rx="24" ry="20" fill="#fca5a5" opacity="0.35"/></svg>` },
  { id:'phone-booth', name:'Phone Booth', category:'seating', tier:'premium', price:200, size:[2,2], defaultColor:'#f0f9ff', accentColor:'#0369a1',
    svg:`<svg viewBox="0 0 104 104" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="100" height="100" rx="8" fill="#0369a1"/><rect x="8" y="8" width="88" height="88" rx="6" fill="#f0f9ff" opacity="0.95"/><rect x="12" y="12" width="80" height="55" rx="4" fill="#bae6fd" opacity="0.7"/><rect x="20" y="72" width="64" height="24" rx="4" fill="#e0f2fe"/><circle cx="52" cy="84" r="8" fill="#0369a1" opacity="0.5"/></svg>` },

  // TABLES
  { id:'table-meeting-rect', name:'Meeting Table (6p)', category:'tables', tier:'free', size:[4,2], defaultColor:'#d4c5a0', accentColor:'#8B6340',
    svg:`<svg viewBox="0 0 208 104" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="200" height="96" rx="6" fill="#d4c5a0" stroke="#8B6340" stroke-width="2"/><circle cx="14" cy="14" r="6" fill="#8B6340" opacity="0.7"/><circle cx="194" cy="14" r="6" fill="#8B6340" opacity="0.7"/><circle cx="14" cy="90" r="6" fill="#8B6340" opacity="0.7"/><circle cx="194" cy="90" r="6" fill="#8B6340" opacity="0.7"/></svg>` },
  { id:'table-meeting-large', name:'Boardroom Table (12p)', category:'tables', tier:'premium', price:160, size:[6,2], defaultColor:'#8B4513', accentColor:'#3d1a05',
    svg:`<svg viewBox="0 0 312 104" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="304" height="96" rx="6" fill="#8B4513" stroke="#3d1a05" stroke-width="2"/><circle cx="14" cy="14" r="6" fill="#3d1a05" opacity="0.7"/><circle cx="298" cy="14" r="6" fill="#3d1a05" opacity="0.7"/><circle cx="14" cy="90" r="6" fill="#3d1a05" opacity="0.7"/><circle cx="298" cy="90" r="6" fill="#3d1a05" opacity="0.7"/></svg>` },
  { id:'table-round', name:'Round Table (4p)', category:'tables', tier:'free', size:[3,3], defaultColor:'#d4c5a0', accentColor:'#8B6340',
    svg:`<svg viewBox="0 0 156 156" xmlns="http://www.w3.org/2000/svg"><circle cx="78" cy="78" r="74" fill="#8B6340"/><circle cx="78" cy="78" r="68" fill="#d4c5a0"/><circle cx="78" cy="78" r="28" fill="#8B6340" opacity="0.15"/></svg>` },
  { id:'table-coffee', name:'Coffee Table', category:'tables', tier:'free', size:[2,1], defaultColor:'#d4c5a0', accentColor:'#8B6340',
    svg:`<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="96" height="36" rx="6" fill="#d4c5a0" stroke="#8B6340" stroke-width="2"/><circle cx="14" cy="44" r="4" fill="#8B6340" opacity="0.7"/><circle cx="90" cy="44" r="4" fill="#8B6340" opacity="0.7"/><circle cx="14" cy="8" r="4" fill="#8B6340" opacity="0.7"/><circle cx="90" cy="8" r="4" fill="#8B6340" opacity="0.7"/></svg>` },
  { id:'table-huddle', name:'Huddle Table (2p)', category:'tables', tier:'free', size:[2,2], defaultColor:'#e2e8f0', accentColor:'#475569',
    svg:`<svg viewBox="0 0 104 104" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="96" height="96" rx="6" fill="#e2e8f0" stroke="#475569" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="#475569" opacity="0.7"/><circle cx="90" cy="14" r="5" fill="#475569" opacity="0.7"/><circle cx="14" cy="90" r="5" fill="#475569" opacity="0.7"/><circle cx="90" cy="90" r="5" fill="#475569" opacity="0.7"/></svg>` },
  { id:'whiteboard', name:'Whiteboard', category:'tables', tier:'free', size:[3,1], defaultColor:'#f8fafc', accentColor:'#334155', placement:'wall',
    svg:`<svg viewBox="0 0 156 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="152" height="48" rx="4" fill="#334155"/><rect x="6" y="6" width="144" height="36" rx="3" fill="#f8fafc"/><rect x="10" y="44" width="136" height="4" rx="2" fill="#475569" opacity="0.4"/><rect x="20" y="14" width="50" height="2" rx="1" fill="#94a3b8" opacity="0.5"/><rect x="20" y="20" width="80" height="2" rx="1" fill="#94a3b8" opacity="0.4"/><rect x="20" y="26" width="60" height="2" rx="1" fill="#94a3b8" opacity="0.3"/></svg>` },
  { id:'table-standing', name:'Tall / Poseur Table', category:'tables', tier:'free', size:[1,1], defaultColor:'#f8fafc', accentColor:'#334155',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="20" r="20" fill="#f8fafc" stroke="#334155" stroke-width="2"/><circle cx="26" cy="20" r="14" fill="#e2e8f0" opacity="0.6"/><rect x="24" y="38" width="4" height="12" rx="2" fill="#334155"/><rect x="16" y="46" width="20" height="4" rx="2" fill="#334155" opacity="0.5"/></svg>` },

  // STORAGE
  { id:'cabinet-filing', name:'Filing Cabinet', category:'storage', tier:'free', size:[1,2], defaultColor:'#94a3b8', accentColor:'#475569',
    svg:`<svg viewBox="0 0 52 104" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="48" height="100" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/><rect x="6" y="8" width="40" height="28" rx="3" fill="#94a3b8" stroke="#475569" stroke-width="1" opacity="0.8"/><circle cx="26" cy="22" r="3" fill="#475569"/><rect x="6" y="40" width="40" height="28" rx="3" fill="#94a3b8" stroke="#475569" stroke-width="1" opacity="0.7"/><circle cx="26" cy="54" r="3" fill="#475569"/><rect x="6" y="72" width="40" height="26" rx="3" fill="#94a3b8" stroke="#475569" stroke-width="1" opacity="0.6"/><circle cx="26" cy="85" r="3" fill="#475569"/></svg>` },
  { id:'cabinet-low', name:'Low Storage Unit', category:'storage', tier:'free', size:[2,1], defaultColor:'#e2e8f0', accentColor:'#334155',
    svg:`<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="100" height="48" rx="4" fill="#e2e8f0" stroke="#334155" stroke-width="1.5"/><rect x="6" y="6" width="44" height="40" rx="3" fill="#e2e8f0" stroke="#334155" stroke-width="1" opacity="0.8"/><circle cx="28" cy="26" r="3" fill="#334155"/><rect x="54" y="6" width="44" height="40" rx="3" fill="#e2e8f0" stroke="#334155" stroke-width="1" opacity="0.8"/><circle cx="76" cy="26" r="3" fill="#334155"/></svg>` },
  { id:'bookshelf', name:'Bookshelf', category:'storage', tier:'free', size:[2,1], defaultColor:'#d4a96a', accentColor:'#8B6340', placement:'wall',
    svg:`<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="100" height="48" rx="3" fill="#8B6340"/><rect x="6" y="6" width="92" height="12" rx="2" fill="#d4a96a"/><rect x="6" y="22" width="92" height="12" rx="2" fill="#d4a96a"/><rect x="6" y="38" width="92" height="8" rx="2" fill="#d4a96a"/><rect x="10" y="6" width="6" height="12" rx="1" fill="#ef4444" opacity="0.8"/><rect x="20" y="6" width="6" height="12" rx="1" fill="#3b82f6" opacity="0.8"/><rect x="30" y="6" width="6" height="12" rx="1" fill="#22c55e" opacity="0.8"/><rect x="40" y="6" width="6" height="12" rx="1" fill="#f59e0b" opacity="0.8"/><rect x="50" y="6" width="6" height="12" rx="1" fill="#8b5cf6" opacity="0.8"/></svg>` },
  { id:'locker', name:'Locker Unit (4)', category:'storage', tier:'free', size:[2,1], defaultColor:'#94a3b8', accentColor:'#1e293b', placement:'wall',
    svg:`<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="100" height="48" rx="3" fill="#1e293b"/><rect x="6" y="6" width="20" height="40" rx="2" fill="#94a3b8"/><circle cx="16" cy="26" r="2.5" fill="#1e293b" opacity="0.7"/><rect x="30" y="6" width="20" height="40" rx="2" fill="#94a3b8"/><circle cx="40" cy="26" r="2.5" fill="#1e293b" opacity="0.7"/><rect x="54" y="6" width="20" height="40" rx="2" fill="#94a3b8"/><circle cx="64" cy="26" r="2.5" fill="#1e293b" opacity="0.7"/><rect x="78" y="6" width="20" height="40" rx="2" fill="#94a3b8"/><circle cx="88" cy="26" r="2.5" fill="#1e293b" opacity="0.7"/></svg>` },
  { id:'coatrack', name:'Coat Rack', category:'storage', tier:'free', size:[1,1], defaultColor:'#8B6340', accentColor:'#5C3D1A',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="6" width="4" height="40" rx="2" fill="#8B6340"/><rect x="10" y="14" width="32" height="3" rx="1.5" fill="#8B6340"/><circle cx="10" cy="15" r="3" fill="#5C3D1A"/><circle cx="26" cy="6" r="3" fill="#5C3D1A"/><circle cx="42" cy="15" r="3" fill="#5C3D1A"/><rect x="20" y="44" width="12" height="4" rx="2" fill="#5C3D1A"/></svg>` },

  // KITCHEN
  { id:'kitchen-counter', name:'Kitchen Counter', category:'kitchen', tier:'free', size:[3,1], defaultColor:'#f1f5f9', accentColor:'#334155', placement:'wall',
    svg:`<svg viewBox="0 0 156 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="152" height="48" rx="4" fill="#334155"/><rect x="6" y="6" width="144" height="40" rx="3" fill="#f1f5f9"/><rect x="10" y="10" width="40" height="28" rx="3" fill="#cbd5e1" opacity="0.8"/><rect x="12" y="22" width="36" height="16" rx="2" fill="#94a3b8" opacity="0.5"/><circle cx="108" cy="24" r="10" fill="#94a3b8" opacity="0.6"/><circle cx="108" cy="24" r="6" fill="#64748b" opacity="0.5"/><rect x="130" y="12" width="14" height="22" rx="3" fill="#cbd5e1" opacity="0.8"/></svg>` },
  { id:'coffee-machine', name:'Coffee Machine', category:'kitchen', tier:'free', size:[1,1], defaultColor:'#1e293b', accentColor:'#7c3aed',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="4" width="36" height="44" rx="6" fill="#1e293b"/><rect x="12" y="8" width="28" height="18" rx="4" fill="#334155"/><circle cx="26" cy="17" r="6" fill="#475569"/><circle cx="26" cy="17" r="3" fill="#7c3aed" opacity="0.8"/><rect x="16" y="30" width="20" height="14" rx="3" fill="#0f172a"/><circle cx="26" cy="37" r="4" fill="#7c3aed" opacity="0.6"/></svg>` },
  { id:'fridge', name:'Refrigerator', category:'kitchen', tier:'free', size:[1,2], defaultColor:'#e2e8f0', accentColor:'#94a3b8', placement:'wall',
    svg:`<svg viewBox="0 0 52 104" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="44" height="96" rx="6" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><rect x="4" y="4" width="44" height="40" rx="6" fill="#cbd5e1"/><rect x="4" y="40" width="44" height="4" fill="#94a3b8"/><rect x="36" y="12" width="4" height="22" rx="2" fill="#94a3b8" opacity="0.7"/><rect x="36" y="52" width="4" height="40" rx="2" fill="#94a3b8" opacity="0.7"/></svg>` },
  { id:'microwave', name:'Microwave', category:'kitchen', tier:'free', size:[1,1], defaultColor:'#1e293b', accentColor:'#475569',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="44" height="32" rx="4" fill="#1e293b"/><rect x="8" y="14" width="28" height="24" rx="3" fill="#0f172a" opacity="0.8"/><rect x="38" y="14" width="6" height="6" rx="1" fill="#475569"/><rect x="38" y="24" width="6" height="6" rx="1" fill="#475569"/><rect x="38" y="32" width="6" height="6" rx="1" fill="#7c3aed" opacity="0.8"/></svg>` },
  { id:'water-dispenser', name:'Water Dispenser', category:'kitchen', tier:'free', size:[1,1], defaultColor:'#bfdbfe', accentColor:'#1d4ed8',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="18" width="24" height="32" rx="4" fill="#1d4ed8"/><ellipse cx="26" cy="18" rx="12" ry="8" fill="#bfdbfe"/><rect x="18" y="26" width="16" height="20" rx="3" fill="#1e40af"/><circle cx="26" cy="36" r="4" fill="#bfdbfe" opacity="0.7"/><rect x="16" y="46" width="20" height="4" rx="2" fill="#1d4ed8" opacity="0.6"/></svg>` },
  { id:'dining-table', name:'Dining Table', category:'kitchen', tier:'free', size:[3,2], defaultColor:'#d4c5a0', accentColor:'#8B6340',
    svg:`<svg viewBox="0 0 156 104" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="148" height="96" rx="6" fill="#d4c5a0" stroke="#8B6340" stroke-width="2"/><circle cx="14" cy="14" r="6" fill="#8B6340" opacity="0.7"/><circle cx="142" cy="14" r="6" fill="#8B6340" opacity="0.7"/><circle cx="14" cy="90" r="6" fill="#8B6340" opacity="0.7"/><circle cx="142" cy="90" r="6" fill="#8B6340" opacity="0.7"/></svg>` },
  { id:'vending-machine', name:'Vending Machine', category:'kitchen', tier:'free', size:[1,1], defaultColor:'#dc2626', accentColor:'#991b1b', placement:'wall',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="40" height="44" rx="4" fill="#dc2626"/><rect x="10" y="8" width="22" height="24" rx="2" fill="#1e40af" opacity="0.6"/><rect x="34" y="8" width="8" height="6" rx="1" fill="#475569"/><rect x="34" y="18" width="8" height="6" rx="1" fill="#475569"/><rect x="34" y="28" width="8" height="6" rx="1" fill="#22c55e" opacity="0.8"/><rect x="10" y="36" width="30" height="8" rx="3" fill="#0f172a"/></svg>` },

  // IT & INFRASTRUCTURE
  { id:'monitor-single', name:'Single Monitor', category:'it', tier:'free', size:[1,1], defaultColor:'#3b82f6', accentColor:'#1e293b',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="48" height="36" rx="4" fill="#1a1a2e" stroke="#1e293b" stroke-width="1.5"/><rect x="6" y="6" width="40" height="28" rx="2" fill="#3b82f6" opacity="0.85"/><rect x="22" y="38" width="8" height="6" rx="2" fill="#334155"/><rect x="14" y="44" width="24" height="4" rx="2" fill="#334155"/></svg>` },
  { id:'monitor-dual', name:'Dual Monitor', category:'it', tier:'free', size:[2,1], defaultColor:'#3b82f6', accentColor:'#1e293b',
    svg:`<svg viewBox="0 0 112 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="50" height="36" rx="4" fill="#1a1a2e" stroke="#1e293b" stroke-width="1.5"/><rect x="6" y="6" width="42" height="28" rx="2" fill="#3b82f6" opacity="0.85"/><rect x="22" y="38" width="10" height="6" rx="2" fill="#334155"/><rect x="60" y="2" width="50" height="36" rx="4" fill="#1a1a2e" stroke="#1e293b" stroke-width="1.5"/><rect x="64" y="6" width="42" height="28" rx="2" fill="#3b82f6" opacity="0.85"/><rect x="80" y="38" width="10" height="6" rx="2" fill="#334155"/></svg>` },
  { id:'monitor-triple', name:'Triple Monitor', category:'it', tier:'premium', price:80, size:[3,1], defaultColor:'#8b5cf6', accentColor:'#1e293b',
    svg:`<svg viewBox="0 0 164 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="48" height="36" rx="4" fill="#1a1a2e" stroke="#1e293b" stroke-width="1.5"/><rect x="6" y="6" width="40" height="28" rx="2" fill="#8b5cf6" opacity="0.85"/><rect x="58" y="0" width="48" height="36" rx="4" fill="#1a1a2e" stroke="#1e293b" stroke-width="1.5"/><rect x="62" y="4" width="40" height="28" rx="2" fill="#8b5cf6" opacity="0.95"/><rect x="114" y="2" width="48" height="36" rx="4" fill="#1a1a2e" stroke="#1e293b" stroke-width="1.5"/><rect x="118" y="6" width="40" height="28" rx="2" fill="#8b5cf6" opacity="0.85"/></svg>` },
  { id:'server-rack-12u', name:'Server Rack (12U)', category:'it', tier:'free', size:[1,2], defaultColor:'#3b82f6', accentColor:'#0f172a', placement:'wall',
    svg:`<svg viewBox="0 0 52 108" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="48" height="104" rx="3" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5"/><rect x="6" y="8" width="40" height="6" rx="1" fill="#3b82f6" opacity="0.5"/><circle cx="42" cy="11" r="1.5" fill="#22c55e"/><rect x="6" y="18" width="40" height="6" rx="1" fill="#3b82f6" opacity="0.45"/><circle cx="42" cy="21" r="1.5" fill="#22c55e"/><rect x="6" y="28" width="40" height="6" rx="1" fill="#3b82f6" opacity="0.5"/><circle cx="42" cy="31" r="1.5" fill="#f59e0b"/><rect x="6" y="38" width="40" height="6" rx="1" fill="#3b82f6" opacity="0.45"/><circle cx="42" cy="41" r="1.5" fill="#22c55e"/><rect x="6" y="48" width="40" height="6" rx="1" fill="#3b82f6" opacity="0.5"/><circle cx="42" cy="51" r="1.5" fill="#22c55e"/><rect x="6" y="58" width="40" height="6" rx="1" fill="#3b82f6" opacity="0.4"/><rect x="6" y="68" width="40" height="6" rx="1" fill="#3b82f6" opacity="0.5"/><rect x="6" y="78" width="40" height="6" rx="1" fill="#1e40af" opacity="0.8"/><rect x="6" y="88" width="40" height="14" rx="2" fill="#1e293b"/></svg>` },
  { id:'server-rack-42u', name:'Server Rack (42U)', category:'it', tier:'premium', price:120, size:[1,2], defaultColor:'#06b6d4', accentColor:'#0f172a', placement:'wall',
    svg:`<svg viewBox="0 0 52 108" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="48" height="104" rx="3" fill="#0f172a" stroke="#06b6d4" stroke-width="2"/><rect x="4" y="4" width="44" height="4" rx="1" fill="#06b6d4" opacity="0.4"/>${Array.from({length:10}, (_,i)=>`<rect x="6" y="${10+i*9}" width="40" height="7" rx="1" fill="#06b6d4" opacity="${0.35+i*0.02}"/><circle cx="42" cy="${13+i*9}" r="1.5" fill="#22c55e" opacity="0.9"/>`).join('')}</svg>` },
  { id:'network-switch', name:'Network Switch', category:'it', tier:'free', size:[1,1], defaultColor:'#22c55e', accentColor:'#1e293b',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="16" width="44" height="20" rx="4" fill="#1e293b"/><rect x="8" y="20" width="36" height="12" rx="2" fill="#0f172a"/><circle cx="12" cy="26" r="1.5" fill="#22c55e" opacity="0.9"/><circle cx="16" cy="26" r="1.5" fill="#22c55e" opacity="0.9"/><circle cx="20" cy="26" r="1.5" fill="#22c55e" opacity="0.7"/><circle cx="24" cy="26" r="1.5" fill="#f59e0b" opacity="0.9"/><circle cx="28" cy="26" r="1.5" fill="#22c55e" opacity="0.9"/><circle cx="32" cy="26" r="1.5" fill="#22c55e" opacity="0.8"/><rect x="38" y="21" width="5" height="4" rx="1" fill="#f59e0b" opacity="0.8"/></svg>` },
  { id:'ups', name:'UPS Unit', category:'it', tier:'free', size:[1,1], defaultColor:'#f59e0b', accentColor:'#1e293b',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="10" width="40" height="32" rx="4" fill="#1e293b"/><rect x="10" y="14" width="32" height="18" rx="3" fill="#0f172a"/><path d="M22 18 l5 7 l-3 0 l5 7" stroke="#f59e0b" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="10" y="34" width="12" height="5" rx="2" fill="#334155"/><rect x="24" y="34" width="18" height="5" rx="2" fill="#475569"/></svg>` },
  { id:'printer', name:'Printer / MFP', category:'it', tier:'free', size:[2,2], defaultColor:'#e2e8f0', accentColor:'#334155',
    svg:`<svg viewBox="0 0 104 104" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="96" height="96" rx="6" fill="#334155"/><rect x="8" y="8" width="88" height="40" rx="4" fill="#e2e8f0"/><rect x="8" y="52" width="88" height="40" rx="4" fill="#e2e8f0" opacity="0.8"/><rect x="14" y="14" width="76" height="26" rx="3" fill="#cbd5e1"/><rect x="14" y="58" width="76" height="4" rx="2" fill="#94a3b8"/><rect x="14" y="66" width="52" height="18" rx="2" fill="#94a3b8" opacity="0.4"/><circle cx="80" cy="74" r="8" fill="#334155"/><circle cx="80" cy="74" r="5" fill="#3b82f6" opacity="0.8"/></svg>` },
  { id:'tv-screen', name:'TV / Display', category:'it', tier:'free', size:[3,1], defaultColor:'#3b82f6', accentColor:'#1e293b', placement:'wall',
    svg:`<svg viewBox="0 0 156 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="152" height="44" rx="4" fill="#0f172a" stroke="#1e293b" stroke-width="2"/><rect x="6" y="6" width="144" height="36" rx="2" fill="#3b82f6" opacity="0.85"/><rect x="70" y="46" width="16" height="4" rx="2" fill="#334155"/></svg>` },
  { id:'wifi-ap', name:'WiFi Access Point', category:'it', tier:'free', size:[1,1], defaultColor:'#22c55e', accentColor:'#f8fafc', placement:'ceiling',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="26" r="22" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/><circle cx="26" cy="26" r="5" fill="#22c55e"/><path d="M14 22 a16 16 0 0 1 24 0" stroke="#22c55e" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.8"/><path d="M8 17 a24 24 0 0 1 36 0" stroke="#22c55e" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.4"/></svg>` },
  { id:'workstation-pc', name:'Workstation PC', category:'it', tier:'free', size:[1,1], defaultColor:'#475569', accentColor:'#1e293b',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="4" width="28" height="40" rx="4" fill="#1e293b"/><rect x="16" y="8" width="20" height="28" rx="3" fill="#475569"/><circle cx="26" cy="40" r="3" fill="#22c55e" opacity="0.8"/><rect x="8" y="44" width="36" height="4" rx="2" fill="#334155"/></svg>` },
  { id:'video-bar', name:'Conference Video Bar', category:'it', tier:'premium', price:80, size:[2,1], defaultColor:'#1e293b', accentColor:'#3b82f6', placement:'wall',
    svg:`<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="14" width="96" height="24" rx="8" fill="#1e293b"/><circle cx="26" cy="26" r="10" fill="#0f172a"/><circle cx="26" cy="26" r="7" fill="#3b82f6" opacity="0.6"/><circle cx="26" cy="26" r="3" fill="#1e293b"/><rect x="42" y="20" width="50" height="12" rx="4" fill="#334155"/><circle cx="52" cy="26" r="2" fill="#22c55e" opacity="0.8"/><circle cx="62" cy="26" r="2" fill="#22c55e" opacity="0.6"/><circle cx="72" cy="26" r="2" fill="#22c55e" opacity="0.4"/></svg>` },

  // WELLNESS
  { id:'plant-small', name:'Small Plant', category:'wellness', tier:'free', size:[1,1], defaultColor:'#22c55e', accentColor:'#b45309',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><ellipse cx="26" cy="36" rx="10" ry="7" fill="#b45309"/><circle cx="26" cy="20" rx="18" ry="18" r="14" fill="#22c55e" opacity="0.9"/><circle cx="18" cy="16" r="9" fill="#22c55e" opacity="0.8"/><circle cx="34" cy="17" r="8" fill="#22c55e" opacity="0.85"/><circle cx="26" cy="12" r="7" fill="#16a34a" opacity="0.7"/></svg>` },
  { id:'plant-medium', name:'Medium Plant', category:'wellness', tier:'free', size:[1,1], defaultColor:'#16a34a', accentColor:'#92400e',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><ellipse cx="26" cy="38" rx="11" ry="8" fill="#92400e"/><circle cx="26" cy="22" r="16" fill="#16a34a" opacity="0.9"/><circle cx="17" cy="18" r="10" fill="#16a34a" opacity="0.8"/><circle cx="35" cy="19" r="9" fill="#16a34a" opacity="0.85"/><circle cx="26" cy="12" r="8" fill="#15803d" opacity="0.7"/></svg>` },
  { id:'plant-large', name:'Large Plant', category:'wellness', tier:'free', size:[2,2], defaultColor:'#15803d', accentColor:'#78350f',
    svg:`<svg viewBox="0 0 104 104" xmlns="http://www.w3.org/2000/svg"><ellipse cx="52" cy="78" rx="22" ry="14" fill="#78350f"/><circle cx="52" cy="44" rx="40" ry="40" r="36" fill="#15803d" opacity="0.9"/><circle cx="34" cy="36" rx="24" r="22" fill="#15803d" opacity="0.8"/><circle cx="70" cy="38" r="20" fill="#15803d" opacity="0.85"/><circle cx="52" cy="24" r="18" fill="#166534" opacity="0.7"/></svg>` },
  { id:'plant-wall', name:'Living Plant Wall', category:'wellness', tier:'premium', price:220, size:[3,1], defaultColor:'#16a34a', accentColor:'#14532d', placement:'wall',
    svg:`<svg viewBox="0 0 156 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="152" height="48" rx="4" fill="#14532d"/><circle cx="14" cy="16" r="8" fill="#16a34a" opacity="0.85"/><circle cx="28" cy="24" r="7" fill="#22c55e" opacity="0.7"/><circle cx="40" cy="12" r="9" fill="#16a34a" opacity="0.8"/><circle cx="56" cy="22" r="7" fill="#22c55e" opacity="0.75"/><circle cx="68" cy="14" r="8" fill="#16a34a" opacity="0.85"/><circle cx="82" cy="26" r="6" fill="#22c55e" opacity="0.7"/><circle cx="96" cy="12" r="8" fill="#16a34a" opacity="0.8"/><circle cx="110" cy="22" r="7" fill="#22c55e" opacity="0.75"/><circle cx="122" cy="14" r="9" fill="#16a34a" opacity="0.85"/><circle cx="140" cy="20" r="7" fill="#22c55e" opacity="0.7"/><circle cx="150" cy="12" r="5" fill="#16a34a" opacity="0.8"/></svg>` },
  { id:'nap-pod', name:'Nap Pod', category:'wellness', tier:'premium', price:300, size:[2,3], defaultColor:'#f0f9ff', accentColor:'#0369a1',
    svg:`<svg viewBox="0 0 104 156" xmlns="http://www.w3.org/2000/svg"><ellipse cx="52" cy="78" rx="48" ry="72" fill="#0369a1"/><ellipse cx="52" cy="84" rx="42" ry="64" fill="#f0f9ff"/><ellipse cx="52" cy="30" rx="38" ry="26" fill="#bae6fd" opacity="0.8"/><rect x="22" y="100" width="60" height="30" rx="8" fill="#e0f2fe"/><circle cx="52" cy="20" r="6" fill="#0369a1" opacity="0.5"/></svg>` },
  { id:'yoga-mat', name:'Yoga Mat', category:'wellness', tier:'free', size:[2,1], defaultColor:'#a855f7', accentColor:'#7e22ce',
    svg:`<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="96" height="32" rx="14" fill="#a855f7"/><rect x="8" y="14" width="88" height="24" rx="10" fill="#c084fc" opacity="0.5"/></svg>` },

  // DECOR
  { id:'rug-small', name:'Area Rug (Small)', category:'decor', tier:'free', size:[3,2], defaultColor:'#dc2626', accentColor:'#991b1b',
    svg:`<svg viewBox="0 0 156 104" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="148" height="96" rx="6" fill="#dc2626"/><rect x="12" y="12" width="132" height="80" rx="4" fill="#991b1b" opacity="0.3"/><rect x="20" y="20" width="116" height="64" rx="3" fill="#dc2626"/><rect x="28" y="28" width="100" height="48" rx="2" fill="#b91c1c" opacity="0.4"/></svg>` },
  { id:'rug-large', name:'Area Rug (Large)', category:'decor', tier:'free', size:[5,3], defaultColor:'#2563eb', accentColor:'#1e40af',
    svg:`<svg viewBox="0 0 260 156" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="252" height="148" rx="8" fill="#2563eb"/><rect x="14" y="14" width="232" height="128" rx="5" fill="#1e40af" opacity="0.4"/><rect x="24" y="24" width="212" height="108" rx="4" fill="#2563eb"/><ellipse cx="130" cy="78" rx="60" ry="38" fill="#93c5fd" opacity="0.2"/></svg>` },
  { id:'artwork', name:'Wall Art / Frame', category:'decor', tier:'free', size:[2,1], defaultColor:'#f59e0b', accentColor:'#92400e', placement:'wall',
    svg:`<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="96" height="44" rx="3" fill="#92400e"/><rect x="10" y="10" width="84" height="32" rx="2" fill="#f59e0b" opacity="0.9"/><ellipse cx="52" cy="26" rx="20" ry="11" fill="#f97316" opacity="0.6"/></svg>` },
  { id:'clock', name:'Wall Clock', category:'decor', tier:'free', size:[1,1], defaultColor:'#f8fafc', accentColor:'#1e293b', placement:'wall',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="26" r="24" fill="#1e293b"/><circle cx="26" cy="26" r="22" fill="#f8fafc"/><circle cx="26" cy="26" r="2" fill="#1e293b"/><line x1="26" y1="26" x2="26" y2="10" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/><line x1="26" y1="26" x2="36" y2="26" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/></svg>` },

  // STRUCTURAL
  { id:'wall-h', name:'Wall (Horizontal)', category:'structural', tier:'free', size:[4,1], defaultColor:'#94a3b8', accentColor:'#475569',
    svg:`<svg viewBox="0 0 208 52" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="14" width="208" height="24" rx="3" fill="#94a3b8"/><rect x="0" y="18" width="208" height="16" rx="2" fill="#cbd5e1" opacity="0.5"/></svg>` },
  { id:'wall-v', name:'Wall (Vertical)', category:'structural', tier:'free', size:[1,4], defaultColor:'#94a3b8', accentColor:'#475569',
    svg:`<svg viewBox="0 0 52 208" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="0" width="24" height="208" rx="3" fill="#94a3b8"/><rect x="18" y="0" width="16" height="208" rx="2" fill="#cbd5e1" opacity="0.5"/></svg>` },
  { id:'glass-partition', name:'Glass Partition', category:'structural', tier:'premium', price:100, size:[4,1], defaultColor:'#bae6fd', accentColor:'#334155',
    svg:`<svg viewBox="0 0 208 52" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="18" width="208" height="16" rx="2" fill="#334155"/><rect x="4" y="20" width="200" height="12" rx="1" fill="#bae6fd" opacity="0.7"/><rect x="0" y="12" width="208" height="6" rx="2" fill="#475569"/><rect x="0" y="34" width="208" height="6" rx="2" fill="#475569"/></svg>` },
  { id:'door', name:'Door', category:'structural', tier:'free', size:[2,1], defaultColor:'#d4a96a', accentColor:'#8B6340',
    svg:`<svg viewBox="0 0 104 52" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="10" width="44" height="36" rx="3" fill="#d4a96a"/><rect x="4" y="12" width="40" height="32" rx="2" fill="#c49050"/><circle cx="38" cy="26" r="3" fill="#8B6340"/><path d="M46 10 a44 44 0 0 0 44 44" stroke="#8B6340" stroke-width="1.5" fill="none" stroke-dasharray="4 2" opacity="0.5"/><line x1="46" y1="10" x2="46" y2="50" stroke="#475569" stroke-width="3"/></svg>` },

  // FLOORS
  { id:'floor-hardwood', name:'Hardwood', category:'floors', tier:'free', size:[1,1], defaultColor:'#d4a96a', accentColor:'#b08040',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect width="52" height="52" fill="#d4a96a"/><rect y="0" width="52" height="13" fill="#c49050" opacity="0.3"/><rect y="13" width="52" height="13" fill="#b08040" opacity="0.2"/><rect y="26" width="52" height="13" fill="#c49050" opacity="0.3"/><rect y="39" width="52" height="13" fill="#b08040" opacity="0.2"/><line x1="0" y1="13" x2="52" y2="13" stroke="#b08040" stroke-width="0.5" opacity="0.5"/><line x1="0" y1="26" x2="52" y2="26" stroke="#b08040" stroke-width="0.5" opacity="0.5"/><line x1="0" y1="39" x2="52" y2="39" stroke="#b08040" stroke-width="0.5" opacity="0.5"/></svg>` },
  { id:'floor-concrete', name:'Concrete', category:'floors', tier:'free', size:[1,1], defaultColor:'#94a3b8', accentColor:'#64748b',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect width="52" height="52" fill="#94a3b8"/><line x1="0" y1="26" x2="52" y2="26" stroke="#64748b" stroke-width="0.4" opacity="0.4"/><line x1="26" y1="0" x2="26" y2="52" stroke="#64748b" stroke-width="0.4" opacity="0.4"/></svg>` },
  { id:'floor-carpet', name:'Carpet (Blue)', category:'floors', tier:'free', size:[1,1], defaultColor:'#3b82f6', accentColor:'#1d4ed8',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect width="52" height="52" fill="#3b82f6"/><circle cx="8" cy="8" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="20" cy="8" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="32" cy="8" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="44" cy="8" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="14" cy="20" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="26" cy="20" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="38" cy="20" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="8" cy="32" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="20" cy="32" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="32" cy="32" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="44" cy="32" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="14" cy="44" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="26" cy="44" r="1.5" fill="#1d4ed8" opacity="0.4"/><circle cx="38" cy="44" r="1.5" fill="#1d4ed8" opacity="0.4"/></svg>` },
  { id:'floor-marble', name:'Marble', category:'floors', tier:'premium', price:80, size:[1,1], defaultColor:'#f1f5f9', accentColor:'#cbd5e1',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect width="52" height="52" fill="#f1f5f9"/><path d="M0 20 q13 -8 26 4 q13 12 26 -4" stroke="#cbd5e1" stroke-width="0.8" fill="none" opacity="0.6"/><path d="M0 36 q13 -8 26 4 q13 12 26 -4" stroke="#cbd5e1" stroke-width="0.6" fill="none" opacity="0.4"/><line x1="0" y1="26" x2="52" y2="26" stroke="#e2e8f0" stroke-width="0.5"/><line x1="26" y1="0" x2="26" y2="52" stroke="#e2e8f0" stroke-width="0.5"/></svg>` },
  { id:'floor-tile', name:'Ceramic Tile', category:'floors', tier:'free', size:[1,1], defaultColor:'#f8fafc', accentColor:'#cbd5e1',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect width="52" height="52" fill="#f8fafc"/><rect x="1" y="1" width="24" height="24" fill="none" stroke="#cbd5e1" stroke-width="0.8"/><rect x="27" y="1" width="24" height="24" fill="none" stroke="#cbd5e1" stroke-width="0.8"/><rect x="1" y="27" width="24" height="24" fill="none" stroke="#cbd5e1" stroke-width="0.8"/><rect x="27" y="27" width="24" height="24" fill="none" stroke="#cbd5e1" stroke-width="0.8"/></svg>` },
  { id:'floor-grass', name:'Outdoor Grass', category:'floors', tier:'free', size:[1,1], defaultColor:'#22c55e', accentColor:'#16a34a',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect width="52" height="52" fill="#22c55e"/><path d="M6 52 q2 -10 0 -18 q-2 10 0 18" fill="#16a34a" opacity="0.5"/><path d="M16 52 q2 -8 0 -14 q-2 8 0 14" fill="#16a34a" opacity="0.4"/><path d="M26 52 q2 -12 0 -20 q-2 12 0 20" fill="#16a34a" opacity="0.5"/><path d="M36 52 q2 -9 0 -16 q-2 9 0 16" fill="#16a34a" opacity="0.45"/><path d="M46 52 q2 -7 0 -13 q-2 7 0 13" fill="#16a34a" opacity="0.4"/></svg>` },
  { id:'floor-dark-wood', name:'Dark Hardwood', category:'floors', tier:'premium', price:60, size:[1,1], defaultColor:'#7c4d0f', accentColor:'#5c3508',
    svg:`<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"><rect width="52" height="52" fill="#7c4d0f"/><rect y="0" width="52" height="13" fill="#6b400b" opacity="0.5"/><rect y="13" width="52" height="13" fill="#8b5a12" opacity="0.3"/><rect y="26" width="52" height="13" fill="#6b400b" opacity="0.5"/><rect y="39" width="52" height="13" fill="#8b5a12" opacity="0.3"/><line x1="0" y1="13" x2="52" y2="13" stroke="#5c3508" stroke-width="0.5" opacity="0.6"/><line x1="0" y1="26" x2="52" y2="26" stroke="#5c3508" stroke-width="0.5" opacity="0.6"/><line x1="0" y1="39" x2="52" y2="39" stroke="#5c3508" stroke-width="0.5" opacity="0.6"/></svg>` },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAssetById(id: string): OfficeFurnitureAsset | undefined {
  return OFFICE_ASSETS.find(a => a.id === id)
}

export function isAssetUnlocked(
  asset: OfficeFurnitureAsset,
  isSuperAdmin: boolean,
  ownedAssets: string[],
): boolean {
  if (asset.tier === 'free') return true
  if (isSuperAdmin) return true
  return ownedAssets.includes(asset.id)
}

/** Replace the asset's defaultColor with a custom color in its SVG string */
export function tintSvg(svg: string, defaultColor: string, newColor: string): string {
  const dc = defaultColor.toLowerCase()
  return svg
    .replace(new RegExp('"' + dc + '"', 'gi'), '"' + newColor + '"')
    .replace(new RegExp("'" + dc + "'", 'gi'), "'" + newColor + "'")
    .replace(new RegExp('fill:' + dc, 'gi'), 'fill:' + newColor)
    .replace(new RegExp('stroke:' + dc, 'gi'), 'stroke:' + newColor)
}

export const ZONE_COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#9333ea', '#0284c7',
]
