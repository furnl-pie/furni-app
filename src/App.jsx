import { useState, useRef, Fragment, useEffect } from "react"
import { useAppData } from './hooks/useAppData'

const INIT_USERS = [
  { id:'퍼니', name:'관리자', role:'admin', pw:'admin', phone:'010-0000-0000' },
]
let USERS = INIT_USERS

// 기사 등록 순서 프리셋
const DRIVER_ORDER_PRESET = [
  '김일석','양승민','박종태','이동수','문정완','강희순','승호진','정효진',
  '이상구','김남선','석유현','최권호','한태섭','최기언','민병근','이선우','박성민'
]
// 프리셋에 있는 기사 → 무조건 프리셋 순서
// 프리셋에 없는 신규 기사 → driverOrder 또는 맨 뒤
function getDriverSortKey(d) {
  const presetIdx = DRIVER_ORDER_PRESET.indexOf(d.name)
  if (presetIdx >= 0) return presetIdx  // 프리셋 우선 (0~16)
  if (d.driverOrder != null) return 100 + d.driverOrder  // 신규기사는 프리셋 뒤
  return 99999
}

// KST 기준 오늘 날짜 (UTC+9, 00시 기준으로 갱신)
function getKSTToday() {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}
const today = getKSTToday()

// ── 색상 / 공용 스타일 ──────────────────────────────────────────
const navy   = '#1b3a5c'
const blue   = '#2563eb'
const green  = '#059669'
const amber  = '#b45309'
const red    = '#dc2626'
const border = '#e2e8f0'
const muted  = '#64748b'
const textC  = '#1e293b'

const STATUS_CFG = {
  '대기':   { color: muted,  bg: '#f1f5f9', label: '대기' },
  '이동중': { color: blue,   bg: '#dbeafe', label: '🚚 이동중' },
  '진행중': { color: amber,  bg: '#fef3c7', label: '● 진행중' },
  '완료':   { color: green,  bg: '#dcfce7', label: '✓ 완료' },
}

const iStyle = {
  width:'100%', padding:'9px 12px', border:`1px solid ${border}`,
  borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box',
  background:'#f8fafc', color:'#1e293b', WebkitTextFillColor:'#1e293b',
  colorScheme:'light', appearance:'none', WebkitAppearance:'none',
}

// ── 공용 컴포넌트 ────────────────────────────────────────────────
function TruckIcon({ width=110, height=70 }) {

  return (
    <svg width={width} height={height} viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">

      <rect x="28" y="12" width="74" height="42" rx="2" fill="#f0f4f8" stroke="#c0ccd8" strokeWidth="1.2"/>

      <line x1="54" y1="12" x2="54" y2="54" stroke="#c0ccd8" strokeWidth="0.7"/>
      <line x1="76" y1="12" x2="76" y2="54" stroke="#c0ccd8" strokeWidth="0.7"/>

      <rect x="28" y="12" width="74" height="5" rx="2" fill="#dde5ee"/>

      <rect x="6" y="22" width="26" height="32" rx="3" fill="#1b3a5c"/>

      <polygon points="6,22 28,12 28,22" fill="#1b3a5c"/>

      <polygon points="10,22 24,14 24,22" fill="#7eb8e8" opacity="0.85"/>

      <rect x="8" y="25" width="10" height="8" rx="1.5" fill="#7eb8e8" opacity="0.7"/>

      <line x1="20" y1="22" x2="20" y2="54" stroke="#0f2740" strokeWidth="0.8"/>

      <rect x="4" y="50" width="28" height="5" rx="1" fill="#0f2740"/>

      <rect x="2" y="26" width="5" height="4" rx="1" fill="#2a5a8c"/>

      <rect x="6" y="54" width="96" height="4" rx="1" fill="#8899aa"/>

      <circle cx="20" cy="62" r="10" fill="#222"/>
      <circle cx="20" cy="62" r="6" fill="#444"/>
      <circle cx="20" cy="62" r="2.5" fill="#aaa"/>

      <circle cx="75" cy="62" r="10" fill="#222"/>
      <circle cx="75" cy="62" r="6" fill="#444"/>
      <circle cx="75" cy="62" r="2.5" fill="#aaa"/>
      <circle cx="93" cy="62" r="10" fill="#222"/>
      <circle cx="93" cy="62" r="6" fill="#444"/>
      <circle cx="93" cy="62" r="2.5" fill="#aaa"/>

      <rect x="32" y="26" width="66" height="20" rx="2" fill="#1b3a5c" opacity="0.08"/>
      <text x="65" y="40" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1b3a5c" fontFamily="'Noto Sans KR', sans-serif" letterSpacing="1">FN퍼니</text>
    </svg>
  )
}

function Badge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG['대기']
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, color:s.color, background:s.bg, whiteSpace:'nowrap' }}>
      {s.label}
    </span>
  )
}

function Btn({ children, onClick, color=blue, outline, style={}, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'10px 18px', borderRadius:8, fontSize:14, fontWeight:600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: outline ? `1.5px solid ${color}` : 'none',
      background: outline ? 'transparent' : (disabled ? '#e2e8f0' : color),
      color: outline ? color : (disabled ? muted : '#fff'),
      transition:'opacity .15s', ...style
    }}>{children}</button>
  )
}

function Card({ children, style={} }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${border}`, padding:16, ...style }}>
      {children}
    </div>
  )
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${border}`, fontSize:14 }}>
      <span style={{ color:muted, fontSize:13 }}>{label}</span>
      <span style={{ fontWeight:500, color:valueColor||textC }}>{value}</span>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:600, color:muted, display:'block', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  )
}

function nowTime() {
  return new Date().toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit', hour12:false })
}

function userName(id) {
  return USERS.find(u => u.id === id)?.name || '?'
}

// 기사별 고정 색상 (인덱스 기반)
const DRIVER_COLORS = [
  { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  { bg:'#f0fdf4', color:'#15803d', border:'#bbf7d0' },
  { bg:'#fefce8', color:'#a16207', border:'#fde68a' },
  { bg:'#fdf4ff', color:'#7e22ce', border:'#e9d5ff' },
  { bg:'#fff1f2', color:'#be123c', border:'#fecdd3' },
  { bg:'#f0f9ff', color:'#0369a1', border:'#bae6fd' },
]
function driverChip(driverId, drivers) {
  const idx = drivers.findIndex(d => d.id === driverId)
  return idx >= 0 ? DRIVER_COLORS[idx % DRIVER_COLORS.length] : null
}

// ── 공용 라이트박스 ───────────────────────────────────────────────
function Lightbox({ photos, index, onClose }) {
  const [cur, setCur] = useState(index)
  const total = photos.length
  const prev = e => { e.stopPropagation(); setCur(i => (i - 1 + total) % total) }
  const next = e => { e.stopPropagation(); setCur(i => (i + 1) % total) }

  const download = e => {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = photos[cur]
    a.download = `완료사진_${String(cur+1).padStart(2,'0')}.jpg`
    a.click()
  }
  const downloadAll = e => { e.stopPropagation(); downloadAllPhotos(photos, '완료사진') }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.93)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:16 }}>
      {total > 1 && (
        <button onClick={prev} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:26, width:46, height:46, borderRadius:'50%', cursor:'pointer' }}>‹</button>
      )}
      <img src={photos[cur]} alt={`사진${cur+1}`} onClick={e=>e.stopPropagation()}
        style={{ maxWidth:'100%', maxHeight:'82vh', borderRadius:10, objectFit:'contain', boxShadow:'0 8px 40px rgba(0,0,0,.6)' }}/>
      {total > 1 && (
        <button onClick={next} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:26, width:46, height:46, borderRadius:'50%', cursor:'pointer' }}>›</button>
      )}
      <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:16, width:36, height:36, borderRadius:'50%', cursor:'pointer' }}>✕</button>

      <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:10, background:'rgba(0,0,0,.55)', padding:'6px 14px', borderRadius:20 }}>
        <span style={{ color:'rgba(255,255,255,.7)', fontSize:13 }}>{cur+1} / {total}</span>
        <button onClick={download}
          style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          ⬇ 이 사진
        </button>
        {total > 1 && (
          <button onClick={downloadAll}
            style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            ⬇ 전체 {total}장
          </button>
        )}
      </div>
    </div>
  )
}

