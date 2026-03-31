// ── 날짜 유틸 ─────────────────────────────────────────────────────
export function getKSTToday() {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}
export const today = getKSTToday()

export function nowTime() {
  const d = new Date()
  d.setMinutes(Math.round(d.getMinutes() / 5) * 5, 0, 0)
  return d.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', hour12:false })
}

// ── 기사 정렬 ──────────────────────────────────────────────────────
export const DRIVER_ORDER_PRESET = [
  '김일석','양승민','박종태','이동수','문정완','강희순','승호진','정효진',
  '이상구','김남선','석유현','최권호','한태섭','최기언','민병근','이선우','박성민'
]

export function getDriverSortKey(d) {
  const presetIdx = DRIVER_ORDER_PRESET.indexOf(d.name)
  if (presetIdx >= 0) return presetIdx
  if (d.driverOrder != null) return 100 + d.driverOrder
  return 99999
}

// ── 색상 ──────────────────────────────────────────────────────────
export const navy   = '#1b3a5c'
export const blue   = '#2563eb'
export const green  = '#059669'
export const amber  = '#b45309'
export const red    = '#dc2626'
export const border = '#e2e8f0'
export const muted  = '#64748b'
export const textC  = '#1e293b'

export const STATUS_CFG = {
  '대기':    { color: '#6b7280', bg: '#f3f4f6', border: 'transparent', label: '대기' },
  '이동중':  { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa',      label: '🚚 이동중' },
  '진행중':  { color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe',      label: '● 작업중' },
  '완료':    { color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0',      label: '✓ 완료' },
  '청구완료': { color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc',     label: '💰 청구' },
}

export const iStyle = {
  width:'100%', padding:'9px 12px', border:`1px solid ${border}`,
  borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box',
  background:'#f8fafc', color:'#1e293b', WebkitTextFillColor:'#1e293b',
  colorScheme:'light', appearance:'none', WebkitAppearance:'none',
}

// ── 기사별 지정 색상 (이름 키워드 기반) ───────────────────────────
const DRIVER_NAME_COLORS = [
  { keys: ['승환'], hex: '#FFFF00' },
  { keys: ['희순'], hex: '#92CDDC' },
  { keys: ['성민'], hex: '#31869B' },
  { keys: ['선우'], hex: '#FFC000' },
  { keys: ['호진'], hex: '#DA9694' },
  { keys: ['효진'], hex: '#76933C' },
  { keys: ['태섭'], hex: '#00B050' },
  { keys: ['정길'], hex: '#FDE9D9' },
  { keys: ['동수'], hex: '#B1A0C7' },
  { keys: ['정완'], hex: '#92D050' },
  { keys: ['기언'], hex: '#0070C0' },
  { keys: ['병근'], hex: '#95B3D7' },
  { keys: ['유현'], hex: '#FFCCCC' },
  { keys: ['남선'], hex: '#E26B0A' },
  { keys: ['권호'], hex: '#BFBFBF' },
  { keys: ['상구'], hex: '#00FF99' },
]

export function hexToArgb(hex) {
  return 'FF' + hex.replace('#', '').toUpperCase()
}

export { DRIVER_NAME_COLORS }

function chipFromHex(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const color = lum > 0.5 ? '#1e293b' : '#ffffff'
  return { bg: hex, color, border: hex }
}

export function driverChip(driverId, drivers) {
  const driver = drivers.find(d => d.id === driverId)
  if (!driver) return null
  const name = driver.name || ''
  const match = DRIVER_NAME_COLORS.find(m => m.keys.some(k => name.includes(k)))
  if (match) return chipFromHex(match.hex)
  // 매핑 없는 기사는 인덱스 기반 fallback
  const idx = drivers.findIndex(d => d.id === driverId)
  const FALLBACK = ['#cbd5e1','#d1fae5','#fef3c7','#ede9fe','#fee2e2','#e0f2fe']
  return chipFromHex(FALLBACK[idx % FALLBACK.length])
}
