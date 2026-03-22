// ── 날짜 유틸 ─────────────────────────────────────────────────────
export function getKSTToday() {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}
export const today = getKSTToday()

export function nowTime() {
  return new Date().toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', hour12:false })
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
  '대기':   { color: muted,  bg: '#f1f5f9', label: '대기' },
  '이동중': { color: blue,   bg: '#dbeafe', label: '🚚 이동중' },
  '진행중': { color: amber,  bg: '#fef3c7', label: '● 진행중' },
  '완료':   { color: green,  bg: '#dcfce7', label: '✓ 완료' },
}

export const iStyle = {
  width:'100%', padding:'9px 12px', border:`1px solid ${border}`,
  borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box',
  background:'#f8fafc', color:'#1e293b', WebkitTextFillColor:'#1e293b',
  colorScheme:'light', appearance:'none', WebkitAppearance:'none',
}

// ── 기사별 색상 칩 (30가지 고유 색상) ─────────────────────────────
export const DRIVER_COLORS = [
  { bg:'#dbeafe', color:'#1e3a8a', border:'#93c5fd' }, // 딥블루
  { bg:'#dcfce7', color:'#14532d', border:'#4ade80' }, // 딥그린
  { bg:'#fde68a', color:'#78350f', border:'#f59e0b' }, // 딥앰버
  { bg:'#e9d5ff', color:'#4c1d95', border:'#a855f7' }, // 딥퍼플
  { bg:'#fecdd3', color:'#881337', border:'#f43f5e' }, // 딥로즈
  { bg:'#a5f3fc', color:'#164e63', border:'#06b6d4' }, // 딥시안
  { bg:'#fed7aa', color:'#7c2d12', border:'#f97316' }, // 딥오렌지
  { bg:'#99f6e4', color:'#134e4a', border:'#14b8a6' }, // 딥틸
  { bg:'#c7d2fe', color:'#312e81', border:'#6366f1' }, // 딥인디고
  { bg:'#d9f99d', color:'#365314', border:'#84cc16' }, // 딥라임
  { bg:'#fca5a5', color:'#7f1d1d', border:'#ef4444' }, // 딥레드
  { bg:'#fbcfe8', color:'#831843', border:'#ec4899' }, // 딥핑크
  { bg:'#7dd3fc', color:'#0c4a6e', border:'#0ea5e9' }, // 딥스카이
  { bg:'#6ee7b7', color:'#064e3b', border:'#10b981' }, // 딥에메랄드
  { bg:'#ddd6fe', color:'#2e1065', border:'#8b5cf6' }, // 딥바이올렛
  { bg:'#fde047', color:'#713f12', border:'#eab308' }, // 딥옐로우
  { bg:'#f9a8d4', color:'#500724', border:'#db2777' }, // 딥퓨시아
  { bg:'#94a3b8', color:'#0f172a', border:'#475569' }, // 딥슬레이트
  { bg:'#fdba74', color:'#431407', border:'#ea580c' }, // 딥브라운
  { bg:'#86efac', color:'#052e16', border:'#22c55e' }, // 딥민트
  { bg:'#bfdbfe', color:'#1e3a8a', border:'#3b82f6' }, // 미드블루
  { bg:'#bbf7d0', color:'#14532d', border:'#16a34a' }, // 미드그린
  { bg:'#fef08a', color:'#854d0e', border:'#ca8a04' }, // 미드옐로우
  { bg:'#f0abfc', color:'#4a044e', border:'#d946ef' }, // 미드매젠타
  { bg:'#fda4af', color:'#4c0519', border:'#e11d48' }, // 미드크림슨
  { bg:'#67e8f9', color:'#083344', border:'#0891b2' }, // 미드아쿠아
  { bg:'#6ee7b7', color:'#022c22', border:'#059669' }, // 미드세이지
  { bg:'#c4b5fd', color:'#1e0a4a', border:'#7c3aed' }, // 미드라벤더
  { bg:'#fbbf24', color:'#451a03', border:'#d97706' }, // 미드골드
  { bg:'#86d9fa', color:'#0a2540', border:'#0284c7' }, // 미드코발트
]

export function driverChip(driverId, drivers) {
  const idx = drivers.findIndex(d => d.id === driverId)
  return idx >= 0 ? DRIVER_COLORS[idx % DRIVER_COLORS.length] : null
}