// ── 슬라이드 사진 뷰어 ──────────────────────────────────────────
function SlidePhotoViewer({ photos, onOpen }) {
  const [cur, setCur] = useState(0)
  const total = photos.length
  if (total === 0) return null

  const prev = e => { e.stopPropagation(); setCur(i => (i - 1 + total) % total) }
  const next = e => { e.stopPropagation(); setCur(i => (i + 1) % total) }

  return (
    <div style={{ position:'relative', width:'100%', borderRadius:10, overflow:'hidden', background:'#000', aspectRatio:'4/3' }}>

      <img
        src={photos[cur]} alt={`사진${cur+1}`}
        onClick={() => onOpen && onOpen(cur)}
        style={{ width:'100%', height:'100%', objectFit:'contain', cursor: onOpen ? 'pointer' : 'default', display:'block' }}
      />

      {total > 1 && (
        <button onClick={prev} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', color:'#fff', fontSize:32, width:48, height:48, borderRadius:'50%', cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
      )}

      {total > 1 && (
        <button onClick={next} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', color:'#fff', fontSize:32, width:48, height:48, borderRadius:'50%', cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
      )}

      <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,.55)', color:'#fff', fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:12, whiteSpace:'nowrap' }}>
        {cur + 1} / {total}
      </div>

      {total > 1 && total <= 8 && (
        <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5, marginTop:0 }}>
          {photos.map((_,i) => (
            <div key={i} onClick={e=>{ e.stopPropagation(); setCur(i) }}
              style={{ width: i===cur?14:7, height:7, borderRadius:4, background: i===cur?'#fff':'rgba(255,255,255,.45)', cursor:'pointer', transition:'all .2s' }}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 로그인 화면
// ══════════════════════════════════════════════════════════════
function LoginPage({ onLogin, users }) {
  const [id,        setId]        = useState(() => localStorage.getItem('saved_id') || '')
  const [pw,        setPw]        = useState(() => localStorage.getItem('saved_pw') || '')
  const [saveId,    setSaveId]    = useState(() => localStorage.getItem('save_id') === '1')
  const [savePw,    setSavePw]    = useState(() => localStorage.getItem('save_pw') === '1')
  const [autoLogin, setAutoLogin] = useState(() => localStorage.getItem('auto_login') === '1')
  const [err,       setErr]       = useState('')

  useEffect(() => {
    if (autoLogin && users.length > 0) {
      const savedId = localStorage.getItem('saved_id') || ''
      const savedPw = localStorage.getItem('saved_pw') || ''
      if (savedId && savedPw) {
        const u = users.find(u => u.id === savedId && u.pw === savedPw)
        if (u) onLogin(u)
      }
    }
  }, [users])

  const go = () => {
    const u = users.find(u => u.id === id && u.pw === pw)
    if (!u) return setErr('아이디 또는 비밀번호가 올바르지 않습니다')

    if (saveId)    { localStorage.setItem('saved_id', id); localStorage.setItem('save_id','1') }
    else           { localStorage.removeItem('saved_id');   localStorage.setItem('save_id','0') }
    if (savePw)    { localStorage.setItem('saved_pw', pw); localStorage.setItem('save_pw','1') }
    else           { localStorage.removeItem('saved_pw');   localStorage.setItem('save_pw','0') }
    if (autoLogin) { localStorage.setItem('auto_login','1') }
    else           { localStorage.setItem('auto_login','0') }
    onLogin(u)
  }

  const toggleSaveId = () => {
    const v = !saveId; setSaveId(v)
    if (!v) { setSavePw(false); setAutoLogin(false) }
  }
  const toggleSavePw = () => {
    const v = !savePw; setSavePw(v)
    if (!v) setAutoLogin(false)
    if (v && !saveId) setSaveId(true)
  }
  const toggleAutoLogin = () => {
    const v = !autoLogin; setAutoLogin(v)
    if (v) { setSaveId(true); setSavePw(true) }
  }

  const chkStyle = (on) => ({
    width:18, height:18, borderRadius:4,
    background: on ? navy : '#fff',
    border: `2px solid ${on ? navy : '#cbd5e1'}`,
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', flexShrink:0, transition:'all .15s',
  })

  return (
    <div style={{ minHeight:'100vh', background:navy, display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:20, padding:36, width:'100%', maxWidth:360, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ marginBottom:10, display:'flex', justifyContent:'center' }}>
            <TruckIcon width={120} height={76}/>
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:navy }}>동태관리</div>
          <div style={{ fontSize:13, color:muted, marginTop:4 }}>FN퍼니 일정 관리</div>
        </div>
        <Field label="아이디">
          <input value={id} onChange={e=>{ setId(e.target.value); setErr('') }}
            onKeyDown={e=>e.key==='Enter'&&go()} placeholder="아이디"
            style={{ ...iStyle, color:'#1e293b', WebkitTextFillColor:'#1e293b' }}/>
        </Field>
        <Field label="비밀번호">
          <input type="password" value={pw} onChange={e=>{ setPw(e.target.value); setErr('') }}
            onKeyDown={e=>e.key==='Enter'&&go()} placeholder="비밀번호"
            style={{ ...iStyle, color:'#1e293b', WebkitTextFillColor:'#1e293b' }}/>
        </Field>
        <div style={{ fontSize:12, color:muted, marginBottom:14, marginTop:-6 }}>기본 비밀번호 : 1111</div>

        <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
          {[
            [saveId,    toggleSaveId,    '아이디 저장'],
            [savePw,    toggleSavePw,    '비밀번호 저장'],
            [autoLogin, toggleAutoLogin, '자동 로그인'],
          ].map(([on, fn, label]) => (
            <div key={label} onClick={fn}
              style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', userSelect:'none' }}>
              <div style={chkStyle(on)}>
                {on && <span style={{ color:'#fff', fontSize:11, fontWeight:700, lineHeight:1 }}>✓</span>}
              </div>
              <span style={{ fontSize:13, color: on ? textC : muted, fontWeight: on ? 600 : 400 }}>{label}</span>
            </div>
          ))}
        </div>

        {err && <div style={{ fontSize:12, color:red, marginBottom:12, textAlign:'center' }}>{err}</div>}
        <Btn onClick={go} style={{ width:'100%', padding:13, fontSize:15, borderRadius:10 }}>로그인</Btn>
        <div style={{ textAlign:'right', marginTop:14, fontSize:11, color:'#cbd5e1' }}>v1.6.0</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 관리자 앱
// ══════════════════════════════════════════════════════════════
function AdminApp({ user, users, schedules, onAddMany, onUpdate, onDelete, onAddDriver, onUpdateDriver, onDeleteDriver, onLogout }) {
  const [view, setView]           = useState('list')
  const [selectedId, setSelId]    = useState(null)
  const [showModal, setModal]     = useState(false)
  const [showDriverMgr, setDriverMgr] = useState(false)
  const [showAdminSettings, setAdminSettings] = useState(false)
  const [listView, setListView]   = useState(() => window.innerWidth < 768 ? 'card' : 'table')

  // 드래그앤드롭
  const dragId = useRef(null)
  const dragOverId = useRef(null)
  const [dragOverRowId, setDragOverRowId] = useState(null)

  const handleDragStart = (id) => { dragId.current = id }
  const handleDragOver  = (e, id) => {
    e.preventDefault()
    dragOverId.current = id
    setDragOverRowId(id)
  }
  const handleDragLeaveRow = () => setDragOverRowId(null)
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOverRowId(null)
    const from = dragId.current
    const to   = dragOverId.current
    if (!from || !to || from === to) return
    const fromS = sorted.find(s=>s.id===from)
    const toS   = sorted.find(s=>s.id===to)
    if (!fromS || !toS) return

    if (fromS.driver_id !== toS.driver_id) {
      // 다른 기사 → 기사 변경 + to의 order 근처로 이동
      const toOrder = toS.order ?? sorted.indexOf(toS)
      onUpdate(from, { driver_id: toS.driver_id, order: toOrder - 0.5 })
    } else {
      // 같은 기사 → 목표 위치에 삽입 후 전체 재번호
      const group = sorted.filter(s => s.driver_id === fromS.driver_id)
      const fromIdx = group.findIndex(s => s.id === from)
      const toIdx   = group.findIndex(s => s.id === to)
      if (fromIdx < 0 || toIdx < 0) return
      const newGroup = [...group]
      newGroup.splice(fromIdx, 1)
      newGroup.splice(toIdx, 0, fromS)
      newGroup.forEach((s, i) => { if ((s.order ?? -1) !== i) onUpdate(s.id, { order: i }) })
    }
    dragId.current = null
    dragOverId.current = null
  }

  // 일정 복사
  const [copyModal, setCopyModal] = useState(null) // 복사할 schedule 객체
  const openCopyModal = (s) => {
    setCopyModal({ ...s, _copyDate: s.date, _copyDriver: s.driver_id || '', _copyTime: s.time, _copyWaste: s.waste, _mode: 'move' })
  }
  const confirmCopy = () => {
    if (!copyModal) return
    const isMove = copyModal._mode === 'move'
    const newData = {
      date: copyModal._copyDate,
      time: copyModal._copyTime,
      waste: copyModal._copyWaste,
      driver_id: copyModal._copyDriver || null,
    }
    if (isMove) {
      // 이동: 기존 일정 업데이트
      onUpdate(copyModal.id, newData)
    } else {
      // 복사: 새 일정 생성
      const newS = {
        ...copyModal,
        ...newData,
        id: undefined,
        status:'대기',
        depart_time:null, start_time:null, end_time:null,
        eta:null, sms_sent:false,
        photos:[], work_photos:[],
        driver_note:'',
        est_waste:'', est_duration:'', final_waste:'',
        order: sorted.length,
      }
      delete newS.id
      delete newS._copyDate; delete newS._copyDriver
      delete newS._copyTime; delete newS._copyWaste
      delete newS._mode; delete newS._id
      onAddMany([newS])
    }
    setCopyModal(null)
  }
  const [filterDriver, setFD]     = useState(new Set()) // 빈 Set = 전체
  const [filterDate, setFDate]    = useState(today)
  const [editingId, setEditingId] = useState(null)

  const [deleteMode,     setDeleteMode]   = useState(false)
  const [checkedIds,     setCheckedIds]   = useState(new Set())
  const [showDelConfirm, setDelConfirm]   = useState(false)

  const [assignMode,     setAssignMode]   = useState(false)
  const [assignChecked,  setAssignChecked] = useState(new Set())
  const [assignTarget,   setAssignTarget]  = useState('')

  const toggleAssignCheck = id => setAssignChecked(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAssignAll = () => setAssignChecked(prev =>
    prev.size === sorted.length ? new Set() : new Set(sorted.map(s=>s.id))
  )
  const exitAssignMode = () => { setAssignMode(false); setAssignChecked(new Set()); setAssignTarget('') }
  const confirmAssign  = () => {
    assignChecked.forEach(id => onUpdate(id, { driver_id: assignTarget || null }))
    exitAssignMode()
  }

  const toggleCheck = id => setCheckedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAll = () => setCheckedIds(prev =>
    prev.size === sorted.length ? new Set() : new Set(sorted.map(s=>s.id))
  )
  const exitDeleteMode = () => { setDeleteMode(false); setCheckedIds(new Set()) }

  const drivers = users
    .filter(u => u.role === 'driver')
    .sort((a,b) => getDriverSortKey(a) - getDriverSortKey(b))

  const filtered = schedules.filter(s => {
    if (filterDriver.size > 0) {
      // 미배치 선택 여부
      const unassignedSelected = filterDriver.has('unassigned')
      if (!s.driver_id && !unassignedSelected) return false
      if (s.driver_id && !filterDriver.has(s.driver_id) && !filterDriver.has('all')) return false
    }
    if (filterDate && s.date !== filterDate) return false
    return true
  })

  const toggleDriverFilter = (val) => {
    setFD(prev => {
      const next = new Set(prev)
      if (next.has(val)) next.delete(val)
      else next.add(val)
      return next
    })
  }

  const driverOrder = id => { const i=drivers.findIndex(d=>d.id===id); return i>=0?i:999 }
  const sorted = [...filtered].sort((a,b)=>{
    const dd = driverOrder(a.driver_id) - driverOrder(b.driver_id)
    if (dd!==0) return dd
    const dateA = a.date||'', dateB = b.date||''
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    // 같은 날짜면 order 인덱스 우선, 없으면 time 문자열 비교
    const oA = a.order ?? 9999, oB = b.order ?? 9999
    if (oA !== oB) return oA - oB
    return (a.time||'').localeCompare(b.time||'')
  })

  const stats = {
    total:      filtered.length,
    unassigned: filtered.filter(s=>!s.driver_id).length,
    ing:        filtered.filter(s=>s.status==='진행중').length,
    done:       filtered.filter(s=>s.status==='완료').length,
  }

  const selected = schedules.find(s=>s.id===selectedId)

  useEffect(() => {
    if (view === 'detail') {
      window.history.pushState({ detail: true }, '')
      const handler = () => setView('list')
      window.addEventListener('popstate', handler)
      return () => window.removeEventListener('popstate', handler)
    }
  }, [view])
  if (view==='detail' && selected)
    return <AdminDetail schedule={selected} onUpdate={p=>onUpdate(selected.id,p)} onBack={()=>setView('list')} drivers={drivers}/>

  let lastDriverId = '__init__'

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>
      {/* 헤더 */}
      <div style={{ background:navy, color:'#fff', padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* 로고 + 앱명 */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <TruckIcon width={44} height={28}/>
            <div>
              <div style={{ fontSize:18, fontWeight:700, lineHeight:1.2 }}>동태관리</div>
              <div style={{ fontSize:11, opacity:.65 }}>관리자</div>
            </div>
          </div>
          {/* 버튼 그룹 — 아이콘+짧은 텍스트 */}
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setDriverMgr(true)}
              style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', borderRadius:8, padding:'7px 11px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              👤 기사
            </button>
            <button onClick={()=>setAdminSettings(true)}
              style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', borderRadius:8, padding:'7px 11px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              ⚙️
            </button>
            <button onClick={onLogout}
              style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'rgba(255,255,255,.8)', borderRadius:8, padding:'7px 11px', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
              로그아웃
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:20, maxWidth:1060, margin:'0 auto' }}>
        {/* 통계 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[['전체',stats.total,navy],['미배치',stats.unassigned,red],['진행중',stats.ing,amber],['완료',stats.done,green]].map(([l,v,c])=>(
            <Card key={l} style={{ textAlign:'center', padding:'14px 8px' }}>
              <div style={{ fontSize:28, fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:12, color:muted, marginTop:2 }}>{l}</div>
            </Card>
          ))}
        </div>

        {/* 미배치 배너 */}
        {stats.unassigned>0 && (
          <div style={{ background:'#fef2f2', border:`1px solid #fecaca`, borderRadius:10, padding:'10px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
            <span>⚠️</span>
            <span style={{ fontSize:13, fontWeight:600, color:red }}>기사 미배치 {stats.unassigned}건</span>
            <span style={{ fontSize:12, color:'#b91c1c' }}>— ✏️ 버튼으로 바로 배치하세요</span>
          </div>
        )}

        {/* 필터 */}
        <Card style={{ marginBottom:14 }}>
          {/* 1행: 날짜 + 버튼들 */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:10 }}>
            <input type="date" value={filterDate} onChange={e=>setFDate(e.target.value)}
              style={{ ...iStyle, width:'auto', height:38 }}/>

            <div style={{ width:1, height:32, background:border }}/>

            {/* 일정 등록 */}
            {!assignMode && !deleteMode && (
              <button onClick={()=>setModal(true)}
                style={{ height:38, padding:'0 14px', background:navy, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                + 일정 등록
              </button>
            )}

            {/* 일괄 배정 */}
            {!deleteMode && (
              assignMode ? (
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <select value={assignTarget} onChange={e=>setAssignTarget(e.target.value)}
                    style={{ height:38, padding:'0 10px', border:`1.5px solid ${green}`, borderRadius:8, fontSize:13, fontWeight:600, color:green, outline:'none', background:'#fff', cursor:'pointer' }}>
                    <option value="">— 기사 선택 —</option>
                    {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {assignChecked.size > 0 && (
                    <button onClick={confirmAssign}
                      style={{ height:38, padding:'0 14px', background:green, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                      ✓ {assignChecked.size}건 배정
                    </button>
                  )}
                  <button onClick={exitAssignMode}
                    style={{ height:38, padding:'0 12px', background:'#f1f5f9', color:muted, border:`1px solid ${border}`, borderRadius:8, fontSize:13, cursor:'pointer' }}>
                    취소
                  </button>
                </div>
              ) : (
                <button onClick={()=>setAssignMode(true)}
                  style={{ height:38, padding:'0 14px', background:'#f0fdf4', color:green, border:`1.5px solid #86efac`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                  👥 일괄 배정
                </button>
              )
            )}

            {/* 삭제 */}
            {!assignMode && (
              deleteMode ? (
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  {checkedIds.size > 0 && (
                    <button onClick={()=>setDelConfirm(true)}
                      style={{ height:38, padding:'0 14px', background:red, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                      🗑 {checkedIds.size}건 삭제
                    </button>
                  )}
                  <button onClick={exitDeleteMode}
                    style={{ height:38, padding:'0 12px', background:'#f1f5f9', color:muted, border:`1px solid ${border}`, borderRadius:8, fontSize:13, cursor:'pointer' }}>
                    취소
                  </button>
                </div>
              ) : (
                <button onClick={()=>setDeleteMode(true)}
                  style={{ height:38, padding:'0 14px', background:'#fef2f2', color:red, border:`1.5px solid #fecaca`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                  🗑 삭제
                </button>
              )
            )}

            <div style={{ height:38, display:'flex', alignItems:'center', gap:8, fontSize:12, color:muted, marginLeft:'auto' }}>
              <span>
                {assignMode && assignChecked.size > 0
                  ? <span style={{ color:green, fontWeight:600 }}>{assignChecked.size}건 선택됨</span>
                  : deleteMode && checkedIds.size > 0
                  ? <span style={{ color:red, fontWeight:600 }}>{checkedIds.size}건 선택됨</span>
                  : `총 ${sorted.length}건`
                }
              </span>
              {/* 뷰 전환 */}
              <div style={{ display:'flex', gap:3, background:'#f1f5f9', borderRadius:8, padding:3 }}>
                <button onClick={()=>setListView('table')}
                  style={{ padding:'4px 10px', borderRadius:6, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', background:listView==='table'?'#fff':'transparent', color:listView==='table'?navy:muted, boxShadow:listView==='table'?'0 1px 3px rgba(0,0,0,.1)':'none' }}>
                  ≡ 표
                </button>
                <button onClick={()=>setListView('card')}
                  style={{ padding:'4px 10px', borderRadius:6, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', background:listView==='card'?'#fff':'transparent', color:listView==='card'?navy:muted, boxShadow:listView==='card'?'0 1px 3px rgba(0,0,0,.1)':'none' }}>
                  ⊞ 카드
                </button>
              </div>
            </div>
          </div>

          {/* 2행: 기사 칩 필터 */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center', borderTop:`1px solid ${border}`, paddingTop:10 }}>
            <button
              onClick={()=>setFD(new Set())}
              style={{ height:32, padding:'0 12px', borderRadius:7, border:`1.5px solid ${filterDriver.size===0?navy:border}`, background:filterDriver.size===0?navy:'#fff', color:filterDriver.size===0?'#fff':muted, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              전체
            </button>
            <button
              onClick={()=>toggleDriverFilter('unassigned')}
              style={{ height:32, padding:'0 12px', borderRadius:7, border:`1.5px solid ${filterDriver.has('unassigned')?red:'#fecaca'}`, background:filterDriver.has('unassigned')?'#fef2f2':'#fff', color:filterDriver.has('unassigned')?red:muted, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              미배치
            </button>
            {drivers.map(d => {
              const chip = driverChip(d.id, drivers)
              const on = filterDriver.has(d.id)
              return (
                <button key={d.id}
                  onClick={()=>toggleDriverFilter(d.id)}
                  style={{ height:32, padding:'0 12px', borderRadius:7, border:`1.5px solid ${on?chip?.border:border}`, background:on?chip?.bg:'#fff', color:on?chip?.color:muted, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                  {d.name}
                </button>
              )
            })}
            {filterDriver.size > 0 && (
              <button onClick={()=>setFD(new Set())}
                style={{ height:32, padding:'0 10px', borderRadius:7, border:`1px solid ${border}`, background:'#f1f5f9', color:muted, fontSize:11, cursor:'pointer' }}>
                ✕ 초기화
              </button>
            )}
          </div>
        </Card>

        {/* 카드 뷰 */}
        {listView === 'card' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {sorted.length === 0 && (
              <div style={{ textAlign:'center', padding:40, color:muted }}>일정이 없습니다</div>
            )}
            {(() => {
              // 기사별 그룹핑
              const groups = []
              let lastId = '__none__'
              sorted.forEach(s => {
                const gid = s.driver_id || '__unassigned__'
                if (gid !== lastId) { groups.push({ driverId: s.driver_id||null, items:[] }); lastId = gid }
                groups[groups.length-1].items.push(s)
              })
              return groups.map(g => {
                const chip = g.driverId ? driverChip(g.driverId, drivers) : null
                return (
                  <div key={g.driverId||'unassigned'}>
                    {/* 기사 그룹 헤더 */}
                    <div style={{
                      display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
                      background: chip ? chip.bg : '#fef2f2',
                      borderRadius:10, marginBottom:8,
                      border:`1px solid ${chip ? chip.border : '#fecaca'}`
                    }}>
                      <span style={{ fontSize:13, fontWeight:700, color: chip ? chip.color : red }}>
                        {g.driverId ? `▸ ${userName(g.driverId)}` : '▸ 미배치'}
                      </span>
                      <span style={{ fontSize:12, color: chip ? chip.color : red, opacity:.65 }}>
                        {g.items.length}건
                      </span>
                    </div>
                    {/* 카드 목록 (드래그앤드롭) */}
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {g.items.map(s => {
                        const lc = s.status==='완료' ? green : s.status==='진행중' ? amber : s.status==='이동중' ? blue : border
                        const isDeleteChecked = checkedIds.has(s.id)
                        const isAssignChecked = assignChecked.has(s.id)
                        const isDragOver = dragOverRowId === s.id
                        return (
                          <div key={s.id}
                            draggable={!deleteMode && !assignMode}
                            onDragStart={()=>handleDragStart(s.id)}
                            onDragOver={e=>handleDragOver(e, s.id)}
                            onDragLeave={handleDragLeaveRow}
                            onDrop={handleDrop}
                            onClick={()=>{
                              if (deleteMode) { toggleCheck(s.id); return }
                              if (assignMode) { toggleAssignCheck(s.id); return }
                              setSelId(s.id); setView('detail')
                            }}
                            style={{
                              background: isDragOver?'#eff6ff': isDeleteChecked?'#fef2f2': isAssignChecked?'#f0fdf4':'#fff',
                              borderRadius:12,
                              border:`1px solid ${isDragOver?blue:border}`,
                              borderLeft:`5px solid ${isDragOver?blue:lc}`,
                              padding:'12px 14px',
                              cursor: !deleteMode&&!assignMode ? 'grab' : 'pointer',
                              outline: isDragOver?`2px dashed ${blue}`:'none',
                              transition:'all .1s',
                            }}>
                            {/* 헤더 행 */}
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <Badge status={s.status}/>
                                {/* 기사 연필 배정 */}
                                <span onClick={e=>e.stopPropagation()}>
                                  {editingId===s.id ? (
                                    <select autoFocus
                                      defaultValue={s.driver_id||''}
                                      onChange={e=>{ onUpdate(s.id,{driver_id:e.target.value||null}); setEditingId(null) }}
                                      onBlur={()=>setEditingId(null)}
                                      style={{ fontSize:12, padding:'4px 8px', border:`1.5px solid ${blue}`, borderRadius:6, outline:'none', cursor:'pointer', maxWidth:110 }}>
                                      <option value="">— 미배치 —</option>
                                      {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                  ) : (
                                    <button onClick={e=>{ e.stopPropagation(); setEditingId(s.id) }}
                                      style={{ background:'none', border:`1px solid ${border}`, borderRadius:6, padding:'3px 7px', fontSize:11, color:muted, cursor:'pointer' }}>
                                      ✏️
                                    </button>
                                  )}
                                </span>
                                {s.co_driver_id && (
                                  <span style={{ fontSize:12, background:'#dbeafe', color:blue, padding:'2px 7px', borderRadius:10, fontWeight:600 }}>2인·{userName(s.co_driver_id)}</span>
                                )}
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ fontFamily:'monospace', fontSize:16, fontWeight:700, color:navy }}>{s.time}</span>
                                <button onClick={e=>{ e.stopPropagation(); openCopyModal(s) }}
                                  style={{ background:'#f0f9ff', color:blue, border:`1px solid #bae6fd`, borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                                  이동/복사
                                </button>
                              </div>
                            </div>
                            {/* 주소 */}
                            <div style={{ fontSize:15, fontWeight:600, color:textC, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.address}</div>
                            {/* 서브 정보 */}
                            <div style={{ display:'flex', gap:10, fontSize:13, color:muted, flexWrap:'wrap', alignItems:'center' }}>
                              <span>{s.cname}</span>
                              <span>폐기물 {s.waste}</span>
                              <span style={{ fontSize:11, color:'#94a3b8' }}>{s.date}</span>
                              {s.start_time && <span style={{ color:green, fontFamily:'monospace', fontSize:12 }}>▶ {s.start_time}{s.end_time?` ~ ${s.end_time}`:''}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}

        {/* 테이블 */}
        {listView === 'table' && (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:'70vh' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:16 }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:`1px solid ${border}`, position:'sticky', top:0, zIndex:10 }}>
                  {(deleteMode||assignMode) && (
                    <th style={{ padding:'10px 12px', textAlign:'center', fontSize:14, color:muted, fontWeight:600, width:60, background:'#f8fafc' }}>
                      <button onClick={assignMode ? toggleAssignAll : toggleAll}
                        style={{ background: (assignMode ? assignChecked.size===sorted.length : checkedIds.size===sorted.length)&&sorted.length>0 ? (assignMode?'#059669':red) : '#e2e8f0', color:'#fff', border:'none', borderRadius:5, padding:'4px 8px', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                        {(assignMode ? assignChecked.size===sorted.length : checkedIds.size===sorted.length)&&sorted.length>0 ? '전체해제' : '전체선택'}
                      </button>
                    </th>
                  )}
                  {['기사','상태','현장담당자','날짜·시간','주소','폐기물량','시작','완료',''].map(h=>(
                    <th key={h} style={{ padding:'10px 12px', textAlign:'center', fontWeight:600, color:muted, fontSize:15, whiteSpace:'nowrap', background:'#f8fafc' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length===0 && (
                  <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:muted }}>일정이 없습니다</td></tr>
                )}
                {sorted.map(s => {
                  const showDiv = s.driver_id !== lastDriverId
                  lastDriverId = s.driver_id
                  const chip = s.driver_id ? driverChip(s.driver_id, drivers) : null
                  const spCnt = (s.schedule_photos||[]).length
                  const cpCnt = (s.photos||[]).length
                  const isEdit = editingId===s.id
                  const isAssignChecked = assignChecked.has(s.id)
                  const isDeleteChecked = checkedIds.has(s.id)

                  return (
                    <Fragment key={s.id}>
                      {/* 기사 그룹 헤더 */}
                      {showDiv && (
                        <tr>
                          <td colSpan={(deleteMode||assignMode) ? 10 : 9} style={{
                            padding:'5px 14px', fontSize:11, fontWeight:700, letterSpacing:.4,
                            background: chip ? chip.bg : '#fef2f2',
                            color: chip ? chip.color : red,
                            borderTop:`2px solid ${chip ? chip.border : '#fecaca'}`,
                            borderBottom:`1px solid ${border}`
                          }}>
                            {s.driver_id ? `▸ ${userName(s.driver_id)}` : '▸ 미배치'}
                            <span style={{ marginLeft:10, fontWeight:400, opacity:.65, fontSize:11 }}>
                              {sorted.filter(x=>x.driver_id===s.driver_id).length}건
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr
                        draggable={!deleteMode && !assignMode && !isEdit}
                        onDragStart={()=>handleDragStart(s.id)}
                        onDragOver={e=>handleDragOver(e, s.id)}
                        onDragLeave={handleDragLeaveRow}
                        onDrop={handleDrop}
                        onClick={()=>{
                          if (deleteMode) { toggleCheck(s.id); return }
                          if (assignMode) { toggleAssignCheck(s.id); return }
                          if (isEdit) return
                          setSelId(s.id); setView('detail')
                        }}
                        style={{
                          borderBottom:`1px solid ${border}`,
                          cursor: (!deleteMode&&!assignMode&&!isEdit) ? 'grab' : 'pointer',
                          background: dragOverRowId===s.id ? '#eff6ff' : isDeleteChecked ? '#fef2f2' : isAssignChecked ? '#f0fdf4' : '#fff',
                          borderLeft: dragOverRowId===s.id ? `4px solid ${blue}` : deleteMode ? `4px solid ${isDeleteChecked ? red : '#e2e8f0'}` : assignMode ? `4px solid ${isAssignChecked ? '#059669' : '#e2e8f0'}` : 'none',
                          transition: 'background .1s',
                          outline: dragOverRowId===s.id ? `2px dashed ${blue}` : 'none',
                        }}
                        onMouseEnter={e=>{ if(!isEdit&&dragOverRowId!==s.id) e.currentTarget.style.background = isDeleteChecked?'#fee2e2':isAssignChecked?'#dcfce7':'#f8fafc' }}
                        onMouseLeave={e=>{ e.currentTarget.style.background = dragOverRowId===s.id?'#eff6ff':isDeleteChecked?'#fef2f2':isAssignChecked?'#f0fdf4':'#fff' }}
                      >
                        {/* 선택 상태 셀 */}
                        {(deleteMode||assignMode) && (
                          <td style={{ padding:'0 10px', width:60, textAlign:'center' }}>
                            <div style={{
                              display:'inline-flex', alignItems:'center', justifyContent:'center',
                              width:26, height:26, borderRadius:6,
                              background: deleteMode ? (isDeleteChecked?red:'transparent') : (isAssignChecked?'#059669':'transparent'),
                              border: `2px solid ${deleteMode?(isDeleteChecked?red:'#cbd5e1'):(isAssignChecked?'#059669':'#cbd5e1')}`,
                              color:'#fff', fontSize:14, fontWeight:700, transition:'all .1s'
                            }}>
                              {(deleteMode?isDeleteChecked:isAssignChecked) && '✓'}
                            </div>
                          </td>
                        )}
                        <td style={{ padding:'8px 8px', minWidth:80, width:90, textAlign:'center' }} onClick={e=>{ if(!deleteMode) e.stopPropagation() }}>
                          {isEdit ? (
                            <select autoFocus
                              defaultValue={s.driver_id||''}
                              onChange={e=>{ onUpdate(s.id,{driver_id:e.target.value||null}); setEditingId(null) }}
                              onBlur={()=>setEditingId(null)}
                              style={{ fontSize:14, padding:'4px 6px', border:`1.5px solid ${blue}`, borderRadius:6, outline:'none', minWidth:90, cursor:'pointer' }}
                            >
                              <option value="">— 미배치 —</option>
                              {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          ) : (
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:2 }}>
                              {s.driver_id
                                ? <span style={{ background:chip?.bg, color:chip?.color, border:`1px solid ${chip?.border}`, borderRadius:20, padding:'2px 7px', fontSize:14, fontWeight:600, whiteSpace:'nowrap' }}>{userName(s.driver_id)}</span>
                                : <span style={{ background:'#fef2f2', color:red, borderRadius:20, padding:'2px 7px', fontSize:14, fontWeight:600, border:'1px dashed #fca5a5', whiteSpace:'nowrap' }}>미배치</span>
                              }
                              <button onClick={e=>{ e.stopPropagation(); setEditingId(s.id) }} title="기사 변경"
                                style={{ background:'none', border:'none', cursor:'pointer', fontSize:10, color:muted, padding:'1px 2px', borderRadius:3, lineHeight:1, flexShrink:0 }}>✏️</button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'center' }}><Badge status={s.status}/></td>
                        <td style={{ padding:'8px 12px', textAlign:'center', whiteSpace:'nowrap', fontSize:15 }}>
                          {s.cname}
                          {s.co_driver_id && (
                            <span style={{ marginLeft:5, fontSize:11, background:'#dbeafe', color:blue, padding:'1px 5px', borderRadius:8, fontWeight:700, verticalAlign:'middle' }}>2인</span>
                          )}
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'center', whiteSpace:'nowrap' }}>
                          <div style={{ fontSize:13, color:muted }}>{s.date}</div>
                          <div style={{ fontFamily:'monospace', fontWeight:600, fontSize:15 }}>{s.time}</div>
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'center', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:15 }}>{s.address}</td>
                        <td style={{ padding:'8px 12px', textAlign:'center', color:muted, whiteSpace:'nowrap', fontSize:15 }}>{s.waste}</td>
                        <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'monospace', fontSize:15, color:s.start_time?green:'#ccc' }}>{s.start_time||'-'}</td>
                        <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'monospace', fontSize:15, color:s.end_time?blue:'#ccc' }}>{s.end_time||'-'}</td>
                        <td style={{ padding:'4px 8px', textAlign:'center', whiteSpace:'nowrap' }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>openCopyModal(s)}
                            title="일정 복사"
                            style={{ background:'#f0f9ff', color:blue, border:`1px solid #bae6fd`, borderRadius:6, padding:'4px 8px', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                            이동/복사
                          </button>
                        </td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </div>

      {showModal && <BulkScheduleModal drivers={drivers} onAddMany={list=>{ onAddMany(list); setModal(false) }} onClose={()=>setModal(false)}/>}
      {showDriverMgr && <DriverMgrModal drivers={drivers} schedules={schedules} onAdd={onAddDriver} onUpdate={onUpdateDriver} onDelete={onDeleteDriver} onClose={()=>setDriverMgr(false)}/>}
      {showAdminSettings && <AdminSettingsModal user={user} onUpdateDriver={onUpdateDriver} onClose={()=>setAdminSettings(false)}/>}

      {/* 일정 복사/이동 모달 */}
      {copyModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:400, padding:24 }}>
            {/* 탭 */}
            <div style={{ display:'flex', gap:0, marginBottom:20, background:'#f1f5f9', borderRadius:10, padding:4 }}>
              {[['move','이동'], ['copy','복사']].map(([mode, label]) => (
                <button key={mode}
                  onClick={()=>setCopyModal(p=>({...p, _mode:mode}))}
                  style={{ flex:1, padding:'9px 0', borderRadius:8, border:'none', fontSize:14, fontWeight:700, cursor:'pointer', background:copyModal._mode===mode?'#fff':'transparent', color:copyModal._mode===mode?navy:muted, boxShadow:copyModal._mode===mode?'0 1px 4px rgba(0,0,0,.1)':'none', transition:'all .15s' }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ fontSize:13, color:muted, marginBottom:16, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {copyModal._mode === 'move' ? '🔀 이동할 위치 설정' : '⧉ 복사본 설정'} — {copyModal.address}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>날짜</div>
                <input type="date" value={copyModal._copyDate}
                  onChange={e=>setCopyModal(p=>({...p, _copyDate:e.target.value}))}
                  style={{ ...iStyle }}/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>시간</div>
                <input value={copyModal._copyTime}
                  onChange={e=>setCopyModal(p=>({...p, _copyTime:e.target.value}))}
                  placeholder="09:00 또는 오전중"
                  style={{ ...iStyle }}/>
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>폐기물양</div>
              <input value={copyModal._copyWaste}
                onChange={e=>setCopyModal(p=>({...p, _copyWaste:e.target.value}))}
                placeholder="예: 1/2차, 2톤"
                style={{ ...iStyle }}/>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>배정 기사</div>
              <select value={copyModal._copyDriver}
                onChange={e=>setCopyModal(p=>({...p, _copyDriver:e.target.value}))}
                style={{ ...iStyle }}>
                <option value="">— 미배치 —</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {copyModal._mode === 'move' && (
              <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:12, color:amber }}>
                ⚠ 이동 시 기존 일정의 날짜·시간·기사가 변경됩니다
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>setCopyModal(null)} outline color={muted} style={{ flex:1 }}>취소</Btn>
              <Btn onClick={confirmCopy} color={copyModal._mode==='move'?amber:navy} style={{ flex:2 }}>
                {copyModal._mode === 'move' ? '이동' : '복사 등록'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 모드 하단 플로팅 바 */}
      {deleteMode && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:navy, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:500, boxShadow:'0 -4px 20px rgba(0,0,0,.2)', fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ color:'#fff', fontSize:14, fontWeight:600 }}>
              {checkedIds.size > 0 ? `${checkedIds.size}건 선택됨` : '삭제할 일정을 선택하세요'}
            </span>
            {checkedIds.size > 0 && (
              <button onClick={()=>setCheckedIds(new Set())}
                style={{ height:36, padding:'0 12px', background:'rgba(255,255,255,.15)', border:'none', color:'rgba(255,255,255,.85)', borderRadius:7, fontSize:12, cursor:'pointer' }}>
                선택 해제
              </button>
            )}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={exitDeleteMode}
              style={{ height:36, padding:'0 16px', background:'transparent', border:'1px solid rgba(255,255,255,.4)', color:'rgba(255,255,255,.85)', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              취소
            </button>
            <button onClick={()=>{ if(checkedIds.size>0) setDelConfirm(true) }}
              disabled={checkedIds.size===0}
              style={{ height:36, padding:'0 18px', background:checkedIds.size>0?red:'#6b7280', border:'none', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, cursor:checkedIds.size>0?'pointer':'not-allowed' }}>
              🗑 {checkedIds.size}건 삭제
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDelConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:360, padding:28 }}>
            <div style={{ fontSize:28, textAlign:'center', marginBottom:12 }}>🗑</div>
            <div style={{ fontSize:16, fontWeight:700, color:textC, textAlign:'center', marginBottom:8 }}>
              일정 {checkedIds.size}건을 삭제할까요?
            </div>
            <div style={{ fontSize:13, color:muted, textAlign:'center', lineHeight:1.7, marginBottom:20 }}>
              삭제된 일정은 복구할 수 없습니다.<br/>
              완료된 일정의 사진·기록도 함께 삭제됩니다.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>setDelConfirm(false)} outline color={muted} style={{ flex:1, padding:'11px 0' }}>취소</Btn>
              <Btn onClick={()=>{
                onDelete([...checkedIds])
                setDelConfirm(false)
                exitDeleteMode()
              }} color={red} style={{ flex:2, padding:'11px 0', fontSize:15 }}>
                삭제
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 관리자 계정 설정 모달 ─────────────────────────────────────────
function AdminSettingsModal({ user, onUpdateDriver, onClose }) {
  const [pwForm, setPwForm] = useState({ current:'', next:'', confirm:'' })
  const [err,    setErr]    = useState('')
  const [ok,     setOk]     = useState('')

  const changePw = () => {
    setErr(''); setOk('')
    if (pwForm.current !== user.pw) return setErr('현재 비밀번호가 올바르지 않습니다')
    if (pwForm.next.length < 4)     return setErr('새 비밀번호는 4자 이상 입력하세요')
    if (pwForm.next !== pwForm.confirm) return setErr('새 비밀번호가 일치하지 않습니다')
    onUpdateDriver(user.id, { pw: pwForm.next })
    setOk('비밀번호가 변경되었습니다!')
    setPwForm({ current:'', next:'', confirm:'' })
    setTimeout(() => setOk(''), 2000)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:360 }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:16, fontWeight:700, color:navy }}>⚙️ 관리자 계정 설정</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
        </div>
        <div style={{ padding:'12px 20px', background:'#f8fafc', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:blue }}>
            {user.name.slice(0,1)}
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:textC }}>{user.name}</div>
            <div style={{ fontSize:12, color:muted }}>
              <span style={{ fontFamily:'monospace', background:'#e2e8f0', padding:'1px 6px', borderRadius:4 }}>ID: {user.id}</span>
            </div>
          </div>
        </div>
        <div style={{ padding:'16px 20px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:textC, marginBottom:2 }}>비밀번호 변경</div>
          <div>
            <div style={{ fontSize:12, color:muted, marginBottom:4 }}>현재 비밀번호</div>
            <input type="password" value={pwForm.current} onChange={e=>{ setPwForm(p=>({...p,current:e.target.value})); setErr('') }}
              placeholder="현재 비밀번호" style={iStyle}/>
          </div>
          <div>
            <div style={{ fontSize:12, color:muted, marginBottom:4 }}>새 비밀번호</div>
            <input type="password" value={pwForm.next} onChange={e=>{ setPwForm(p=>({...p,next:e.target.value})); setErr('') }}
              placeholder="새 비밀번호 (4자 이상)" style={iStyle}/>
          </div>
          <div>
            <div style={{ fontSize:12, color:muted, marginBottom:4 }}>새 비밀번호 확인</div>
            <input type="password" value={pwForm.confirm} onChange={e=>{ setPwForm(p=>({...p,confirm:e.target.value})); setErr('') }}
              onKeyDown={e=>e.key==='Enter'&&changePw()} placeholder="비밀번호 재입력" style={iStyle}/>
          </div>
          {err && <div style={{ fontSize:12, color:red, background:'#fef2f2', padding:'8px 12px', borderRadius:8 }}>⚠ {err}</div>}
          {ok  && <div style={{ fontSize:12, color:green, background:'#f0fdf4', padding:'8px 12px', borderRadius:8 }}>✓ {ok}</div>}
          <Btn onClick={changePw} style={{ width:'100%', padding:12, fontSize:15 }}>변경하기</Btn>
        </div>
      </div>
    </div>
  )
}

function DriverMgrModal({ drivers, schedules, onAdd, onUpdate, onDelete, onClose }) {
  const [adding, setAdding]       = useState(false)
  const [editId, setEditId]       = useState(null)
  const [delId,  setDelId]        = useState(null)
  const [form, setForm]           = useState({ loginId:'', name:'', phone:'', pw:'' })
  const [editForm, setEditForm]   = useState({})
  const [idErr, setIdErr]         = useState('')
  const setF  = (k,v) => { setForm(p=>({...p,[k]:v})); if(k==='loginId') setIdErr('') }
  const setEF = (k,v) => setEditForm(p=>({...p,[k]:v}))

  const submitAdd = () => {
    if (!form.loginId||!form.name||!form.phone||!form.pw) return alert('아이디·이름·연락처·비밀번호를 모두 입력하세요')
    if (!/^[a-z0-9_\uAC00-\uD7A3\u3130-\u318F]+$/.test(form.loginId)) { setIdErr('한글·영문·숫자·_만 사용 가능합니다 (공백 불가)'); return }
    if (USERS.some(u=>u.id===form.loginId)) { setIdErr('이미 사용 중인 아이디입니다'); return }
    onAdd({ id: form.loginId, name:form.name, phone:form.phone, pw:form.pw, role:'driver', driverOrder: Date.now() })
    setForm({ loginId:'', name:'', phone:'', pw:'' }); setAdding(false)
  }
  const startEdit = d => { setEditId(d.id); setEditForm({ loginId:d.id, name:d.name, phone:d.phone, pw:d.pw }) }
  const submitEdit = () => { onUpdate(editId, { name:editForm.name, phone:editForm.phone, pw:editForm.pw }); setEditId(null) }

  const scheduleCount = id => schedules.filter(s=>s.driver_id===id).length

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:navy }}>👤 기사 계정 관리</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:20 }}>
          {/* 기사 목록 */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
            {drivers.map((d, i)=>(
              <div key={d.id} style={{ background:'#f8fafc', borderRadius:10, border:`1px solid ${border}`, overflow:'hidden' }}>
                {editId===d.id ? (
                  <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>

                    <div style={{ background:'#f1f5f9', borderRadius:7, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:muted }}>아이디 (변경 불가)</span>
                      <span style={{ fontSize:13, fontWeight:700, color:navy, fontFamily:'monospace' }}>{d.id}</span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div>
                        <div style={{ fontSize:11, color:muted, marginBottom:4 }}>이름</div>
                        <input value={editForm.name} onChange={e=>setEF('name',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
                      </div>
                      <div>
                        <div style={{ fontSize:11, color:muted, marginBottom:4 }}>연락처</div>
                        <input value={editForm.phone} onChange={e=>setEF('phone',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:muted, marginBottom:4 }}>비밀번호</div>
                      <input value={editForm.pw} onChange={e=>setEF('pw',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <Btn onClick={()=>setEditId(null)} outline color={muted} style={{ flex:1, padding:'8px 0', fontSize:13 }}>취소</Btn>
                      <Btn onClick={submitEdit} color={blue} style={{ flex:2, padding:'8px 0', fontSize:13 }}>저장</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                    {/* 순서 변경 버튼 */}
                    <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
                      <button
                        disabled={i===0}
                        onClick={()=>{
                          const prev = drivers[i-1]
                          onUpdate(d.id,    { driverOrder: (i-1) * 100 })
                          onUpdate(prev.id, { driverOrder: i * 100 })
                        }}
                        style={{ background:'none', border:`1px solid ${border}`, borderRadius:4, width:22, height:22, fontSize:11, cursor:i===0?'default':'pointer', color:i===0?'#ccc':muted, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        ▲
                      </button>
                      <button
                        disabled={i===drivers.length-1}
                        onClick={()=>{
                          const next = drivers[i+1]
                          onUpdate(d.id,    { driverOrder: (i+1) * 100 })
                          onUpdate(next.id, { driverOrder: i * 100 })
                        }}
                        style={{ background:'none', border:`1px solid ${border}`, borderRadius:4, width:22, height:22, fontSize:11, cursor:i===drivers.length-1?'default':'pointer', color:i===drivers.length-1?'#ccc':muted, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        ▼
                      </button>
                    </div>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:blue, flexShrink:0 }}>
                      {d.name.slice(0,1)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:textC }}>{d.name}</div>
                      <div style={{ fontSize:12, color:muted, marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, color:navy }}>ID: {d.id}</span>
                        <span>{d.phone}</span>
                        <span style={{ color:green }}>일정 {scheduleCount(d.id)}건</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>startEdit(d)}
                        style={{ background:'none', border:`1px solid ${border}`, borderRadius:6, padding:'5px 10px', fontSize:12, color:muted, cursor:'pointer' }}>
                        ✏️ 수정
                      </button>
                      <button onClick={()=>setDelId(d.id)}
                        style={{ background:'#fef2f2', border:`1px solid #fecaca`, borderRadius:6, padding:'5px 10px', fontSize:12, color:red, cursor:'pointer' }}>
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {drivers.length===0 && (
              <div style={{ textAlign:'center', padding:24, color:muted, fontSize:13 }}>등록된 기사가 없습니다</div>
            )}
          </div>

          {/* 기사 추가 폼 */}
          {adding ? (
            <div style={{ background:'#f0f9ff', border:`1px solid #bae6fd`, borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:blue, marginBottom:14 }}>+ 새 기사 등록</div>
              {/* 아이디 */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>로그인 아이디 * <span style={{ color:'#94a3b8' }}>(한글·영문·숫자·_ 가능, 공백 불가)</span></div>
                <input value={form.loginId} onChange={e=>setF('loginId', e.target.value.replace(/\s/g,''))}
                  placeholder="예: 김기사 또는 kim01" style={{ ...iStyle, fontFamily:'monospace', borderColor: idErr?red:undefined }}/>
                {idErr && <div style={{ fontSize:11, color:red, marginTop:4 }}>⚠ {idErr}</div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>이름 *</div>
                  <input value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="홍길동" style={iStyle}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>연락처 *</div>
                  <input value={form.phone} onChange={e=>setF('phone',e.target.value)} placeholder="010-0000-0000" style={iStyle}/>
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>비밀번호 (로그인용) *</div>
                <input value={form.pw} onChange={e=>setF('pw',e.target.value)} placeholder="숫자 4자리 권장" style={iStyle}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Btn onClick={()=>{ setAdding(false); setForm({loginId:'',name:'',phone:'',pw:''}); setIdErr('') }} outline color={muted} style={{ flex:1, padding:'9px 0' }}>취소</Btn>
                <Btn onClick={submitAdd} style={{ flex:2, padding:'9px 0' }}>등록</Btn>
              </div>
            </div>
          ) : (
            <button onClick={()=>setAdding(true)}
              style={{ width:'100%', padding:'12px 0', border:`2px dashed ${blue}`, borderRadius:10, background:'none', color:blue, fontSize:14, fontWeight:600, cursor:'pointer' }}>
              + 기사 추가
            </button>
          )}
        </div>
      </div>

      {/* 기사 삭제 확인 */}
      {delId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:320, padding:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:textC, marginBottom:8 }}>기사를 삭제할까요?</div>
            <div style={{ fontSize:13, color:muted, lineHeight:1.7, marginBottom:6 }}>
              <b>{drivers.find(d=>d.id===delId)?.name}</b> 기사 계정이 삭제됩니다.
            </div>
            {scheduleCount(delId) > 0 && (
              <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:8, padding:'8px 12px', marginBottom:14, fontSize:12, color:amber }}>
                ⚠ 배정된 일정 {scheduleCount(delId)}건이 미배치로 변경됩니다.
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={()=>setDelId(null)} outline color={muted} style={{ flex:1 }}>취소</Btn>
              <Btn onClick={()=>{ onDelete(delId); setDelId(null) }} color={red} style={{ flex:2 }}>삭제</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminDetail({ schedule, onBack, onUpdate, drivers }) {
  const [lightbox, setLightbox]     = useState(null)
  const [lbSource, setLbSource]     = useState('schedule')
  const [editDriver, setEditDriver] = useState(false)
  const [driverId, setDriverId]     = useState(schedule.driver_id || '')
  const [editCoDriver, setEditCoDriver] = useState(false)
  const [coDriverId, setCoDriverId]     = useState(schedule.co_driver_id || '')
  const [pasteMsg, setPasteMsg]     = useState('')
  const spFileRef = useRef()
  const wpFileRef = useRef()
  const cpFileRef = useRef()
  const dropRef   = useRef()

  const [showBilling, setShowBilling] = useState(false)
  const [billingForm, setBillingForm] = useState({
    workers: schedule.co_driver_id ? '2' : '1',
    waste: schedule.final_waste || schedule.waste || '',
    amount:'', unit:'', total:''
  })
  const [billCopied, setBillCopied]   = useState(false)
  const billUnitRef = useRef()
  const setBF = (k,v) => setBillingForm(p => {
    const next = {...p, [k]:v}
    const a = parseFloat(next.amount) || 0
    const u = parseFloat(next.unit)   || 0
    next.total = (a + u) > 0 ? String(a + u) : ''
    return next
  })

  const [editInfo, setEditInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({
    date:   schedule.date   || '',
    time:   schedule.time   || '',
    address:schedule.address|| '',
    waste:  schedule.waste  || '',
    cname:  schedule.cname  || '',
    cphone: schedule.cphone || '',
    memo:   schedule.memo   || '',
  })
  const setIF = (k,v) => setInfoForm(p=>({...p,[k]:v}))
  const saveInfo = () => {
    onUpdate(infoForm)
    setEditInfo(false)
  }
  const cancelInfo = () => {
    setInfoForm({
      date:   schedule.date   || '',
      time:   schedule.time   || '',
      address:schedule.address|| '',
      waste:  schedule.waste  || '',
      cname:  schedule.cname  || '',
      cphone: schedule.cphone || '',
      memo:   schedule.memo   || '',
    })
    setEditInfo(false)
  }

  const schedulePhotos = schedule.schedule_photos || []
  const completePhotos = schedule.photos || []

  const saveDriver = () => { onUpdate({ driver_id: driverId||null }); setEditDriver(false) }

  const resizeForUpload = (file, maxW = 1200, quality = 0.8) => new Promise(res => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      res(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })

  const readFilesAsBase64 = files =>
    Promise.all(Array.from(files).map(f => resizeForUpload(f)))

  const appendSchedulePhotos = async newDataUrls => {
    if (!newDataUrls.length) return
    onUpdate({ schedule_photos: [...(schedule.schedule_photos||[]), ...newDataUrls] })
  }

  const addSchedulePhotos = async e => {
    const urls = await readFilesAsBase64(e.target.files)
    await appendSchedulePhotos(urls)
    e.target.value = ''
  }

  const removeSchedulePhoto = idx =>
    onUpdate({ schedule_photos: (schedule.schedule_photos||[]).filter((_,i)=>i!==idx) })

  const addWorkPhotos = async e => {
    const urls = await readFilesAsBase64(e.target.files)
    onUpdate({ work_photos: [...(schedule.work_photos||[]), ...urls] })
    e.target.value = ''
  }
  const removeWorkPhoto = idx =>
    onUpdate({ work_photos: (schedule.work_photos||[]).filter((_,i)=>i!==idx) })

  const addCompletePhotos = async e => {
    const urls = await readFilesAsBase64(e.target.files)
    onUpdate({ photos: [...(schedule.photos||[]), ...urls] })
    e.target.value = ''
  }
  const removeCompletePhoto = idx =>
    onUpdate({ photos: (schedule.photos||[]).filter((_,i)=>i!==idx) })

  const handlePagePaste = async e => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItems = items.filter(it => it.type.startsWith('image/'))
    if (!imageItems.length) return
    e.preventDefault()
    const files = imageItems.map(it => it.getAsFile()).filter(Boolean)
    const urls = await readFilesAsBase64(files)
    await appendSchedulePhotos(urls)
    setPasteMsg(`📋 ${urls.length}장 붙여넣기 완료`)
    setTimeout(() => setPasteMsg(''), 2500)
  }

  const handleDrop = async e => {
    e.preventDefault()
    dropRef.current?.classList.remove('drag-over')
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    const urls = await readFilesAsBase64(files)
    await appendSchedulePhotos(urls)
  }
  const handleDragOver = e => { e.preventDefault(); dropRef.current?.classList.add('drag-over') }
  const handleDragLeave = () => dropRef.current?.classList.remove('drag-over')

  const openLightbox = (src, idx) => { setLbSource(src); setLightbox(idx) }
  const lbPhotos = lbSource==='schedule' ? schedulePhotos : lbSource==='work' ? (schedule.work_photos||[]) : completePhotos

  return (
    <div onPaste={handlePagePaste} style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <style>{`.drag-over{border-color:${blue}!important;background:#eff6ff!important}`}</style>
      <div style={{ background:navy, color:'#fff', padding:'14px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:0, lineHeight:1 }}>←</button>
        <div style={{ flex:1, fontSize:16, fontWeight:700 }}>일정 상세 (관리자)</div>
        <Badge status={schedule.status}/>
      </div>

      <div style={{ padding:20, maxWidth:640, margin:'0 auto' }}>

        {/* 기사 배치 */}
        <div style={{ background:schedule.driver_id?'#f0fdf4':'#fef2f2', border:`1.5px solid ${schedule.driver_id?'#86efac':'#fca5a5'}`, borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:10, color:schedule.driver_id?green:red }}>
            {schedule.driver_id?'✓ 담당 기사':'⚠ 기사 미배치'}
          </div>
          {editDriver ? (
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <select value={driverId} onChange={e=>setDriverId(e.target.value)} style={{ ...iStyle, flex:1, margin:0 }}>
                <option value="">— 기사 선택 —</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <Btn onClick={saveDriver} style={{ padding:'9px 16px', fontSize:13 }}>저장</Btn>
              <Btn onClick={()=>{ setEditDriver(false); setDriverId(schedule.driver_id||'') }} outline color={muted} style={{ padding:'9px 12px', fontSize:13 }}>취소</Btn>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                {schedule.driver_id
                  ? <><span style={{ fontSize:16, fontWeight:700, color:textC }}>{userName(schedule.driver_id)}</span>
                      <span style={{ fontSize:13, color:muted, marginLeft:10 }}>{USERS.find(u=>u.id===schedule.driver_id)?.phone}</span></>
                  : <span style={{ fontSize:14, color:red }}>배치된 기사가 없습니다</span>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {schedule.driver_id && USERS.find(u=>u.id===schedule.driver_id)?.phone && (
                  <a href={`tel:${USERS.find(u=>u.id===schedule.driver_id)?.phone}`}
                    style={{ textDecoration:'none' }}>
                    <button style={{ background:green, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      📞 전화
                    </button>
                  </a>
                )}
                <Btn onClick={()=>setEditDriver(true)} outline color={blue} style={{ padding:'7px 14px', fontSize:12 }}>
                  {schedule.driver_id?'변경':'배치'}
                </Btn>
              </div>
            </div>
          )}

          {/* 보조기사 */}
          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${schedule.driver_id?'#86efac':'#fca5a5'}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:8 }}>보조기사 (2인 현장)</div>
            {editCoDriver ? (
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <select value={coDriverId} onChange={e=>setCoDriverId(e.target.value)} style={{ ...iStyle, flex:1, margin:0 }}>
                  <option value="">— 없음 (1인 현장) —</option>
                  {drivers.filter(d=>d.id!==schedule.driver_id).map(d=>(
                    <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                  ))}
                </select>
                <Btn onClick={()=>{ onUpdate({ co_driver_id: coDriverId||null }); setEditCoDriver(false) }} style={{ padding:'9px 16px', fontSize:13 }}>저장</Btn>
                <Btn onClick={()=>{ setEditCoDriver(false); setCoDriverId(schedule.co_driver_id||'') }} outline color={muted} style={{ padding:'9px 12px', fontSize:13 }}>취소</Btn>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  {schedule.co_driver_id
                    ? <><span style={{ fontSize:15, fontWeight:600, color:textC }}>{userName(schedule.co_driver_id)}</span>
                        <span style={{ fontSize:12, color:muted, marginLeft:8 }}>{USERS.find(u=>u.id===schedule.co_driver_id)?.phone}</span>
                        <span style={{ marginLeft:8, fontSize:11, background:'#dbeafe', color:blue, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>2인 현장</span></>
                    : <span style={{ fontSize:13, color:muted }}>없음 (1인 현장)</span>}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {schedule.co_driver_id && USERS.find(u=>u.id===schedule.co_driver_id)?.phone && (
                    <a href={`tel:${USERS.find(u=>u.id===schedule.co_driver_id)?.phone}`} style={{ textDecoration:'none' }}>
                      <button style={{ background:green, color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        📞 전화
                      </button>
                    </a>
                  )}
                  <button onClick={()=>setEditCoDriver(true)}
                    style={{ background:'none', border:`1px solid ${border}`, borderRadius:7, padding:'6px 12px', fontSize:12, color:muted, cursor:'pointer' }}>
                    {schedule.co_driver_id ? '변경' : '+ 배정'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 기본 정보 */}
        <Card style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase' }}>현장 정보</div>
            {!editInfo
              ? <button onClick={()=>setEditInfo(true)}
                  style={{ background:'none', border:`1px solid ${border}`, borderRadius:7, padding:'5px 12px', fontSize:12, color:muted, cursor:'pointer' }}>
                  ✏️ 수정
                </button>
              : <div style={{ display:'flex', gap:8 }}>
                  <button onClick={cancelInfo}
                    style={{ background:'none', border:`1px solid ${border}`, borderRadius:7, padding:'5px 12px', fontSize:12, color:muted, cursor:'pointer' }}>
                    취소
                  </button>
                  <button onClick={saveInfo}
                    style={{ background:blue, color:'#fff', border:'none', borderRadius:7, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    저장
                  </button>
                </div>
            }
          </div>
          {editInfo ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>날짜</div>
                  <input type="date" value={infoForm.date} onChange={e=>setIF('date',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>시간</div>
                  <div style={{ display:'flex', gap:4, marginBottom:5 }}>
                    {['오전중','오후중','당일중'].map(v=>(
                      <button key={v} type="button" onClick={()=>setIF('time',v)}
                        style={{ flex:1, padding:'5px 2px', fontSize:11, borderRadius:6, border:`1px solid ${infoForm.time===v?blue:border}`, background:infoForm.time===v?blue:'#fff', color:infoForm.time===v?'#fff':textC, cursor:'pointer', fontWeight:infoForm.time===v?700:400 }}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <input type="time"
                    value={['오전중','오후중','당일중'].includes(infoForm.time) ? '' : infoForm.time}
                    onChange={e=>setIF('time',e.target.value)}
                    style={{ ...iStyle, fontSize:13 }}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>주소</div>
                <input value={infoForm.address} onChange={e=>setIF('address',e.target.value)} placeholder="현장 주소" style={{ ...iStyle, fontSize:13 }}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>폐기물량</div>
                <input value={infoForm.waste} onChange={e=>setIF('waste',e.target.value)} placeholder="예: 2톤" style={{ ...iStyle, fontSize:13 }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>현장 담당자</div>
                  <input value={infoForm.cname} onChange={e=>setIF('cname',e.target.value)} placeholder="담당자 이름" style={{ ...iStyle, fontSize:13 }}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>연락처</div>
                  <input value={infoForm.cphone} onChange={e=>setIF('cphone',e.target.value)} placeholder="010-0000-0000" style={{ ...iStyle, fontSize:13 }}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>메모</div>
                <input value={infoForm.memo} onChange={e=>setIF('memo',e.target.value)} placeholder="관리자 메모 (선택)" style={{ ...iStyle, fontSize:13 }}/>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:12 }}><CopyAddress address={schedule.address}/></div>
              <Row label="날짜 · 시간" value={`${schedule.date}  ${schedule.time}`}/>
              <Row label="폐기물량"     value={schedule.waste}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${border}`, fontSize:14 }}>
                <span style={{ color:muted, fontSize:13 }}>현장 담당자</span>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontWeight:500, color:textC }}>{schedule.cname}  {schedule.cphone}</span>
                  {schedule.cphone && (
                    <a href={`tel:${schedule.cphone}`} style={{ textDecoration:'none' }}>
                      <button style={{ background:green, color:'#fff', border:'none', borderRadius:7, padding:'4px 12px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                        📞 전화
                      </button>
                    </a>
                  )}
                </div>
              </div>
              {schedule.memo && <Row label="관리자 메모" value={schedule.memo}/>}
            </>
          )}
        </Card>

        {/* 일정 사진 (관리자 첨부) */}
        <Card style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:textC }}>일정 사진</div>
              <div style={{ fontSize:12, color:muted, marginTop:2 }}>현장 참고용 · 기사 앱에도 표시</div>
            </div>
            <button onClick={()=>spFileRef.current?.click()}
              style={{ background:blue, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              + 사진 추가
            </button>
            <input ref={spFileRef} type="file" accept="image/*" multiple onChange={addSchedulePhotos} style={{ display:'none' }}/>
          </div>

          {/* 붙여넣기 토스트 */}
          {pasteMsg && (
            <div style={{ background:'#dcfce7', border:`1px solid #86efac`, borderRadius:8, padding:'7px 12px', marginBottom:8, fontSize:13, color:'#166534', fontWeight:500 }}>
              {pasteMsg}
            </div>
          )}

          {/* 드래그앤드롭 + 붙여넣기 안내 */}
          <div ref={dropRef}
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            onClick={schedulePhotos.length===0 ? ()=>spFileRef.current?.click() : undefined}
            style={{
              border: `2px dashed ${schedulePhotos.length>0 ? border : '#93c5fd'}`,
              borderRadius:10,
              background: schedulePhotos.length>0 ? 'transparent' : '#f0f9ff',
              cursor: schedulePhotos.length===0 ? 'pointer' : 'default',
              transition:'all .15s'
            }}>
            {schedulePhotos.length > 0 ? (
              <div style={{ padding:'8px 0 0' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:6 }}>
                  {schedulePhotos.map((src,i)=>(
                    <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                      <img src={src} alt={`일정사진${i+1}`} onClick={()=>openLightbox('schedule',i)}
                        style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer', transition:'transform .15s' }}
                        onMouseEnter={e=>e.target.style.transform='scale(1.04)'}
                        onMouseLeave={e=>e.target.style.transform='scale(1)'}/>
                      <button onClick={()=>removeSchedulePhoto(i)}
                        style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.6)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                      <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                    </div>
                  ))}
                  <div onClick={()=>spFileRef.current?.click()}
                    style={{ aspectRatio:'1', border:`2px dashed ${border}`, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#f8fafc' }}>
                    <div style={{ fontSize:20, color:muted }}>+</div>
                    <div style={{ fontSize:11, color:muted }}>추가</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:muted, textAlign:'center', paddingBottom:6 }}>
                  Ctrl+V 붙여넣기 · 드래그 추가 · 카카오톡 이미지 복사 후 Ctrl+V 가능
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:18 }}>
                <div style={{ fontSize:26, marginBottom:6 }}>📎</div>
                <div style={{ fontSize:14, color:'#1d4ed8', fontWeight:600, marginBottom:4 }}>사진 추가하기</div>
                <div style={{ fontSize:12, color:muted, lineHeight:1.8 }}>
                  클릭 · 드래그앤드롭 · Ctrl+V 붙여넣기<br/>
                  <span style={{ color:'#059669' }}>카카오톡에서 이미지 복사 → 이 화면에서 Ctrl+V</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 업무 기록 */}
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase', marginBottom:10 }}>업무 기록</div>

          {/* 출발 */}
          <TimeEditRow label="출발" value={schedule.depart_time} color={blue}
            onSave={v=>onUpdate({ depart_time:v||null })}/>

          {/* 도착 예상 + 문자 발송 통합 */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${border}`, fontSize:14, gap:8 }}>
            <span style={{ color:muted, fontSize:13, flexShrink:0 }}>도착 예상 · 문자</span>
            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
              <span style={{ fontWeight:500, color:schedule.eta?blue:muted, fontFamily:'monospace' }}>
                {schedule.eta||'미입력'}
              </span>
              {schedule.sms_sent
                ? <span style={{ fontSize:11, background:'#dcfce7', color:green, padding:'2px 7px', borderRadius:4, fontWeight:600, whiteSpace:'nowrap' }}>💬 발송됨</span>
                : <span style={{ fontSize:11, background:'#f1f5f9', color:muted, padding:'2px 7px', borderRadius:4, whiteSpace:'nowrap' }}>미발송</span>
              }
            </div>
          </div>

          {/* 작업 시작 — 수정 가능 */}
          <TimeEditRow label="작업 시작" value={schedule.start_time} color={green}
            onSave={v=>onUpdate({ start_time:v||null })}/>

          {/* 예상 물량·시간 */}
          {(schedule.est_waste||schedule.est_duration) && (
            <Row label="예상 물량·시간"
              value={[schedule.est_waste, schedule.est_duration].filter(Boolean).join('  ·  ')}
              valueColor={amber}/>
          )}

          {/* 업무 완료 — 수정 가능 */}
          <TimeEditRow label="업무 완료" value={schedule.end_time} color={green}
            onSave={v=>onUpdate({ end_time:v||null })}/>

          {/* 최종 물량 */}
          {schedule.final_waste && (
            <Row label="최종 물량" value={schedule.final_waste} valueColor={amber}/>
          )}

          {/* 완료 시: 작업시간 통합 표시 + 청구 버튼 */}
          {schedule.start_time && schedule.end_time && (() => {
            const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m }
            const diff = toMin(schedule.end_time) - toMin(schedule.start_time)
            if (diff <= 0) return null
            const h = Math.floor(diff/60), m = diff%60
            const total = h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`
            return (
              <div style={{ padding:'8px 0 4px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
                  <span style={{ color:muted }}>작업 시간</span>
                  <span style={{ fontWeight:600, color:blue }}>
                    {schedule.start_time} ~ {schedule.end_time}
                    <span style={{ marginLeft:8, background:'#dbeafe', color:blue, fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700 }}>
                      총 {total}
                    </span>
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                  <button onClick={()=>setShowBilling(true)}
                    style={{ background:navy, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                    💰 청구서 작성
                  </button>
                </div>
              </div>
            )
          })()}
        </Card>

        {/* 기사 특이사항 */}
        {schedule.driver_note && (
          <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:amber, marginBottom:6 }}>📋 기사 특이사항</div>
            <div style={{ fontSize:13, color:textC, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{schedule.driver_note}</div>
          </div>
        )}

        {/* 작업 시작 사진 */}
        {(() => {
          const workPics = schedule.work_photos || []
          if (workPics.length === 0 && !schedule.start_time) return null
          return (
            <Card style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:700, color:textC }}>
                  📍 작업 시작 사진
                  <span style={{ fontSize:12, color:muted, marginLeft:6, fontWeight:400 }}>{workPics.length}장</span>
                </div>
                <button onClick={()=>wpFileRef.current?.click()}
                  style={{ background:amber, color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  + 추가
                </button>
                <input ref={wpFileRef} type="file" accept="image/*" multiple onChange={addWorkPhotos} style={{ display:'none' }}/>
              </div>
              {workPics.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {workPics.map((src,i)=>(
                    <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                      <img src={src} alt={`현장${i+1}`} onClick={()=>openLightbox('work',i)}
                        style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                      <button onClick={()=>removeWorkPhoto(i)}
                        style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.6)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                      <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'14px 0', color:muted, fontSize:13 }}>사진 없음</div>
              )}
            </Card>
          )
        })()}

        {/* 작업 완료 사진 */}
        {(() => {
          if (completePhotos.length === 0 && schedule.status !== '완료') return null
          return (
            <Card style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:700, color:textC }}>
                  ✅ 작업 완료 사진
                  <span style={{ fontSize:12, color:muted, marginLeft:6, fontWeight:400 }}>{completePhotos.length}장</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {((schedule.work_photos||[]).length > 0 || completePhotos.length > 0) && (
                    <button onClick={()=>downloadAllPhotos([...(schedule.work_photos||[]), ...completePhotos], `전체사진_${schedule.address.slice(0,10)}`)}
                      style={{ background:'#f1f5f9', color:muted, border:`1px solid ${border}`, borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      ⬇ 전체 다운로드
                    </button>
                  )}
                  <button onClick={()=>cpFileRef.current?.click()}
                    style={{ background:green, color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    + 추가
                  </button>
                </div>
                <input ref={cpFileRef} type="file" accept="image/*" multiple onChange={addCompletePhotos} style={{ display:'none' }}/>
              </div>
              {completePhotos.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {completePhotos.map((src,i)=>(
                    <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                      <img src={src} alt={`완료${i+1}`} onClick={()=>openLightbox('complete',i)}
                        style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                      <button onClick={()=>removeCompletePhoto(i)}
                        style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.6)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                      <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'14px 0', color:muted, fontSize:13 }}>사진 없음</div>
              )}
            </Card>
          )
        })()}
      </div>

      {showBilling && (() => {
        const toMin = t => { if(!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m }
        const diff = toMin(schedule.end_time) - toMin(schedule.start_time)
        const h = Math.floor(diff/60), m = diff%60
        const duration = diff > 0 ? (h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`) : ''
        const workTime = (schedule.start_time && schedule.end_time && duration)
          ? `${schedule.start_time} ~ ${schedule.end_time} (${duration})`
          : duration

        const companyName = (schedule.cname || '').replace(/\(.*?\)/g, '').trim()
        const wasteAmt = billingForm.waste

        const buildText = () =>
`[FN퍼니 작업보고]
작업날짜: ${schedule.date}
업체명: ${companyName}
작업인원: ${billingForm.workers}인
현장주소: ${schedule.address}
작업시간: ${workTime}
성상: 혼합
폐기물양: ${wasteAmt}
특이사항: ${schedule.driver_note || '없음'}

<청구금액>
${wasteAmt} > ${billingForm.amount}만원
${billingForm.workers}인 *${duration} > ${billingForm.unit}만원
${billingForm.total}만원 (부가세 포함)
*청구내역이나 업무관련 의견 편하게 말씀해주세요 적극 재검토 하겠습니다^^
기업 351-112230-01-015 주식회사 퍼니환경개발`

        const copy = () => {
          navigator.clipboard.writeText(buildText()).then(() => {
            setBillCopied(true)
            setTimeout(() => setBillCopied(false), 2000)
          })
        }

        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
            <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:440, maxHeight:'90vh', overflowY:'auto' }}>
      
              <div style={{ padding:'16px 20px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
                <div style={{ fontSize:16, fontWeight:700, color:navy }}>💰 청구서 작성</div>
                <button onClick={()=>setShowBilling(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
              </div>

              <div style={{ padding:'16px 20px' }}>

                <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>

                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>작업인원</div>
                    <div style={{ display:'flex', gap:8 }}>
                      {['1','2','3','4'].map(n=>(
                        <button key={n} onClick={()=>setBF('workers',n)}
                          style={{ flex:1, padding:'10px 0', borderRadius:8, border:`1.5px solid ${billingForm.workers===n?navy:border}`, background:billingForm.workers===n?navy:'#f8fafc', color:billingForm.workers===n?'#fff':muted, fontSize:16, fontWeight:700, cursor:'pointer' }}>
                          {n}인
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>폐기물 양</div>
                    <input value={billingForm.waste} onChange={e=>setBillingForm(p=>({...p, waste:e.target.value}))}
                      placeholder="예) 1톤, 500kg" style={{ ...iStyle, fontSize:16, fontWeight:700, width:'100%' }}/>
                  </div>

                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>
                      폐기물 청구금액 <span style={{ fontWeight:400, color:'#94a3b8' }}>({wasteAmt} &gt; ? 만원)</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input type="number" value={billingForm.amount} onChange={e=>setBF('amount',e.target.value)}
                        onKeyDown={e=>{ if(e.key==='Enter') billUnitRef.current?.focus() }}
                        placeholder="금액 입력" style={{ ...iStyle, fontSize:18, fontWeight:700, textAlign:'right', flex:1 }}/>
                      <span style={{ fontSize:16, color:muted, whiteSpace:'nowrap' }}>만원</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>
                      {billingForm.workers}인 금액
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input ref={billUnitRef} type="number" value={billingForm.unit} onChange={e=>setBF('unit',e.target.value)}
                        placeholder="금액 입력" style={{ ...iStyle, fontSize:18, fontWeight:700, textAlign:'right', flex:1 }}/>
                      <span style={{ fontSize:16, color:muted, whiteSpace:'nowrap' }}>만원</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>합계 (부가세 포함)
                      <span style={{ fontWeight:400, color:'#94a3b8', marginLeft:6 }}>자동 계산됨</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input type="number" value={billingForm.total}
                        onChange={e=>setBillingForm(p=>({...p, total:e.target.value}))}
                        placeholder="자동 합산" style={{ ...iStyle, fontSize:19, fontWeight:700, textAlign:'right', flex:1, borderColor: billingForm.total ? navy : undefined }}/>
                      <span style={{ fontSize:16, color:muted, whiteSpace:'nowrap' }}>만원</span>
                    </div>
                  </div>
                </div>

                <div style={{ background:'#eff6ff', border:`1px solid #bfdbfe`, borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:14, fontFamily:'monospace', lineHeight:2 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:navy, marginBottom:2 }}>&lt;청구금액&gt;</div>
                  <div style={{ color:textC }}>{wasteAmt || '__'} &gt; {billingForm.amount||'__'}만원</div>
                  <div style={{ color:textC }}>{billingForm.workers}인 *{duration||'__'} &gt; {billingForm.unit||'__'}만원</div>
                  <div style={{ color:textC, fontWeight:700 }}>{billingForm.total||'__'}만원 (부가세 포함)</div>
                  <div style={{ color:muted, fontSize:13, marginTop:4, lineHeight:1.7 }}>*청구내역이나 업무관련 의견 편하게 말씀해주세요 적극 재검토 하겠습니다^^</div>
                  <div style={{ color:navy, fontSize:13, fontWeight:600 }}>기업 351-112230-01-015 주식회사 퍼니환경개발</div>
                </div>

                {((schedule.work_photos||[]).length > 0 || completePhotos.length > 0) && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:muted, marginBottom:8 }}>전체 작업사진</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
                      {(schedule.work_photos||[]).map((p,i) => (
                        <img key={'w'+i} src={p} onClick={()=>openLightbox('work',i)}
                          style={{ width:'100%', aspectRatio:'1', objectFit:'cover', borderRadius:6, cursor:'pointer' }}/>
                      ))}
                      {completePhotos.map((p,i) => (
                        <img key={'c'+i} src={p} onClick={()=>openLightbox('complete',i)}
                          style={{ width:'100%', aspectRatio:'1', objectFit:'cover', borderRadius:6, cursor:'pointer' }}/>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', gap:10 }}>
                  <Btn onClick={()=>setShowBilling(false)} outline color={muted} style={{ flex:1, fontSize:14 }}>닫기</Btn>
                  <Btn onClick={copy} color={billCopied?green:navy} style={{ flex:2, fontSize:15 }}>
                    {billCopied ? '✓ 복사됨!' : '📋 클립보드 복사'}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {lightbox!==null && <Lightbox photos={lbPhotos} index={lightbox} onClose={()=>setLightbox(null)}/>}
    </div>
  )
}

// ── ETA 인라인 편집 컴포넌트 ──────────────────────────────────────
function EtaInlineEdit({ eta, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(eta || '')
  const inputRef              = useRef()

  const start = () => { setVal(eta||''); setEditing(true); setTimeout(()=>inputRef.current?.focus(),50) }
  const save  = () => { if (val) onSave(val); setEditing(false) }
  const cancel= () => setEditing(false)

  if (editing) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
        <input ref={inputRef} type="time" value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') save(); if(e.key==='Escape') cancel() }}
          style={{ padding:'4px 8px', border:`1.5px solid ${blue}`, borderRadius:6, fontSize:14, fontWeight:700, color:navy, outline:'none', letterSpacing:1, width:100 }}/>
        <button onClick={save}   style={{ background:blue, color:'#fff', border:'none', borderRadius:5, padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>저장</button>
        <button onClick={cancel} style={{ background:'none', border:'none', fontSize:11, color:muted, cursor:'pointer' }}>취소</button>
      </div>
    )
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
      {eta
        ? <span style={{ fontSize:14, fontWeight:700, color:navy, fontFamily:'monospace' }}>{eta}</span>
        : <span style={{ fontSize:12, color:muted }}>미설정</span>
      }
      <button onClick={start}
        style={{ background:'none', border:`1px solid ${border}`, borderRadius:5, padding:'2px 8px', fontSize:11, color:muted, cursor:'pointer' }}>
        ✏️ 수정
      </button>
    </div>
  )
}
// ── 기사용 시간 편집 ───────────────────────────────────────────────
function DriverTimeEdit({ label, value, color, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value || '')
  const inputRef              = useRef()

  const start  = () => { setVal(value||''); setEditing(true); setTimeout(()=>inputRef.current?.focus(),30) }
  const save   = () => { onSave(val); setEditing(false) }
  const cancel = () => setEditing(false)

  if (editing) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
        <input ref={inputRef} type="time" value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') save(); if(e.key==='Escape') cancel() }}
          style={{ flex:1, padding:'8px 10px', border:`1.5px solid ${blue}`, borderRadius:8, fontSize:16, fontWeight:700, color:navy, outline:'none', letterSpacing:2, textAlign:'center' }}/>
        <button onClick={save}   style={{ background:blue, color:'#fff', border:'none', borderRadius:7, padding:'8px 14px', fontSize:13, fontWeight:700, cursor:'pointer' }}>저장</button>
        <button onClick={cancel} style={{ background:'none', border:`1px solid ${border}`, borderRadius:7, padding:'8px 10px', fontSize:13, color:muted, cursor:'pointer' }}>✕</button>
      </div>
    )
  }
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'2px 0' }}>
      <span style={{ fontSize:15, fontFamily:'monospace', fontWeight:700, color: value?color:muted }}>
        {value ? `${label}:  ${value}` : `${label}: 미기록`}
      </span>
      <button onClick={start}
        style={{ background:'none', border:`1px solid ${border}`, borderRadius:6, padding:'4px 10px', fontSize:13, color:muted, cursor:'pointer', whiteSpace:'nowrap' }}>
        ✏️ 수정
      </button>
    </div>
  )
}

function TimeEditRow({ label, value, color, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value || '')
  const inputRef              = useRef()

  const start  = () => { setVal(value||''); setEditing(true); setTimeout(()=>inputRef.current?.focus(),30) }
  const save   = () => { onSave(val); setEditing(false) }
  const cancel = () => setEditing(false)
  const clear  = () => { onSave(''); setEditing(false) }

  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${border}`, fontSize:14, gap:8 }}>
      <span style={{ color:muted, fontSize:13, flexShrink:0 }}>{label}</span>
      {editing ? (
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <input ref={inputRef} type="time" value={val} onChange={e=>setVal(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter') save(); if(e.key==='Escape') cancel() }}
            style={{ padding:'4px 8px', border:`1.5px solid ${blue}`, borderRadius:6, fontSize:14, fontWeight:600, color:navy, outline:'none', letterSpacing:1 }}/>
          <button onClick={save}   style={{ background:blue, color:'#fff', border:'none', borderRadius:5, padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>저장</button>
          {value && <button onClick={clear}  style={{ background:'#fef2f2', color:red, border:`1px solid #fecaca`, borderRadius:5, padding:'4px 8px', fontSize:11, cursor:'pointer' }}>삭제</button>}
          <button onClick={cancel} style={{ background:'none', border:'none', fontSize:11, color:muted, cursor:'pointer' }}>취소</button>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontWeight:500, color: value?color:muted, fontFamily: value?'monospace':'inherit' }}>
            {value || '미기록'}
          </span>
          <button onClick={start}
            style={{ background:'none', border:`1px solid ${border}`, borderRadius:5, padding:'2px 8px', fontSize:11, color:muted, cursor:'pointer' }}>
            ✏️
          </button>
        </div>
      )}
    </div>
  )
}
function EtaModalInput({ eta, onChange }) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef()

  const tapEdit = () => { setEditing(true); setTimeout(()=>inputRef.current?.focus(),30) }
  const done    = () => setEditing(false)

  const addMin = m => {
    const [h, mi] = (eta||'00:00').split(':').map(Number)
    const total = h*60 + mi + m
    const nh = Math.floor(total/60) % 24
    const nm = total % 60
    onChange(`${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`)
  }

  return (
    <div>
      <div onClick={tapEdit} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'14px 0', background:'#f0f9ff', borderRadius:10, border:`1.5px solid ${editing?blue:'#bae6fd'}`, cursor:'pointer', marginBottom:10 }}>
        {editing ? (
          <input ref={inputRef} type="time" value={eta} onChange={e=>onChange(e.target.value)}
            onBlur={done} onKeyDown={e=>e.key==='Enter'&&done()}
            style={{ fontSize:28, fontWeight:700, color:navy, border:'none', background:'transparent', outline:'none', textAlign:'center', letterSpacing:3, width:130 }}/>
        ) : (
          <>
            <span style={{ fontSize:28, fontWeight:700, color:navy, fontFamily:'monospace', letterSpacing:3 }}>{eta||'--:--'}</span>
            <span style={{ fontSize:11, color:blue, background:'#dbeafe', padding:'3px 8px', borderRadius:5, fontWeight:600 }}>탭하여 수정</span>
          </>
        )}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {[['+10분',10],['+20분',20],['+30분',30],['+45분',45],['+1시간',60]].map(([l,m])=>(
          <button key={l} onClick={()=>addMin(m)}
            style={{ flex:1, padding:'7px 0', borderRadius:7, border:`1px solid ${border}`, background:'#f8fafc', color:muted, fontSize:11, fontWeight:600, cursor:'pointer' }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 주소 복사 컴포넌트 ───────────────────────────────────────────────
function CopyAddress({ address }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(address).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000) })
  }
  return (
    <div onClick={copy} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:16, fontWeight:700, color:navy }}>{address}</span>
      <span style={{ fontSize:11, color:copied?green:muted, background:copied?'#dcfce7':'#f1f5f9', padding:'2px 7px', borderRadius:4, fontWeight:600, whiteSpace:'nowrap', transition:'all .2s' }}>
        {copied?'✓ 복사됨':'📋 복사'}
      </span>
    </div>
  )
}

// ── 사진 일괄 다운로드 ───────────────────────────────────────────────
async function downloadAllPhotos(photos, prefix = '완료사진') {
  for (let i = 0; i < photos.length; i++) {
    const src = photos[i]
    const filename = `${prefix}_${String(i + 1).padStart(2, '0')}.jpg`
    try {
      let blob
      if (src.includes('cloudinary.com')) {
        // Cloudinary: fl_attachment로 다운로드 강제
        const safePrefix = filename.replace(/\.jpg$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
        const dlUrl = src.replace('/upload/', `/upload/fl_attachment:${safePrefix}/`)
        const res = await fetch(dlUrl)
        blob = await res.blob()
      } else if (src.startsWith('http')) {
        const res = await fetch(src)
        blob = await res.blob()
      } else {
        // base64 → blob 변환
        const arr = src.split(',')
        const mime = arr[0].match(/:(.*?);/)[1]
        const bstr = atob(arr[1])
        const u8 = new Uint8Array(bstr.length)
        for (let j = 0; j < bstr.length; j++) u8[j] = bstr.charCodeAt(j)
        blob = new Blob([u8], { type: mime })
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // revokeObjectURL은 약간 뒤에 해야 다운로드가 시작됨
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      window.open(src, '_blank')
    }
    // 브라우저 다운로드 제한 방지: 충분한 딜레이
    await new Promise(r => setTimeout(r, 800))
  }
}

function parseKoreanTime(raw) {
  if (!raw) return ''
  const s = raw.trim()
  // 오전중/오후중/당일중 → 시간보다 우선
  if (s.includes('오전중')) return '오전중'
  if (s.includes('오후중')) return '오후중'
  if (s.includes('당일중')) return '당일중'
  // 이미 HH:MM 형식
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h,m] = s.split(':').map(Number)
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }
  // "시간엄수", "미정" 등 → 원본 그대로
  const isAm = s.includes('오전')
  const isPm = s.includes('오후')
  const hm = s.replace(/오전|오후|중/g,'')
  const hMatch = hm.match(/(\d+)시/)
  const mMatch = hm.match(/(\d+)분/)
  if (!hMatch) return s  // 숫자 시간 없으면 원본 반환
  let h = parseInt(hMatch[1])
  const m = mMatch ? parseInt(mMatch[1]) : 0
  if (isPm && h < 12) h += 12
  if (isAm && h === 12) h = 0
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

function parseDate(raw) {
  if (!raw) return today
  const s = raw.trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // YYYY/MM/DD or MM/DD
  const slash = s.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/)
  if (slash) return `${slash[1]}-${String(slash[2]).padStart(2,'0')}-${String(slash[3]).padStart(2,'0')}`
  const short = s.match(/^(\d{1,2})[\/\.](\d{1,2})$/)
  if (short) return `${new Date().getFullYear()}-${String(short[1]).padStart(2,'0')}-${String(short[2]).padStart(2,'0')}`
  return today
}

// 헤더 키워드 → 필드 매핑
const HEADER_MAP = {
  date:   ['날짜','일자','date'],
  cname:  ['업체명','업체','현장명','현장','업체(담당자)','고객사'],
  address:['주소','현장주소','address'],
  time:   ['진입시간','시간','방문시간','예정시간','time'],
  cphone: ['전화번호','연락처','전화','핸드폰','phone','tel'],
  waste:  ['폐기물양','폐기물량','폐기물','양','waste'],
  memo:   ['비고','메모','참고','memo','note'],
  driver_hint: ['담당자','기사','기사명','driver'],
  driver_note: ['특이사항','비고2','note2'],
}

function detectColMap(headers) {
  const map = {} // fieldKey → colIndex
  headers.forEach((h, i) => {
    const norm = h.trim().replace(/\s|\*/g,'').toLowerCase()
    for (const [field, keywords] of Object.entries(HEADER_MAP)) {
      if (keywords.some(k => norm.includes(k.toLowerCase())) && !(field in map)) {
        map[field] = i
      }
    }
  })
  return map
}

// ── 카카오톡 일정 메시지 파서 ──────────────────────────────────────
function parseKakaoChat(text) {
  // 빈 줄 기준으로 블록 분리
  const blocks = text.trim().split(/\n{2,}/)
  const results = []

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l)
    if (lines.length < 3) continue

    // 전화번호 행 찾기 (마지막에서 역방향)
    const phoneIdx = [...lines].reverse().findIndex(l => /\d{3}[\s-]\d{3,4}[\s-]\d{4}/.test(l))
    if (phoneIdx < 0) continue
    const phoneLine = lines[lines.length - 1 - phoneIdx]
    const phoneRaw = phoneLine.match(/\d{3}[\s-]\d{3,4}[\s-]\d{4}/)?.[0] || ''
    const cphone = phoneRaw.replace(/\s/g, '-')
    const contentLines = lines.slice(0, lines.length - 1 - phoneIdx)
    if (contentLines.length < 2) continue

    // 1행: 업체명(담당자) 또는 업체명
    const cname = contentLines[0]

    // 2행: 날짜 + 시간 파싱
    const dateLine = contentLines[1] || ''
    let date = today
    const dateM = dateLine.match(/(\d{1,2})월\s*(\d{1,2})일/)
    if (dateM) {
      const y = new Date().getFullYear()
      date = `${y}-${String(dateM[1]).padStart(2,'0')}-${String(dateM[2]).padStart(2,'0')}`
    }
    // 시간: 오전중/오후중/당일중 우선, 그 다음 오전9~10시, 오전9시30분, 오후3시
    let time = '09:00'
    if (/오전중/.test(dateLine)) {
      time = '오전중'
    } else if (/오후중/.test(dateLine)) {
      time = '오후중'
    } else if (/당일중/.test(dateLine)) {
      time = '당일중'
    } else {
      const timeM = dateLine.match(/(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/)
      if (timeM) {
        let h = parseInt(timeM[2])
        const m = timeM[3] ? parseInt(timeM[3]) : 0
        if (timeM[1] === '오후' && h < 12) h += 12
        if (timeM[1] === '오전' && h === 12) h = 0
        time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      }
    }

    // 3행: 주소
    const address = contentLines[2] || ''

    // 나머지: 메모 + 폐기물량 추출
    const rest = contentLines.slice(3)
    // 폐기물량 패턴: "1/3차 이하", "2톤", "1차 이상", "물량" 등
    const wasteIdx = rest.findIndex(l => /\d+\/\d+차|[0-9.]+톤|[0-9]+차|이하|이상|물량/i.test(l))
    const waste = wasteIdx >= 0 ? rest[wasteIdx] : ''
    const memo = rest.filter((_, i) => i !== wasteIdx).join(' / ')

    results.push({ cname, date, time, address, cphone, waste, memo,
      _id: Math.random().toString(36).slice(2), driver_hint:'', driver_note:'' })
  }
  return results
}

// ── 일괄 등록 모달 (2단계: 일정 입력 → 기사 배치) ─────────────────
const newRow = () => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2,'0')
  const mm = String(now.getMinutes()).padStart(2,'0')
  return { _id: Math.random().toString(36).slice(2), date:today, time:`${hh}:${mm}`, address:'', waste:'', cname:'', cphone:'', memo:'', driver_hint:'', driver_note:'' }
}

function BulkScheduleModal({ drivers, onAddMany, onClose }) {
  const [step, setStep]       = useState(1)
  const [inputMode, setInputMode] = useState('paste') // 'paste' | 'kakao' | 'manual'
  const [rows, setRows]       = useState([newRow()])
  const [assigns, setAssigns] = useState({})
  const [coAssigns, setCoAssigns] = useState({})

  const [pasteRaw, setPasteRaw]   = useState('')
  const [parsed, setParsed]       = useState(null)
  const [colMap, setColMap]       = useState({})
  const [parseMsg, setParseMsg]   = useState('')

  const [kakaoRaw,  setKakaoRaw]  = useState('')
  const [kakaoRows, setKakaoRows] = useState([])
  const [kakaoMsg,  setKakaoMsg]  = useState('')

  const handlePasteInput = e => {

    const text = e.clipboardData ? e.clipboardData.getData('text') : e.target.value
    setPasteRaw(text)
    processPasteText(text)
    if (e.clipboardData) e.preventDefault()
  }

  const processPasteText = text => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
    if (!lines.length) return
    const grid = lines.map(l => l.split('\t'))
    const firstRow = grid[0]
    const detected = detectColMap(firstRow)
    const looksLikeHeader = Object.keys(detected).length >= 2
    const headers = looksLikeHeader ? firstRow : firstRow.map((_,i)=>`열${i+1}`)
    const data    = looksLikeHeader ? grid.slice(1) : grid

    const cm = looksLikeHeader ? detected : (() => {
      const auto = {}
      const fields = ['date','time','address','waste','cname','cphone','memo']
      firstRow.forEach((_,i) => { if (i < fields.length) auto[fields[i]] = i })
      return auto
    })()
    setParsed({ headers, data, looksLikeHeader })
    setColMap(cm)
    setParseMsg(looksLikeHeader
      ? `✅ ${data.length}행 감지 · 헤더 자동 인식 · 컬럼 매핑 확인 후 가져오기`
      : `⚠️ ${data.length}행 감지 · 헤더 미인식 → 열 순서(날짜/시간/주소/폐기물양/업체명/연락처/메모)로 자동 배정`)
  }

  const handleKakaoParse = (text) => {
    if (!text.trim()) return
    const result = parseKakaoChat(text)
    setKakaoRows(result)
    setKakaoMsg(result.length > 0
      ? `✅ ${result.length}건 파싱 완료 · 확인 후 가져오기`
      : '⚠️ 인식된 일정이 없습니다. 형식을 확인해주세요.')
  }
  const applyKakao = () => {
    if (!kakaoRows.length) return
    const autoAssign = {}
    const autoCoAssign = {}
    kakaoRows.forEach(r => {
      if (r.driver_hint) {
        const parts = r.driver_hint.split(/[,，]/)
        const main = findDriver(parts[0])
        if (main) autoAssign[r._id] = main.id
        if (parts[1]) {
          const co = findDriver(parts[1])
          if (co) autoCoAssign[r._id] = co.id
        }
      }
    })
    setRows(kakaoRows)
    setAssigns(autoAssign)
    setCoAssigns(autoCoAssign)
    setKakaoMsg('')
    setStep(2)
  }
  const colMapRef = useRef(colMap)
  colMapRef.current = colMap
  const parsedRef = useRef(parsed)
  parsedRef.current = parsed

  const applyParse = () => {
    const p = parsedRef.current
    const cm = colMapRef.current
    if (!p) return
    const { data } = p
    const get = (row, field) => {
      const i = cm[field]
      if (i === undefined || i === null || i === '') return ''
      const idx = Number(i)
      return (idx < row.length) ? (row[idx] ?? '').toString().trim() : ''
    }
    const imported = data
      .filter(row => row.some(c => (c ?? '').toString().trim()))
      .map(row => ({
        _id:         Math.random().toString(36).slice(2),
        date:        parseDate(get(row,'date')),
        time:        parseKoreanTime(get(row,'time')) || get(row,'time') || '',
        address:     get(row,'address'),
        waste:       get(row,'waste'),
        cname:       get(row,'cname'),
        cphone:      get(row,'cphone'),
        memo:        get(row,'memo'),
        driver_hint: get(row,'driver_hint'),
        driver_note: get(row,'driver_note'),
      }))
    if (!imported.length) { alert('가져올 데이터가 없습니다. 컬럼 매핑을 확인해주세요.'); return }
    setRows(imported)
    setInputMode('manual')
    setParseMsg('')
  }

  const setRow = (_id, k, v) => setRows(prev => prev.map(r => r._id===_id ? {...r,[k]:v} : r))
  const addRow = () => setRows(prev => [...prev, newRow()])
  const delRow = _id => setRows(prev => prev.filter(r => r._id!==_id))
  const copyRow = _id => {
    const src = rows.find(r=>r._id===_id)
    setRows(prev => {
      const idx = prev.findIndex(r=>r._id===_id)
      const copy = {...src, _id:Math.random().toString(36).slice(2)}
      const next = [...prev]; next.splice(idx+1,0,copy); return next
    })
  }

  const findDriver = hint => drivers.find(d => d.name.includes(hint.trim()) || hint.trim().includes(d.name))

  const goStep2 = () => {
    const bad = rows.filter(r => !r.address)
    if (bad.length) return alert(`${bad.length}개 일정에 주소가 비어 있습니다.`)
    const autoAssign = {}
    const autoCoAssign = {}
    rows.forEach(r => {
      if (r.driver_hint) {
        const parts = r.driver_hint.split(/[,，]/)
        const main = findDriver(parts[0])
        if (main) autoAssign[r._id] = main.id
        if (parts[1]) {
          const co = findDriver(parts[1])
          if (co) autoCoAssign[r._id] = co.id
        }
      }
    })
    setAssigns(autoAssign)
    setCoAssigns(autoCoAssign)
    setStep(2)
  }

  const setAssign = (_id, v) => setAssigns(prev=>({...prev,[_id]:v}))
  const assignAll = dId => { const map={}; rows.forEach(r=>{ map[r._id]=dId }); setAssigns(map) }

  const submit = () => {
    const list = rows.map((r, i) => ({
      ...r,
      order:          i,
      driver_id:      assigns[r._id] || null,
      co_driver_id:   coAssigns[r._id] || null,
      driver_note:    r.driver_note || '',
      status:'대기', start_time:null, end_time:null,
      eta:null, sms_sent:false, photos:[],
    }))
    onAddMany(list)
  }

  const is = {
    padding:'6px 8px', border:`1px solid ${border}`, borderRadius:6, fontSize:12,
    outline:'none', background:'#fafafa', boxSizing:'border-box', width:'100%',
  }

  const driverColor     = ['#eff6ff','#f0fdf4','#fefce8','#fdf4ff','#fff1f2']
  const driverTextColor = [blue, green, '#a16207', '#7c3aed', '#be185d']
  const driverMap = {}
  drivers.forEach((d,i) => { driverMap[d.id] = {bg:driverColor[i%5], color:driverTextColor[i%5], name:d.name} })

  const assignedCount = rows.filter(r=>assigns[r._id]).length

  const colOptions = parsed?.headers.map((h,i)=>({ label:`[${i+1}열] ${h}`, value:i })) || []

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth: step===1 ? 960 : 700, maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:16, fontWeight:700, color:navy }}>
              {step===1 ? '📋 일정 입력' : '🚚 기사 배치'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
              {[['1','일정 입력'],['2','기사 배치']].map(([n,l],i)=>(
                <div key={n} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {i>0 && <div style={{ width:20, height:1, background:step>i?blue:border }}/>}
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:step>=i+1?blue:'#e2e8f0', color:step>=i+1?'#fff':muted, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{n}</div>
                    <span style={{ color:step>=i+1?blue:muted, fontWeight:step===i+1?600:400 }}>{l}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
        </div>

        {/* ══ STEP 1 ══ */}
        {step===1 && (
          <>

            <div style={{ display:'flex', borderBottom:`1px solid ${border}`, flexShrink:0 }}>
              {[['paste','📊 엑셀 붙여넣기'],['kakao','💬 카카오톡'],['manual','✏️ 직접 입력']].map(([m,l])=>(
                <button key={m} onClick={()=>setInputMode(m)}
                  style={{ padding:'10px 18px', fontSize:13, fontWeight:600, border:'none', borderBottom:`2.5px solid ${inputMode===m?blue:'transparent'}`, color:inputMode===m?blue:muted, background:'none', cursor:'pointer' }}>
                  {l}
                </button>
              ))}
            </div>

            {inputMode==='kakao' && (
              <div style={{ flex:1, overflowY:'auto', padding:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:textC, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                  💬 카카오톡 일정 메시지 붙여넣기
                  <span style={{ fontSize:11, color:muted, fontWeight:400 }}>스케줄방 메시지를 복사해서 붙여넣으세요</span>
                </div>

                <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#166534', lineHeight:1.8 }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>인식 형식 예시</div>
                  <div style={{ fontFamily:'monospace', fontSize:11, whiteSpace:'pre', background:'#fff', borderRadius:6, padding:'8px 10px', border:`1px solid #bbf7d0` }}>{`디자인도트(김혜진)
3월18일 (수) 오전9~10시
성북구 보문파크뷰자이 101동 1105호
공동 : 1105 동 0510
세대 : 0510*
열베, 동선 보양제거
1/3차 이하
010 2745 5077`}</div>
                  <div style={{ marginTop:6, fontSize:11 }}>여러 건은 <b>빈 줄</b>로 구분 · 각 블록 마지막 줄이 전화번호여야 합니다</div>
                </div>

                <textarea
                  autoFocus
                  placeholder="카카오톡 메시지를 여기에 붙여넣으세요 (Ctrl+V)&#10;여러 건 동시 입력 가능 — 빈 줄로 구분"
                  value={kakaoRaw}
                  onPaste={e => {
                    const text = e.clipboardData.getData('text')
                    setKakaoRaw(text)
                    handleKakaoParse(text)
                    e.preventDefault()
                  }}
                  onChange={e => { setKakaoRaw(e.target.value); handleKakaoParse(e.target.value) }}
                  style={{ width:'100%', height:180, padding:14, border:`2px solid ${border}`, borderRadius:10, fontSize:13, lineHeight:1.7, resize:'vertical', outline:'none', boxSizing:'border-box', background:'#f8fafc', color:textC, fontFamily:'monospace' }}
                />

                {kakaoMsg && (
                  <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background: kakaoRows.length>0?'#f0fdf4':'#fef2f2', border:`1px solid ${kakaoRows.length>0?'#86efac':'#fca5a5'}`, fontSize:13, color: kakaoRows.length>0?'#166534':red, fontWeight:500 }}>
                    {kakaoMsg}
                  </div>
                )}

                {kakaoRows.length > 0 && (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:8 }}>파싱 결과 미리보기</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:260, overflowY:'auto' }}>
                      {kakaoRows.map((r,i)=>(
                        <div key={r._id} style={{ background:'#fff', border:`1px solid ${border}`, borderRadius:8, padding:'10px 12px', fontSize:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontWeight:700, color:navy }}>{i+1}. {r.cname}</span>
                            <span style={{ fontFamily:'monospace', color:blue, fontWeight:600 }}>{r.date} {r.time}</span>
                          </div>
                          <div style={{ color:textC, marginBottom:2 }}>{r.address}</div>
                          <div style={{ color:muted, display:'flex', gap:12 }}>
                            {r.waste && <span>폐기물: {r.waste}</span>}
                            <span>{r.cphone}</span>
                          </div>
                          {r.memo && <div style={{ color:muted, fontSize:11, marginTop:2 }}>메모: {r.memo}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {inputMode==='paste' && (
              <div style={{ flex:1, overflowY:'auto', padding:20 }}>

                {!parsed && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:textC, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                      📊 엑셀 데이터 붙여넣기
                      <span style={{ fontSize:11, color:muted, fontWeight:400 }}>엑셀에서 복사(Ctrl+C) 후 아래 영역에 붙여넣기(Ctrl+V)</span>
                    </div>
                    <textarea
                      autoFocus
                      placeholder={"여기를 클릭하고 Ctrl+V 로 엑셀 데이터를 붙여넣으세요.\n\n헤더 행 포함 여부 자동 감지\n지원 컬럼: 날짜 · 업체명 · 주소 · 진입시간 · 전화번호 · 폐기물양 · 비고 · 담당자 · 특이사항"}
                      onPaste={handlePasteInput}
                      onChange={e => { if(e.target.value) { setPasteRaw(e.target.value); processPasteText(e.target.value) } }}
                      value={pasteRaw}
                      style={{ width:'100%', height:180, padding:14, border:`2px solid ${border}`, borderRadius:10, fontSize:13, lineHeight:1.6, resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'monospace', background:'#f8fafc', color:textC }}
                    />
                    <div style={{ fontSize:12, color:muted, marginTop:6 }}>탭 구분 텍스트를 자동으로 파싱합니다</div>
                  </div>
                )}

                {parsed && (
                  <>
                    <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:10, padding:'10px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:16 }}>✅</span>
                      <span style={{ fontSize:13, color:'#166534', fontWeight:500 }}>{parseMsg}</span>
                      <button onClick={()=>{ setParsed(null); setPasteRaw(''); setColMap({}) }}
                        style={{ marginLeft:'auto', background:'none', border:'none', color:muted, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
                        다시 붙여넣기
                      </button>
                    </div>

                    <div style={{ background:'#fff', border:`1px solid ${border}`, borderRadius:10, padding:16, marginBottom:16 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:12 }}>컬럼 매핑 확인</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                        {[
                          ['date','날짜 *'],['time','진입시간 *'],['address','주소 *'],
                          ['waste','폐기물양 *'],['cname','업체명/담당자 *'],['cphone','전화번호 *'],
                          ['memo','비고'],['driver_hint','담당 기사명'],['driver_note','특이사항'],
                        ].map(([field, label])=>(
                          <div key={field}>
                            <div style={{ fontSize:11, fontWeight:600, color:muted, marginBottom:4 }}>{label}</div>
                            <select value={colMap[field]??''} onChange={e=>setColMap(p=>({...p,[field]:e.target.value===''?undefined:Number(e.target.value)}))}
                              style={{ ...is, fontSize:12, background: colMap[field]!==undefined?'#eff6ff':'#f8fafc', color: colMap[field]!==undefined?blue:muted }}>
                              <option value="">— 매핑 안함 —</option>
                              {colOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border:`1px solid ${border}`, borderRadius:10, overflow:'hidden', marginBottom:16 }}>
                      <div style={{ background:'#f8fafc', padding:'8px 14px', fontSize:12, fontWeight:600, color:muted, borderBottom:`1px solid ${border}` }}>
                        미리보기 (최대 5행)
                      </div>
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                          <thead>
                            <tr style={{ background:'#f8fafc' }}>
                              {parsed.headers.map((h,i)=>(
                                <th key={i} style={{ padding:'6px 8px', textAlign:'left', color: Object.values(colMap).includes(i)?blue:muted, fontWeight:600, whiteSpace:'nowrap', borderBottom:`1px solid ${border}` }}>
                                  {h || `열${i+1}`}
                                  {Object.values(colMap).includes(i) && <span style={{ fontSize:9, marginLeft:4, color:blue }}>✓</span>}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsed.data.slice(0,5).map((row,i)=>(
                              <tr key={i} style={{ borderBottom:`1px solid ${border}` }}>
                                {row.map((cell,j)=>(
                                  <td key={j} style={{ padding:'5px 8px', color: Object.values(colMap).includes(j)?textC:muted, background: Object.values(colMap).includes(j)?'#f0f9ff':'#fff', whiteSpace:'nowrap', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis' }}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <Btn onClick={applyParse} style={{ width:'100%', padding:12, fontSize:14 }}>
                      ✓ {parsed.data.length}건 가져오기
                    </Btn>
                  </>
                )}
              </div>
            )}

            {inputMode==='manual' && (
              <div style={{ overflowY:'auto', flex:1 }}>
                {/* 날짜 일괄 변경 */}
                <div style={{ padding:'8px 12px', background:'#eff6ff', borderBottom:`1px solid #bfdbfe`, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, fontWeight:600, color:blue, whiteSpace:'nowrap' }}>📅 날짜 일괄 변경</span>
                  <input type="date"
                    defaultValue={today}
                    id="bulkDateInput"
                    style={{ ...is, width:'auto', fontSize:12, borderColor:'#93c5fd' }}
                  />
                  <button
                    onClick={()=>{
                      const val = document.getElementById('bulkDateInput')?.value
                      if (val) setRows(prev => prev.map(r => ({...r, date:val})))
                    }}
                    style={{ background:blue, color:'#fff', border:'none', borderRadius:7, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                    전체 적용
                  </button>
                  <span style={{ fontSize:11, color:'#3b82f6', opacity:.7 }}>모든 행의 날짜를 한번에 바꿉니다</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:820 }}>
                    <thead>
                      <tr style={{ background:'#f8fafc', borderBottom:`1px solid ${border}`, position:'sticky', top:0, zIndex:1 }}>
                        <th style={{ padding:'10px 10px', textAlign:'center', color:muted, fontWeight:600, width:36 }}>#</th>
                        {[['날짜 *',90],['시간 *',76],['주소 *',200],['폐기물량 *',80],['업체/담당자 *',90],['연락처 *',110],['메모',110],['특이사항',110]].map(([h,w])=>(
                          <th key={h} style={{ padding:'10px 8px', textAlign:'left', color:muted, fontWeight:600, minWidth:w, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                        <th style={{ padding:'10px 8px', width:60 }}/>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r,i)=>(
                        <tr key={r._id} style={{ borderBottom:`1px solid ${border}` }}>
                          <td style={{ padding:'8px 10px', textAlign:'center', color:muted, fontSize:11 }}>{i+1}</td>
                          <td style={{ padding:'6px 6px' }}><input type="date" value={r.date} onChange={e=>setRow(r._id,'date',e.target.value)} style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input type="time" value={r.time} onChange={e=>setRow(r._id,'time',e.target.value)} style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.address} onChange={e=>setRow(r._id,'address',e.target.value)} placeholder="현장 주소" style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.waste}   onChange={e=>setRow(r._id,'waste',e.target.value)}   placeholder="2톤"    style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.cname}  onChange={e=>setRow(r._id,'cname',e.target.value)}  placeholder="이름"   style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.cphone} onChange={e=>setRow(r._id,'cphone',e.target.value)} placeholder="010-0000-0000" style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.memo}   onChange={e=>setRow(r._id,'memo',e.target.value)}   placeholder="비고" style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.driver_note||''} onChange={e=>setRow(r._id,'driver_note',e.target.value)} placeholder="특이사항" style={is}/></td>
                          <td style={{ padding:'6px 8px' }}>
                            <div style={{ display:'flex', gap:4 }}>
                              <button onClick={()=>copyRow(r._id)} title="복사" style={{ background:'#f1f5f9', border:'none', borderRadius:5, padding:'5px 7px', cursor:'pointer', fontSize:12, color:muted }}>⧉</button>
                              {rows.length>1 && <button onClick={()=>delRow(r._id)} title="삭제" style={{ background:'#fef2f2', border:'none', borderRadius:5, padding:'5px 7px', cursor:'pointer', fontSize:12, color:red }}>✕</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ padding:'12px 20px', borderTop:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              {inputMode==='manual'
                ? <button onClick={addRow} style={{ background:'none', border:`1.5px dashed ${blue}`, color:blue, borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>+ 행 추가</button>
                : <div/>
              }
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {inputMode==='manual' && <span style={{ fontSize:13, color:muted }}>총 {rows.length}건</span>}
                {inputMode==='kakao'  && kakaoRows.length>0 && <span style={{ fontSize:13, color:muted }}>{kakaoRows.length}건 파싱됨</span>}
                <Btn onClick={onClose} outline color={muted} style={{ padding:'9px 16px' }}>취소</Btn>
                {inputMode==='kakao' ? (
                  <Btn onClick={applyKakao} disabled={kakaoRows.length===0} style={{ padding:'9px 20px' }}>
                    가져오기 ({kakaoRows.length}건) →
                  </Btn>
                ) : (
                  <Btn onClick={goStep2} disabled={inputMode==='paste'&&!parsed&&rows.length===1&&!rows[0].address} style={{ padding:'9px 20px' }}>
                    다음: 기사 배치 →
                  </Btn>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══ STEP 2: 기사 배치 ══ */}
        {step===2 && (
          <>
            <div style={{ padding:'12px 20px', borderBottom:`1px solid ${border}`, background:'#f8fafc', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, fontWeight:600, color:muted }}>전체 일괄 배치:</span>
                {drivers.map(d=>(
                  <button key={d.id} onClick={()=>assignAll(d.id)}
                    style={{ padding:'5px 14px', borderRadius:20, border:'none', background:driverMap[d.id]?.bg, color:driverMap[d.id]?.color, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {d.name}
                  </button>
                ))}
                <button onClick={()=>assignAll('')}
                  style={{ padding:'5px 14px', borderRadius:20, border:`1px dashed ${border}`, background:'#fff', color:muted, fontSize:12, cursor:'pointer' }}>전체 해제</button>
              </div>
            </div>

            <div style={{ overflowY:'auto', flex:1, padding:'12px 20px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {rows.map((r,i)=>{
                  const assigned = assigns[r._id]
                  const dm = assigned ? driverMap[assigned] : null
                  return (
                    <div key={r._id} style={{ display:'flex', alignItems:'center', gap:12, background:assigned?dm?.bg+'40':'#f8fafc', border:`1px solid ${assigned?dm?.bg:border}`, borderRadius:10, padding:'10px 14px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:textC, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.address}</div>
                        <div style={{ fontSize:11, color:muted, marginTop:2 }}>
                          <span style={{ fontFamily:'monospace', fontWeight:600, color:navy }}>{r.date} {r.time}</span>
                          <span style={{ marginLeft:10 }}>폐기물 {r.waste}</span>
                          <span style={{ marginLeft:10 }}>{r.cname} {r.cphone}</span>
                          {r.driver_hint && !assigned && <span style={{ marginLeft:10, color:amber }}>힌트: {r.driver_hint}</span>}
                        </div>
                      </div>
                      <select value={assigns[r._id]||''} onChange={e=>setAssign(r._id,e.target.value)}
                        style={{ padding:'7px 10px', borderRadius:8, border:`1.5px solid ${assigned?dm?.bg:border}`, fontSize:13, fontWeight:600, color:assigned?dm?.color:muted, background:assigned?dm?.bg:'#fff', outline:'none', minWidth:110, cursor:'pointer' }}>
                        <option value="">— 미배치 —</option>
                        {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ padding:'12px 16px', borderTop:`1px solid ${border}`, display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <button onClick={()=>setStep(1)} style={{ background:'none', border:`1px solid ${border}`, borderRadius:8, color:blue, fontSize:13, fontWeight:600, cursor:'pointer', padding:'9px 12px', whiteSpace:'nowrap' }}>← 수정</button>
              <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto' }}>
                {assignedCount < rows.length && <span style={{ fontSize:12, color:red, whiteSpace:'nowrap' }}>{rows.length-assignedCount}건 미배치</span>}
                <span style={{ fontSize:12, color:muted, whiteSpace:'nowrap' }}>{assignedCount}/{rows.length}건</span>
                <Btn onClick={submit} style={{ padding:'9px 16px', fontSize:13, whiteSpace:'nowrap' }}>
                  {assignedCount < rows.length ? '미배치 포함 등록' : '등록 완료'}
                </Btn>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 기사 앱
// ══════════════════════════════════════════════════════════════
function DriverApp({ user, schedules, onUpdate, onUpdateDriver, onLogout }) {
  const [view, setView]        = useState('list')
  const [selectedId, setSelId] = useState(null)
  const [filterDate, setFD]    = useState(today)
  const [showPwModal, setPwModal] = useState(false)
  const [pwForm, setPwForm]    = useState({ current:'', next:'', confirm:'' })
  const [pwErr, setPwErr]      = useState('')
  const [pwOk, setPwOk]        = useState(false)
  const [notification, setNotification] = useState(null)
  const notifTimer   = useRef(null)
  const prevMineRef  = useRef(null)

  const mine = schedules
    .filter(s => (s.driver_id === user.id || s.co_driver_id === user.id) && (!filterDate || s.date === filterDate))
    .sort((a,b) => {
      const oA = a.order ?? 9999, oB = b.order ?? 9999
      if (oA !== oB) return oA - oB
      return (a.time||'').localeCompare(b.time||'')
    })

  const selected = schedules.find(s => s.id === selectedId)

  const showNotif = (msg) => {
    setNotification(msg)
    if (notifTimer.current) clearTimeout(notifTimer.current)
    notifTimer.current = setTimeout(() => setNotification(null), 5000)
  }

  // ① 로그인 직후 1회: localStorage 스냅샷 vs 현재 일정 비교
  useEffect(() => {
    const SNAP_KEY = `sched_snap_${user.id}`
    try {
      const savedRaw = localStorage.getItem(SNAP_KEY)
      if (savedRaw) {
        const saved   = JSON.parse(savedRaw)
        const current = schedules.filter(s => s.driver_id === user.id || s.co_driver_id === user.id)
        const newOnes  = current.filter(s => !saved.find(p => p.id === s.id))
        const removed  = saved.filter(p => !current.find(s => s.id === p.id))
        const modified = current.filter(s => {
          const p = saved.find(p => p.id === s.id)
          return p && (p.date !== s.date || p.time !== s.time || p.order !== s.order)
        })
        const parts = []
        if (newOnes.length > 0)  parts.push(`새 일정 ${newOnes.length}건 배정`)
        if (removed.length > 0)  parts.push(`${removed.length}건 취소`)
        if (modified.length > 0) parts.push(`${modified.length}건 수정`)
        if (parts.length > 0) showNotif('📋 ' + parts.join(' · '))
      }
    } catch (e) {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ② 세션 중 실시간 변경 감지
  useEffect(() => {
    const current = schedules.filter(s => s.driver_id === user.id || s.co_driver_id === user.id)
    if (prevMineRef.current === null) { prevMineRef.current = current; return }
    const prev = prevMineRef.current

    const newOnes  = current.filter(s => !prev.find(p => p.id === s.id))
    const removed  = prev.filter(p => !current.find(s => s.id === p.id))
    const modified = current.filter(s => {
      const p = prev.find(p => p.id === s.id)
      if (!p) return false
      return p.date !== s.date || p.time !== s.time || p.driver_id !== s.driver_id || p.order !== s.order
    })

    let msg = null
    if (newOnes.length > 0)       msg = `📋 새 일정 ${newOnes.length}건이 배정되었습니다`
    else if (removed.length > 0)  msg = `🔄 일정 ${removed.length}건이 변경되었습니다`
    else if (modified.length > 0) msg = `✏️ 일정이 수정되었습니다`

    if (msg) showNotif(msg)
    prevMineRef.current = current
  }, [schedules])

  // ③ 스냅샷 저장 (다음 로그인 때 비교용)
  useEffect(() => {
    const snap = schedules
      .filter(s => s.driver_id === user.id || s.co_driver_id === user.id)
      .map(s => ({ id: s.id, date: s.date, time: s.time, order: s.order }))
    localStorage.setItem(`sched_snap_${user.id}`, JSON.stringify(snap))
  }, [schedules])

  useEffect(() => {
    if (view === 'detail') {
      window.history.pushState({ detail: true }, '')
      const handler = () => setView('list')
      window.addEventListener('popstate', handler)
      return () => window.removeEventListener('popstate', handler)
    }
  }, [view])

  const changePw = async () => {
    setPwErr('')
    if (pwForm.current !== user.pw) { setPwErr('현재 비밀번호가 틀렸습니다'); return }
    if (pwForm.next.length < 4)     { setPwErr('새 비밀번호는 4자 이상 입력하세요'); return }
    if (pwForm.next !== pwForm.confirm) { setPwErr('새 비밀번호가 일치하지 않습니다'); return }
    await onUpdateDriver(user.id, { pw: pwForm.next })
    setPwOk(true)
    setPwForm({ current:'', next:'', confirm:'' })
    setTimeout(() => { setPwModal(false); setPwOk(false) }, 1500)
  }

  if (view === 'detail' && selected) {
    return (
      <DriverDetail
        schedule={selected}
        onUpdate={patch => onUpdate(selected.id, patch)}
        onBack={()=>setView('list')}
      />
    )
  }

  const cnt = st => mine.filter(s=>s.status===st).length

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>

      {/* 일정 변경 알림 토스트 */}
      {notification && (
        <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', zIndex:9999, background:navy, color:'#fff', borderRadius:12, padding:'12px 20px', fontSize:14, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,.3)', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:10 }}>
          {notification}
          <button onClick={()=>setNotification(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.6)', fontSize:16, cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
      )}

      <div style={{ background:navy, color:'#fff', padding:'16px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <TruckIcon width={52} height={33}/>
            <div>
              <div style={{ fontSize:20, fontWeight:700 }}>동태관리</div>
              <div style={{ fontSize:15, opacity:.8, marginTop:1, fontWeight:600 }}>{user.name} 기사님</div>
              <div style={{ fontSize:12, opacity:.6, marginTop:1 }}>{user.phone}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setPwModal(true)}
              style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff', borderRadius:7, padding:'6px 12px', fontSize:10, cursor:'pointer' }}>
              🔒 비밀번호
            </button>
            <Btn onClick={onLogout} outline color="#aac" style={{ padding:'6px 12px', fontSize:10 }}>로그아웃</Btn>
          </div>
        </div>
        <input type="date" value={filterDate} onChange={e=>setFD(e.target.value)} className="driver-date"
          style={{ padding:'8px 12px', borderRadius:8, border:'none', background:'rgba(255,255,255,.15)', color:'#fff', WebkitTextFillColor:'#fff', fontSize:20, width:'100%', boxSizing:'border-box', colorScheme:'dark' }}/>
      </div>

      <div style={{ padding:16, maxWidth:480, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
          {[['대기',cnt('대기'),muted],['진행중',cnt('진행중'),amber],['완료',cnt('완료'),green]].map(([l,v,c])=>(
            <Card key={l} style={{ textAlign:'center', padding:'12px 6px' }}>
              <div style={{ fontSize:25, fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:14, color:muted }}>{l}</div>
            </Card>
          ))}
        </div>

        {mine.length===0 && (
          <div style={{ textAlign:'center', padding:52, color:muted }}>
            <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
            <div style={{ fontSize:14 }}>이 날짜에 배정된 일정이 없습니다</div>
          </div>
        )}

        {mine.map(s=>{
          const lc = s.status==='완료' ? green : s.status==='진행중' ? amber : border
          return (
            <div key={s.id}
              onClick={()=>{ setSelId(s.id); setView('detail') }}
              style={{ background:'#fff', borderRadius:12, border:`1px solid ${border}`, borderLeft:`4px solid ${lc}`, padding:'14px 16px', marginBottom:12, cursor:'pointer' }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontFamily:'monospace', fontSize:18, fontWeight:700, color:navy }}>{s.time}</span>
                <Badge status={s.status}/>
              </div>
              <div style={{ fontSize:16, fontWeight:600, marginBottom:4, color:textC }}>{s.address}</div>
              <div style={{ fontSize:14, color:muted }}>
                폐기물 {s.waste} · 담당: {s.cname}
                {s.co_driver_id && (
                  <span style={{ marginLeft:8, fontSize:12, background:'#dbeafe', color:blue, padding:'1px 7px', borderRadius:10, fontWeight:600 }}>
                    2인 · {userName(user.id === s.driver_id ? s.co_driver_id : s.driver_id)}
                  </span>
                )}
              </div>
              {s.start_time && (
                <div style={{ fontSize:13, color:green, marginTop:6, fontFamily:'monospace' }}>
                  ▶ {s.start_time}{s.end_time ? ` → ■ ${s.end_time}` : ' (진행중)'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPwModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:340, padding:24 }}>
            <div style={{ fontSize:16, fontWeight:700, color:navy, marginBottom:4 }}>🔒 비밀번호 변경</div>
            <div style={{ fontSize:12, color:muted, marginBottom:20 }}>{user.name} 기사님</div>

            {pwOk ? (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                <div style={{ fontSize:15, fontWeight:700, color:green }}>변경 완료!</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:12, color:muted, marginBottom:4 }}>현재 비밀번호</div>
                  <input type="password" value={pwForm.current}
                    onChange={e=>setPwForm(p=>({...p,current:e.target.value}))}
                    placeholder="현재 비밀번호 입력"
                    style={iStyle}/>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:12, color:muted, marginBottom:4 }}>새 비밀번호</div>
                  <input type="password" value={pwForm.next}
                    onChange={e=>setPwForm(p=>({...p,next:e.target.value}))}
                    placeholder="새 비밀번호 (4자 이상)"
                    style={iStyle}/>
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, color:muted, marginBottom:4 }}>새 비밀번호 확인</div>
                  <input type="password" value={pwForm.confirm}
                    onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}
                    placeholder="새 비밀번호 다시 입력"
                    onKeyDown={e=>e.key==='Enter'&&changePw()}
                    style={iStyle}/>
                </div>
                {pwErr && (
                  <div style={{ fontSize:12, color:red, marginBottom:12, padding:'8px 12px', background:'#fef2f2', borderRadius:8 }}>
                    ⚠ {pwErr}
                  </div>
                )}
                <div style={{ display:'flex', gap:10 }}>
                  <Btn onClick={()=>{ setPwModal(false); setPwForm({current:'',next:'',confirm:''}); setPwErr('') }}
                    outline color={muted} style={{ flex:1 }}>취소</Btn>
                  <Btn onClick={changePw} style={{ flex:2 }}>변경</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 기사 일정 상세 ──────────────────────────────────────────────
function DriverDetail({ schedule, onUpdate, onBack }) {
  const fileRef     = useRef()
  const workFileRef = useRef()

  const [photos,      setPhotos]      = useState(schedule.photos      || [])
  const [driverNote,  setDriverNote]  = useState(schedule.driver_note || '')
  const [editingDone, setEditingDone] = useState(false)

  const prevStatusRef = useRef(schedule.status)
  if (prevStatusRef.current !== schedule.status) {
    prevStatusRef.current = schedule.status
    setPhotos(schedule.photos || [])
    setDriverNote(schedule.driver_note || '')
    setEditingDone(false)
  }

  const [lightbox,  setLightbox]  = useState(null)
  const [lbSource,  setLbSource]  = useState('schedule_ref')

  const [showDepartModal, setDepartModal] = useState(false)
  const [eta,        setEta]       = useState('')
  const [smsPreview, setSmsPreview] = useState('')

  const [showWorkModal, setWorkModal] = useState(false)
  const [estWaste,    setEstWaste]    = useState('')
  const [estDuration, setEstDuration] = useState('')
  const [sitePhotos,  setSitePhotos]  = useState([])
  const sitePhotoRef = useRef()

  const [showResendModal, setResendModal] = useState(false)

  const [showCancelDepart,  setShowCancelDepart]  = useState(false)
  const [showCancelStart,   setShowCancelStart]   = useState(false)
  const [showCancelEnd,     setShowCancelEnd]      = useState(false)

  const openLb = (src, idx) => { setLbSource(src); setLightbox(idx) }

  const buildSms = (etaVal) =>
    `[배차알림] 안녕하세요, ${schedule.cname}님.\n폐기물 수거 차량이 출발했습니다.\n\n📍 현장: ${schedule.address}\n🕐 도착 예정: ${etaVal}\n\n문의: ${USERS.find(u=>u.id===schedule.driver_id)?.phone||''}`

  const openDepartModal = () => {
    const d = new Date(); d.setMinutes(d.getMinutes() + 30)

    const m = d.getMinutes()
    d.setMinutes(m < 30 ? 30 : 0); if (m >= 30) d.setHours(d.getHours() + 1)
    const etaDef = d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})
    setEta(etaDef)
    setSmsPreview(buildSms(etaDef))
    setDepartModal(true)
  }

  const confirmDepart = () => {
    onUpdate({ status:'이동중', depart_time: nowTime(), eta, sms_sent: true })
    setDepartModal(false)
  }

  const openWorkModal = () => {
    setEstWaste('')
    setEstDuration('')
    setSitePhotos([])
    setWorkModal(true)
  }

  const confirmWork = () => {
    onUpdate({
      status:'진행중',
      start_time: nowTime(),
      est_waste: estWaste,
      est_duration: estDuration,
      ...(sitePhotos.length > 0 ? { work_photos: [...(schedule.work_photos||[]), ...sitePhotos] } : {})
    })
    setWorkModal(false)
  }

  const addSitePhotos = async e => {
    const files = Array.from(e.target.files)
    for (const f of files) {
      const resized = await resizeImage(f)
      setSitePhotos(prev => [...prev, resized])
    }
    e.target.value = ''
  }

  const openResendModal = () => {
    const d = new Date(); d.setMinutes(d.getMinutes() + 30)
    const m = d.getMinutes()
    d.setMinutes(m < 30 ? 30 : 0); if (m >= 30) d.setHours(d.getHours() + 1)
    const etaDef = schedule.eta || d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})
    setEta(etaDef)
    setSmsPreview(buildSms(etaDef))
    setResendModal(true)
  }
  const confirmResend = () => {
    onUpdate({ eta, sms_sent: true })
    setResendModal(false)
  }

  const cancelDepart = () => {
    onUpdate({ status:'대기', depart_time:null, eta:null, sms_sent:false })
    setShowCancelDepart(false)
  }
  const cancelStart = () => {
    onUpdate({ status:'이동중', start_time:null, est_waste:'', est_duration:'' })
    setShowCancelStart(false)
  }
  const cancelEnd = () => {
    onUpdate({ status:'진행중', end_time:null })
    setShowCancelEnd(false)
  }

  const [finalWaste, setFinalWaste]             = useState(schedule.final_waste || '')
  const [showFinalWasteModal, setFinalWasteModal] = useState(false)

  // 이미지 리사이즈 후 base64 반환
  const resizeImage = (file, maxW=1200, quality=0.8) => new Promise(res => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      res(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })

  const addPhotos = async e => {
    const files = Array.from(e.target.files)
    for (const f of files) {
      const resized = await resizeImage(f)
      setPhotos(prev => [...prev, resized])
    }
    e.target.value = ''
  }
  const removePhoto = idx => setPhotos(prev => prev.filter((_,i)=>i!==idx))

  const addWorkPhotos = async e => {
    const files = Array.from(e.target.files)
    const newUrls = []
    for (const f of files) newUrls.push(await resizeImage(f))
    onUpdate({ work_photos: [...(schedule.work_photos||[]), ...newUrls] })
    e.target.value = ''
  }
  const removeWorkPhoto = idx =>
    onUpdate({ work_photos: (schedule.work_photos||[]).filter((_,i)=>i!==idx) })

  const handlePaste = async e => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItems = items.filter(it => it.type.startsWith('image/'))
    if (!imageItems.length) return
    e.preventDefault()
    for (const item of imageItems) {
      const file = item.getAsFile()
      if (file) {
        const resized = await resizeImage(file)
        setPhotos(prev => [...prev, resized])
      }
    }
  }
  const handleDone = () => { onUpdate({ status:'완료', end_time:nowTime(), photos, driver_note:driverNote, final_waste:finalWaste }) }
  const saveEdit   = () => { onUpdate({ photos, driver_note:driverNote, final_waste:finalWaste }); setEditingDone(false) }

  const isReady    = schedule.status === '대기'
  const isMoving   = schedule.status === '이동중'
  const isWorking  = schedule.status === '진행중'
  const isDone     = schedule.status === '완료'

  const displayPhotos = (isDone && !editingDone) ? (schedule.photos||[]) : photos
  const lbPhotos = lbSource==='schedule_ref' ? (schedule.schedule_photos||[]) : lbSource==='work' ? (schedule.work_photos||[]) : displayPhotos

  return (
    <div onPaste={handlePaste} style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:navy, color:'#fff', padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:26, cursor:'pointer', padding:0, lineHeight:1 }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:700 }}>일정 상세</div>
        </div>
        <Badge status={schedule.status}/>
      </div>

      <div style={{ padding:16, maxWidth:520, margin:'0 auto' }}>

        {/* 현장 정보 */}
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>현장 정보</div>
          <Row label="예정 시간"   value={`${schedule.date}  ${schedule.time}`}/>
          <Row label="폐기물량"    value={schedule.waste}/>
          <Row label="현장 담당자" value={schedule.cname}/>
          <Row label="연락처"      value={schedule.cphone}/>
          {schedule.memo && <Row label="메모" value={schedule.memo}/>}
          <div style={{ margin:'14px 0' }}><CopyAddress address={schedule.address}/></div>
          <a href={`tel:${schedule.cphone}`} style={{ textDecoration:'none', display:'block' }}>
            <div style={{ background:green, color:'#fff', borderRadius:10, padding:16, textAlign:'center', fontWeight:700, fontSize:18 }}>
              📞 {schedule.cname}에게 전화
            </div>
          </a>
        </Card>

        {/* 일정 참고 사진 */}
        {(schedule.schedule_photos||[]).length > 0 && (
          <Card style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
              📎 현장 참고 사진 ({schedule.schedule_photos.length}장)
            </div>
            <SlidePhotoViewer
              photos={schedule.schedule_photos}
              onOpen={i => openLb('schedule_ref', i)}
            />
          </Card>
        )}

        {/* 업무 기록 */}
        <Card>
          <div style={{ fontSize:13, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase', marginBottom:16 }}>업무 기록</div>

          <div style={{ display:'flex', alignItems:'center', marginBottom:22, gap:4 }}>
            {[['대기','대기'],['이동중','이동중'],['진행중','진행중'],['완료','완료']].map(([s,l],i)=>{
              const order = ['대기','이동중','진행중','완료']
              const cur = order.indexOf(schedule.status)
              const done = i < cur
              const active = i === cur
              const dotColor = active ? blue : done ? green : border
              const textColor = active ? blue : done ? green : muted
              return (
                <Fragment key={s}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', background: done||active ? dotColor : '#f1f5f9', border:`2px solid ${dotColor}` }}/>
                    <div style={{ fontSize:13, fontWeight: active?700:400, color:textColor, whiteSpace:'nowrap' }}>{l}</div>
                  </div>
                  {i < 3 && <div style={{ flex:2, height:2, background: done ? green : border, marginBottom:20 }}/>}
                </Fragment>
              )
            })}
          </div>

          {/* ── STEP 1: 출발 ── */}
          <div style={{ borderBottom:`1px solid ${border}` }}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0 6px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:textC, minWidth:22 }}>①</span>
                <span style={{ fontSize:15, fontWeight:700, color:textC }}>출발</span>
              </div>
              <div style={{ flexShrink:0 }}>
                {isReady && <Btn onClick={openDepartModal} color={blue} style={{ padding:'8px 16px', fontSize:14 }}>🚚 출발</Btn>}
                {(isMoving||isWorking||isDone) && schedule.depart_time && (
                  <button onClick={()=>setShowCancelDepart(true)}
                    style={{ background:'none', border:`1px solid ${border}`, borderRadius:8, padding:'7px 11px', fontSize:13, color:muted, cursor:'pointer' }}>
                    출발 취소
                  </button>
                )}
              </div>
            </div>

            <div style={{ paddingLeft:28, paddingBottom:10 }}>
              {schedule.depart_time
                ? <div style={{ fontSize:14, color:green, fontFamily:'monospace', marginBottom: (isMoving||isWorking||isDone) ? 8 : 0 }}>🚚 {schedule.depart_time} 출발</div>
                : <div style={{ fontSize:14, color:muted }}>현장으로 출발 시 클릭</div>}
              {(isMoving||isWorking||isDone) && (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, padding:'8px 12px', background:'#f0f9ff', borderRadius:8, border:`1px solid #bae6fd` }}>
                    <span style={{ fontSize:14, color:muted, whiteSpace:'nowrap' }}>🕐 도착 예상</span>
                    <EtaInlineEdit eta={schedule.eta} onSave={v=>onUpdate({ eta:v })}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:schedule.sms_sent?'#f0fdf4':'#f8fafc', borderRadius:8, border:`1px solid ${schedule.sms_sent?'#bbf7d0':border}` }}>
                    <span style={{ fontSize:15 }}>💬</span>
                    {schedule.sms_sent
                      ? <div style={{ flex:1, fontSize:14 }}><span style={{ fontWeight:700, color:green }}>문자 발송됨</span><span style={{ color:muted, marginLeft:8 }}>{schedule.cname}</span></div>
                      : <div style={{ flex:1, fontSize:14, color:muted }}>문자 미발송</div>
                    }
                    <button onClick={openResendModal}
                      style={{ background:schedule.sms_sent?'none':green, color:schedule.sms_sent?muted:'#fff', border:`1px solid ${schedule.sms_sent?border:green}`, borderRadius:7, padding:'7px 12px', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                      {schedule.sms_sent?'재발송':'💬 발송'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── STEP 2: 작업 시작 ── */}
          <div style={{ borderBottom:`1px solid ${border}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0 6px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:textC, minWidth:22 }}>②</span>
                <span style={{ fontSize:15, fontWeight:700, color:textC }}>작업 시작</span>
              </div>
              <div style={{ flexShrink:0 }}>
                {isMoving && <Btn onClick={openWorkModal} color={amber} style={{ padding:'8px 16px', fontSize:14 }}>▶ 작업 시작</Btn>}
                {(isWorking||isDone) && schedule.start_time && (
                  <button onClick={()=>setShowCancelStart(true)}
                    style={{ background:'none', border:`1px solid ${border}`, borderRadius:8, padding:'7px 11px', fontSize:13, color:muted, cursor:'pointer' }}>
                    취소
                  </button>
                )}
              </div>
            </div>
            <div style={{ paddingLeft:28, paddingBottom:10 }}>
              {(isWorking||isDone) && schedule.start_time ? (
                <DriverTimeEdit label="시작" value={schedule.start_time} color={green} onSave={v=>onUpdate({ start_time:v||null })}/>
              ) : (
                <div style={{ fontSize:14, color:isMoving?blue:muted }}>
                  {isMoving ? '현장 도착 후 클릭' : '출발 후 활성화'}
                </div>
              )}
              {schedule.est_waste && (
                <div style={{ fontSize:14, color:muted, marginTop:4 }}>
                  예상물량 <b>{schedule.est_waste}</b>{schedule.est_duration?` · ${schedule.est_duration}`:''}
                </div>
              )}
              {(isWorking||isDone) && (
                <div style={{ marginTop:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:muted }}>
                      📍 현장 사진 ({(schedule.work_photos||[]).length}장)
                    </span>
                    <button onClick={()=>workFileRef.current?.click()}
                      style={{ background:amber, color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                      + 추가
                    </button>
                    <input ref={workFileRef} type="file" accept="image/*" multiple onChange={addWorkPhotos} style={{ display:'none' }}/>
                  </div>
                  {(schedule.work_photos||[]).length > 0 ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                      {schedule.work_photos.map((src,i)=>(
                        <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                          <img src={src} alt={`현장${i+1}`} onClick={()=>openLb('work',i)}
                            style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                          <button onClick={()=>removeWorkPhoto(i)}
                            style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                          <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div onClick={()=>workFileRef.current?.click()}
                      style={{ border:`2px dashed ${border}`, borderRadius:8, padding:12, textAlign:'center', cursor:'pointer', background:'#f8fafc' }}>
                      <div style={{ fontSize:13, color:muted }}>탭하여 현장 사진 추가</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 3: 업무 완료 ── */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0 6px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:textC, minWidth:22 }}>③</span>
                <span style={{ fontSize:15, fontWeight:700, color:textC }}>업무 완료</span>
              </div>
              {isDone && (
                <button onClick={()=>setShowCancelEnd(true)}
                  style={{ background:'none', border:`1px solid ${border}`, borderRadius:8, padding:'7px 11px', fontSize:13, color:muted, cursor:'pointer', flexShrink:0 }}>
                  종료 취소
                </button>
              )}
            </div>

            {/* 대기/이동중 */}
            {(isReady||isMoving) && (
              <div style={{ textAlign:'center', padding:'14px 0', color:muted, fontSize:13 }}>
                {isReady ? '출발 버튼을 먼저 누르세요' : '작업 시작 버튼을 누르세요'}
              </div>
            )}

            {/* 진행중 — 완료 입력 */}
            {isWorking && (
              <>

                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>최종 물량 (선택)</div>
                  <button onClick={()=>setFinalWasteModal(true)}
                    style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1.5px solid ${finalWaste?amber:border}`, background:finalWaste?'#fef3c7':'#f8fafc', color:finalWaste?amber:muted, fontSize:14, fontWeight:finalWaste?700:400, cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span>{finalWaste || '— 선택 안함 —'}</span>
                    <span style={{ fontSize:11, color:muted }}>선택 ›</span>
                  </button>
                  <input
                    value={finalWaste}
                    onChange={e=>setFinalWaste(e.target.value)}
                    placeholder="직접 입력 (예: 1/2차 이상, 소량 등)"
                    style={{ ...iStyle, fontSize:13, borderColor: finalWaste ? amber : undefined }}
                  />
                </div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                    <span>완료 사진 <span style={{ color:photos.length>0?green:muted }}>({photos.length}장)</span></span>
                    <span style={{ fontSize:11 }}>여러 장 가능</span>
                  </div>
                  {photos.length > 0 ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:8 }}>
                      {photos.map((src,i)=>(
                        <div key={i} style={{ position:'relative', aspectRatio:'1' }} onClick={()=>openLb('complete',i)}>
                          <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:`1px solid ${border}`, cursor:'pointer' }}/>
                          <button onClick={e=>{ e.stopPropagation(); removePhoto(i) }}
                            style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                          <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                        </div>
                      ))}
                      <div onClick={()=>fileRef.current?.click()}
                        style={{ aspectRatio:'1', border:`2px dashed ${border}`, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#f8fafc' }}>
                        <div style={{ fontSize:20 }}>+</div><div style={{ fontSize:10, color:muted }}>추가</div>
                      </div>
                    </div>
                  ) : (
                    <div onClick={()=>fileRef.current?.click()}
                      style={{ border:`2px dashed ${border}`, borderRadius:10, padding:18, textAlign:'center', cursor:'pointer', background:'#f8fafc' }}>
                      <div style={{ fontSize:26, marginBottom:4 }}>📷</div>
                      <div style={{ fontSize:13, color:muted }}>사진 첨부하기</div>
                      <div style={{ fontSize:11, color:'#ccc', marginTop:2 }}>탭하여 촬영 또는 갤러리에서 선택</div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display:'none' }}/>
                </div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>특이사항 (선택)</div>
                  <textarea value={driverNote} onChange={e=>setDriverNote(e.target.value)}
                    placeholder={"현장 특이사항을 기록하세요.\n예) 진입로 협소, 담당자 부재 등"}
                    rows={3} style={{ ...iStyle, resize:'vertical', lineHeight:1.7, fontSize:13 }}/>
                </div>
                <Btn onClick={handleDone} color={red} style={{ width:'100%', padding:14, fontSize:16, borderRadius:12 }}>✓ 업무 완료 보고</Btn>
                <div style={{ fontSize:11, color:muted, textAlign:'center', marginTop:6 }}>완료 시 관리자 화면에 즉시 반영됩니다</div>
              </>
            )}

            {/* 완료됨 */}
            {isDone && (
              <div>
                <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                  <div style={{ fontSize:16, fontWeight:700, color:green, marginBottom:8 }}>✅ 업무 완료</div>

                  <DriverTimeEdit label="종료" value={schedule.end_time} color={green} onSave={v=>onUpdate({ end_time:v||null })}/>

                  {schedule.start_time && schedule.end_time && (() => {
                    const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m }
                    const diff = toMin(schedule.end_time) - toMin(schedule.start_time)
                    if (diff <= 0) return null
                    const h = Math.floor(diff/60), m = diff%60
                    const total = h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`
                    return (
                      <div style={{ marginTop:6, fontSize:14, color:blue, fontWeight:600 }}>
                        ⏱ {schedule.start_time} ~ {schedule.end_time}
                        <span style={{ marginLeft:8, background:'#dbeafe', padding:'2px 8px', borderRadius:10, fontSize:13 }}>총 {total}</span>
                      </div>
                    )
                  })()}
                  {schedule.final_waste && (
                    <div style={{ fontSize:15, color:amber, fontWeight:700, marginTop:6 }}>📦 최종 물량: {schedule.final_waste}</div>
                  )}
                </div>
                {!editingDone && (
                  <button onClick={()=>{ setPhotos(schedule.photos||[]); setDriverNote(schedule.driver_note||''); setEditingDone(true) }}
                    style={{ background:'none', border:`1px solid ${blue}`, borderRadius:7, padding:'6px 12px', fontSize:12, color:blue, cursor:'pointer', fontWeight:600, marginBottom:10 }}>
                    ✏️ 사진/특이사항 수정
                  </button>
                )}
                {editingDone ? (
                  <>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                        <span>완료 사진 ({photos.length}장)</span>
                      </div>
                      {photos.length > 0 ? (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:8 }}>
                          {photos.map((src,i)=>(
                            <div key={i} style={{ position:'relative', aspectRatio:'1' }} onClick={()=>openLb('complete',i)}>
                              <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:`1px solid ${border}`, cursor:'pointer' }}/>
                              <button onClick={e=>{ e.stopPropagation(); removePhoto(i) }}
                                style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                            </div>
                          ))}
                          <div onClick={()=>fileRef.current?.click()}
                            style={{ aspectRatio:'1', border:`2px dashed ${border}`, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#f8fafc' }}>
                            <div style={{ fontSize:20 }}>+</div><div style={{ fontSize:10, color:muted }}>추가</div>
                          </div>
                        </div>
                      ) : (
                        <div onClick={()=>fileRef.current?.click()}
                          style={{ border:`2px dashed ${border}`, borderRadius:10, padding:14, textAlign:'center', cursor:'pointer', background:'#f8fafc', marginBottom:8 }}>
                          <div style={{ fontSize:24, marginBottom:4 }}>📷</div>
                          <div style={{ fontSize:13, color:muted }}>사진 추가</div>
                        </div>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display:'none' }}/>
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>최종 물량</div>
                      <button onClick={()=>setFinalWasteModal(true)}
                        style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1.5px solid ${finalWaste?amber:border}`, background:finalWaste?'#fef3c7':'#f8fafc', color:finalWaste?amber:muted, fontSize:14, fontWeight:finalWaste?700:400, cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <span>{finalWaste || '— 선택 안함 —'}</span>
                        <span style={{ fontSize:11, color:muted }}>선택 ›</span>
                      </button>
                      <input
                        value={finalWaste}
                        onChange={e=>setFinalWaste(e.target.value)}
                        placeholder="직접 입력 (예: 1/2차 이상, 소량 등)"
                        style={{ ...iStyle, fontSize:13, borderColor: finalWaste ? amber : undefined }}
                      />
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>특이사항</div>
                      <textarea value={driverNote} onChange={e=>setDriverNote(e.target.value)}
                        placeholder="특이사항 입력" rows={3}
                        style={{ ...iStyle, resize:'vertical', lineHeight:1.7, fontSize:13 }}/>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <Btn onClick={()=>{ setPhotos(schedule.photos||[]); setDriverNote(schedule.driver_note||''); setFinalWaste(schedule.final_waste||''); setEditingDone(false) }} outline color={muted} style={{ flex:1 }}>취소</Btn>
                      <Btn onClick={saveEdit} color={green} style={{ flex:2 }}>저장</Btn>
                    </div>
                  </>
                ) : (
                  <>
                    {schedule.driver_note && (
                      <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:amber, marginBottom:4 }}>📋 특이사항</div>
                        <div style={{ fontSize:13, color:textC, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{schedule.driver_note}</div>
                      </div>
                    )}
                    {/* 완료됨 — 현장/완료 사진 그리드 (추가/삭제) */}
                    {(() => {
                      const workPics = schedule.work_photos || []
                      const donePics = displayPhotos
                      const allPics  = [...workPics, ...donePics]
                      return (
                        <div>
                          {allPics.length > 0 && (
                            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
                              <button onClick={()=>downloadAllPhotos(allPics, '전체사진')}
                                style={{ background:'#f1f5f9', color:muted, border:`1px solid ${border}`, borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                                ⬇ 전체 다운로드
                              </button>
                            </div>
                          )}
                          {/* 현장 사진 */}
                          <div style={{ marginBottom:10 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <span style={{ fontSize:11, fontWeight:600, color:muted }}>📍 현장 사진 ({workPics.length}장)</span>
                              <button onClick={()=>workFileRef.current?.click()}
                                style={{ background:amber, color:'#fff', border:'none', borderRadius:6, padding:'3px 9px', fontSize:11, fontWeight:600, cursor:'pointer' }}>+ 추가</button>
                            </div>
                            {workPics.length > 0 ? (
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                                {workPics.map((src,i)=>(
                                  <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                                    <img src={src} alt="" onClick={()=>openLb('work',i)}
                                      style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                                    <button onClick={()=>removeWorkPhoto(i)}
                                      style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                                    <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div onClick={()=>workFileRef.current?.click()}
                                style={{ border:`2px dashed ${border}`, borderRadius:8, padding:10, textAlign:'center', cursor:'pointer', background:'#f8fafc' }}>
                                <span style={{ fontSize:12, color:muted }}>탭하여 추가</span>
                              </div>
                            )}
                          </div>
                          {/* 완료 사진 */}
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <span style={{ fontSize:11, fontWeight:600, color:muted }}>✅ 완료 사진 ({donePics.length}장)</span>
                              <label style={{ background:green, color:'#fff', borderRadius:6, padding:'3px 9px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                                + 추가
                                <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={async e=>{
                                  const files = Array.from(e.target.files)
                                  const newUrls = []
                                  for (const f of files) newUrls.push(await resizeImage(f))
                                  onUpdate({ photos: [...(schedule.photos||[]), ...newUrls] })
                                  e.target.value = ''
                                }}/>
                              </label>
                            </div>
                            {donePics.length > 0 ? (
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                                {donePics.map((src,i)=>(
                                  <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                                    <img src={src} alt="" onClick={()=>openLb('complete',i)}
                                      style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                                    <button onClick={()=>onUpdate({ photos: (schedule.photos||[]).filter((_,j)=>j!==i) })}
                                      style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                                    <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <label style={{ display:'block', border:`2px dashed ${border}`, borderRadius:8, padding:10, textAlign:'center', cursor:'pointer', background:'#f8fafc' }}>
                                <span style={{ fontSize:12, color:muted }}>탭하여 추가</span>
                                <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={async e=>{
                                  const files = Array.from(e.target.files)
                                  const newUrls = []
                                  for (const f of files) newUrls.push(await resizeImage(f))
                                  onUpdate({ photos: [...(schedule.photos||[]), ...newUrls] })
                                  e.target.value = ''
                                }}/>
                              </label>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {showDepartModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2000, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:480, padding:24, paddingBottom:36 }}>
            <div style={{ width:36, height:4, background:border, borderRadius:2, margin:'0 auto 18px' }}/>
            <div style={{ fontSize:19, fontWeight:700, color:navy, marginBottom:6 }}>🚚 출발 보고</div>
            <div style={{ fontSize:15, color:muted, marginBottom:18 }}>{schedule.address}</div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8 }}>도착 예상 시간</div>
              <EtaModalInput eta={eta} onChange={v=>{ setEta(v); setSmsPreview(buildSms(v)) }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                💬 현장 담당자 발송 문자
                <span style={{ background:'#dcfce7', color:green, fontSize:12, padding:'2px 8px', borderRadius:4, fontWeight:700 }}>자동 발송</span>
              </div>
              <div style={{ background:'#f0fdf4', border:`1px solid #bbf7d0`, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:13, color:'#166534', lineHeight:1.85, whiteSpace:'pre-wrap', fontFamily:'monospace' }}>{smsPreview}</div>
              </div>
              <div style={{ fontSize:13, color:muted, marginTop:6 }}>📱 {schedule.cname} ({schedule.cphone})</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>setDepartModal(false)} outline color={muted} style={{ flex:1, fontSize:15 }}>취소</Btn>
              <Btn onClick={confirmDepart} color={blue} style={{ flex:2, fontSize:16 }}>출발 · 문자 발송</Btn>
            </div>
          </div>
        </div>
      )}

      {showWorkModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2000, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:480, padding:24, paddingBottom:36, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ width:36, height:4, background:border, borderRadius:2, margin:'0 auto 18px' }}/>
            <div style={{ fontSize:19, fontWeight:700, color:navy, marginBottom:6 }}>▶ 작업 시작</div>
            <div style={{ fontSize:15, color:muted, marginBottom:20 }}>{schedule.address}</div>

            {/* 예상 물량 선택 */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:10 }}>예상 물량 (선택)</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {['소량','소량 이상', null].map((v, i) => v === null ? (
                    <div key={i}/>
                  ) : (
                    <button key={v} onClick={()=>setEstWaste(estWaste===v ? '' : v)}
                      style={{ padding:'11px 0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:`1.5px solid ${estWaste===v?amber:border}`, background:estWaste===v?'#fef3c7':'#f8fafc', color:estWaste===v?amber:muted }}>
                      {v}
                    </button>
                  ))}
                </div>
                {['1/6차','1/3차','1/2차','2/3차','1차'].map(qty => (
                  <div key={qty} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    {[qty, `${qty} 이하`, `${qty} 이상`].map((v, i) => {
                      const active = estWaste === v
                      return (
                        <button key={v} onClick={()=>setEstWaste(active ? '' : v)}
                          style={{ padding:'11px 0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:`1.5px solid ${active?amber:border}`, background:active?'#fef3c7':'#f8fafc', color:active?amber:muted }}>
                          {i===0 ? qty : i===1 ? '이하' : '이상'}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
              {estWaste && (
                <div style={{ marginTop:10, fontSize:14, color:amber, fontWeight:600, textAlign:'center', background:'#fffbeb', padding:'9px', borderRadius:8 }}>
                  선택됨: {estWaste}
                </div>
              )}
            </div>

            {/* 예상 작업 시간 */}
            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8 }}>예상 작업 시간 (선택)</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:8 }}>
                {['30분','1시간','1시간 30분','2시간','2시간 30분','3시간','3시간 30분','4시간'].map(t=>(
                  <button key={t} onClick={()=>setEstDuration(estDuration===t ? '' : t)}
                    style={{ padding:'11px 0', borderRadius:8, border:`1.5px solid ${estDuration===t?blue:border}`, background:estDuration===t?'#dbeafe':'#f8fafc', color:estDuration===t?blue:muted, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
              <input value={estDuration} onChange={e=>setEstDuration(e.target.value)}
                placeholder="직접 입력 (예: 4시간 30분)" style={{ ...iStyle, fontSize:15 }}/>
            </div>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8 }}>현장 사진 (선택)</div>
              {sitePhotos.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:8 }}>
                  {sitePhotos.map((src,i)=>(
                    <div key={i} style={{ position:'relative', aspectRatio:'1' }}>
                      <img src={src} alt={`현장${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:`1px solid ${border}` }}/>
                      <button onClick={()=>setSitePhotos(prev=>prev.filter((_,j)=>j!==i))}
                        style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                    </div>
                  ))}
                  <div onClick={()=>sitePhotoRef.current?.click()}
                    style={{ aspectRatio:'1', border:`2px dashed ${border}`, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#f8fafc' }}>
                    <div style={{ fontSize:20 }}>+</div>
                    <div style={{ fontSize:10, color:muted }}>추가</div>
                  </div>
                </div>
              ) : (
                <div onClick={()=>sitePhotoRef.current?.click()}
                  style={{ border:`2px dashed #93c5fd`, borderRadius:10, padding:16, textAlign:'center', cursor:'pointer', background:'#f0f9ff' }}>
                  <div style={{ fontSize:24, marginBottom:4 }}>📷</div>
                  <div style={{ fontSize:13, color:'#1d4ed8', fontWeight:600 }}>현장 사진 촬영 / 추가</div>
                  <div style={{ fontSize:11, color:muted, marginTop:2 }}>탭하여 촬영 또는 갤러리에서 선택</div>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>setWorkModal(false)} outline color={muted} style={{ flex:1, fontSize:15 }}>취소</Btn>
              <Btn onClick={confirmWork} color={amber} style={{ flex:2, fontSize:16 }}>작업 시작</Btn>
            </div>
            <input ref={sitePhotoRef} type="file" accept="image/*" multiple onChange={addSitePhotos} style={{ display:'none' }}/>
          </div>
        </div>
      )}

      {showFinalWasteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2100, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:480, padding:24, paddingBottom:36, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ width:36, height:4, background:border, borderRadius:2, margin:'0 auto 18px' }}/>
            <div style={{ fontSize:19, fontWeight:700, color:navy, marginBottom:6 }}>📦 최종 물량 선택</div>
            <div style={{ fontSize:15, color:muted, marginBottom:18 }}>{schedule.address}</div>

            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {['소량','소량 이상', null].map((v, i) => v === null ? (
                  <div key={i}/>
                ) : (
                  <button key={v} onClick={()=>setFinalWaste(finalWaste===v?'':v)}
                    style={{ padding:'12px 0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:`1.5px solid ${finalWaste===v?amber:border}`, background:finalWaste===v?'#fef3c7':'#f8fafc', color:finalWaste===v?amber:muted, transition:'all .1s' }}>
                    {v}
                  </button>
                ))}
              </div>
              {['1/6차','1/3차','1/2차','2/3차','1차'].map(qty => (
                <div key={qty} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {[qty, `${qty} 이하`, `${qty} 이상`].map((v, i) => {
                    const active = finalWaste === v
                    return (
                      <button key={v} onClick={()=>setFinalWaste(active?'':v)}
                        style={{ padding:'12px 0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:`1.5px solid ${active?amber:border}`, background:active?'#fef3c7':'#f8fafc', color:active?amber:muted, transition:'all .1s' }}>
                        {i===0 ? qty : i===1 ? '이하' : '이상'}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            <div style={{ background: finalWaste?'#fffbeb':'#f8fafc', border:`1px solid ${finalWaste?'#fde68a':border}`, borderRadius:8, padding:'12px 14px', marginBottom:16, fontSize:15, fontWeight:700, color:finalWaste?amber:muted, textAlign:'center', minHeight:46 }}>
              {finalWaste ? `선택됨: ${finalWaste}` : '선택 안함'}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{ setFinalWaste(''); setFinalWasteModal(false) }}
                style={{ flex:1, padding:'13px 0', borderRadius:8, border:`1px solid ${border}`, background:'#f8fafc', color:muted, fontSize:15, fontWeight:600, cursor:'pointer' }}>
                초기화
              </button>
              <Btn onClick={()=>setFinalWasteModal(false)} color={amber} style={{ flex:2, fontSize:16 }}>확인</Btn>
            </div>
          </div>
        </div>
      )}

      {showResendModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2000, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:480, padding:24, paddingBottom:36 }}>
            <div style={{ width:36, height:4, background:border, borderRadius:2, margin:'0 auto 18px' }}/>
            <div style={{ fontSize:19, fontWeight:700, color:navy, marginBottom:6 }}>💬 {schedule.sms_sent?'문자 재발송':'문자 발송'}</div>
            <div style={{ fontSize:15, color:muted, marginBottom:18 }}>{schedule.address}</div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8 }}>도착 예상 시간</div>
              <EtaModalInput eta={eta} onChange={v=>{ setEta(v); setSmsPreview(buildSms(v)) }}/>
            </div>
            <div style={{ background:'#f0fdf4', border:`1px solid #bbf7d0`, borderRadius:10, padding:'12px 14px', marginBottom:20 }}>
              <div style={{ fontSize:13, color:'#166534', lineHeight:1.85, whiteSpace:'pre-wrap', fontFamily:'monospace' }}>{smsPreview}</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>setResendModal(false)} outline color={muted} style={{ flex:1, fontSize:15 }}>취소</Btn>
              <Btn onClick={confirmResend} color={green} style={{ flex:2, fontSize:16 }}>발송</Btn>
            </div>
          </div>
        </div>
      )}

      {[
        [showCancelDepart, setShowCancelDepart, cancelDepart, '출발을 취소할까요?',   '출발 시간이 삭제되고 대기 상태로 돌아갑니다.',     '출발 취소', red],
        [showCancelStart,  setShowCancelStart,  cancelStart,  '작업 시작을 취소할까요?', '시작 시간이 삭제되고 이동중 상태로 돌아갑니다.', '시작 취소', red],
        [showCancelEnd,    setShowCancelEnd,    cancelEnd,    '업무 종료를 취소할까요?', '종료 시간이 삭제되고 진행중으로 돌아갑니다.',   '종료 취소', amber],
      ].map(([show, setShow, action, title, desc, label, color]) => show ? (
        <div key={title} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:320, padding:28 }}>
            <div style={{ fontSize:17, fontWeight:700, color:textC, marginBottom:10 }}>{title}</div>
            <div style={{ fontSize:15, color:muted, lineHeight:1.7, marginBottom:22 }}>{desc}</div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={()=>setShow(false)} outline color={muted} style={{ flex:1, fontSize:15 }}>아니요</Btn>
              <Btn onClick={action} color={color} style={{ flex:2, fontSize:15 }}>{label}</Btn>
            </div>
          </div>
        </div>
      ) : null)}

      {lightbox !== null && <Lightbox photos={lbPhotos} index={lightbox} onClose={()=>setLightbox(null)}/>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 앱 루트
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null)
  const [showLogoutConfirm, setLogoutConfirm] = useState(false)
  const {
    users, schedules, loading, error,
    addSchedules, updateSchedule, deleteSchedules,
    addDriver, updateDriver, deleteDriver,
  } = useAppData()

  // 헬퍼 함수들이 최신 users를 참조하도록 동기화
  USERS = users

  // 안드로이드 뒤로가기 → 메인(목록) 화면에서만 로그아웃 팝업
  useEffect(() => {
    if (!user) return
    window.history.pushState({ root: true }, '')
    const handler = (e) => {
      // e.state가 {root:true}면 상세→목록 복귀이므로 DriverApp/AdminApp이 처리
      if (e.state && e.state.root) return
      e.preventDefault()
      setLogoutConfirm(true)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [user])

  const doLogout = () => {
    localStorage.setItem('auto_login', '0')
    setUser(null)
    setLogoutConfirm(false)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:16 }}><TruckIcon width={80} height={50}/></div>
        <div style={{ fontSize:16, fontWeight:600, color:'#1b3a5c', marginBottom:8 }}>데이터 불러오는 중...</div>
        <div style={{ fontSize:13, color:'#64748b' }}>Firebase에 연결 중입니다</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fef2f2', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ textAlign:'center', padding:24 }}>
        <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:15, fontWeight:600, color:'#dc2626', marginBottom:8 }}>연결 오류</div>
        <div style={{ fontSize:13, color:'#64748b' }}>{error}</div>
      </div>
    </div>
  )

  if (!user) return <LoginPage onLogin={u=>setUser(u)} users={users}/>

  const logoutHandler = () => {
    localStorage.setItem('auto_login', '0')
    setUser(null)
  }

  return (
    <>

      <style>{`
        input, select, textarea {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          color-scheme: light !important;
        }
        input::placeholder { color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0); }
        input.driver-date { color: #fff !important; -webkit-text-fill-color: #fff !important; color-scheme: dark !important; }
        input.driver-date::-webkit-calendar-picker-indicator { filter: invert(1); }
      `}</style>
      {user.role==='admin'
        ? <AdminApp
            user={user} users={users} schedules={schedules}
            onAddMany={addSchedules}
            onUpdate={(id, patch) => updateSchedule(id, patch)}
            onDelete={deleteSchedules}
            onAddDriver={addDriver}
            onUpdateDriver={updateDriver}
            onDeleteDriver={deleteDriver}
            onLogout={logoutHandler}
          />
        : <DriverApp
            user={user} schedules={schedules}
            onUpdate={(id, patch) => updateSchedule(id, patch)}
            onUpdateDriver={updateDriver}
            onLogout={logoutHandler}
          />
      }

      {/* 안드로이드 뒤로가기 로그아웃 팝업 */}
      {showLogoutConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:24, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:300, padding:28, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>👋</div>
            <div style={{ fontSize:16, fontWeight:700, color:textC, marginBottom:8 }}>로그아웃 할까요?</div>
            <div style={{ fontSize:13, color:muted, marginBottom:24 }}>{user.name}님으로 로그인 중입니다</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{ setLogoutConfirm(false); window.history.pushState({ root:true }, '') }}
                style={{ flex:1, padding:'11px 0', borderRadius:8, border:`1px solid ${border}`, background:'#f8fafc', color:muted, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                취소
              </button>
              <button onClick={doLogout}
                style={{ flex:2, padding:'11px 0', borderRadius:8, border:'none', background:navy, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
