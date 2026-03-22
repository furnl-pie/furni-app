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

// ── 기사별 색상 칩 (20가지 고유 색상) ─────────────────────────────
export const DRIVER_COLORS = [
  { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' }, // 파랑
  { bg:'#f0fdf4', color:'#15803d', border:'#86efac' }, // 초록
  { bg:'#fefce8', color:'#a16207', border:'#fde68a' }, // 황금
  { bg:'#fdf4ff', color:'#7e22ce', border:'#e9d5ff' }, // 보라
  { bg:'#fff1f2', color:'#be123c', border:'#fecdd3' }, // 장미
  { bg:'#ecfeff', color:'#0e7490', border:'#a5f3fc' }, // 청록
  { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa' }, // 오렌지
  { bg:'#f0fdfa', color:'#0f766e', border:'#99f6e4' }, // 틸
  { bg:'#eef2ff', color:'#4338ca', border:'#c7d2fe' }, // 인디고
  { bg:'#f7fee7', color:'#3f6212', border:'#bef264' }, // 라임
  { bg:'#fef2f2', color:'#b91c1c', border:'#fca5a5' }, // 빨강
  { bg:'#fdf2f8', color:'#9d174d', border:'#f9a8d4' }, // 핑크
  { bg:'#f0f9ff', color:'#0369a1', border:'#7dd3fc' }, // 스카이
  { bg:'#ecfdf5', color:'#065f46', border:'#6ee7b7' }, // 에메랄드
  { bg:'#f5f3ff', color:'#5b21b6', border:'#ddd6fe' }, // 바이올렛
  { bg:'#fffbeb', color:'#92400e', border:'#fcd34d' }, // 앰버
  { bg:'#fef9c3', color:'#713f12', border:'#fde047' }, // 노랑
  { bg:'#fce7f3', color:'#831843', border:'#f9a8d4' }, // 퓨시아
  { bg:'#f1f5f9', color:'#334155', border:'#cbd5e1' }, // 슬레이트
  { bg:'#fff8f1', color:'#7c2d12', border:'#fdba74' }, // 브라운
]

export function driverChip(driverId, drivers) {
  const idx = drivers.findIndex(d => d.id === driverId)
  return idx >= 0 ? DRIVER_COLORS[idx % DRIVER_COLORS.length] : null
}
