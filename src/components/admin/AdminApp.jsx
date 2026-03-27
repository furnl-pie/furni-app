import { useState, useRef, useEffect, Fragment } from 'react'
import AdminDetail from './AdminDetail'
import BillingPage from './BillingPage'
import DisposalPage from './DisposalPage'
import BulkScheduleModal from './BulkScheduleModal'
import DriverMgrModal from './DriverMgrModal'
import AdminSettingsModal from './AdminSettingsModal'
import AdminHelpModal from './AdminHelpModal'
import PhotoDownloadPage from './PhotoDownloadPage'
import TruckIcon from '../common/TruckIcon'
import { Badge, Btn, Card } from '../common/ui'
import { navy, blue, green, amber, red, border, muted, textC, iStyle, driverChip, today, getDriverSortKey } from '../../constants/styles'
import { userName } from '../../utils/users'
import useWindowWidth from '../../utils/useWindowWidth'

export default function AdminApp({ user, users, schedules, onAddMany, onUpdate, onDelete, onAddDriver, onUpdateDriver, onDeleteDriver, onLogout }) {
  const isPC = useWindowWidth() >= 1024
  const [view, setView]           = useState('list')
  const [selectedId, setSelId]    = useState(null)
  const [showModal, setModal]     = useState(false)
  const [showDriverMgr, setDriverMgr] = useState(false)
  const [showAdminSettings, setAdminSettings] = useState(false)
  const [showHelp, setHelp] = useState(false)
  const [listView, setListView]   = useState(() => window.innerWidth < 768 ? 'card' : 'table')

  const dragId = useRef(null)

  // 청구/처리 탭 진입 시 history 엔트리 추가 → 브라우저 뒤로가기로 메인 복귀
  useEffect(() => {
    if (view !== 'billing' && view !== 'disposal' && view !== 'photos') return
    window.history.pushState({ subview: true }, '')
    const handler = () => setView('list')
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [view])
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
      const toOrder = toS.order ?? sorted.indexOf(toS)
      onUpdate(from, { driver_id: toS.driver_id, order: toOrder - 0.5 })
    } else {
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

  const [copyModal, setCopyModal] = useState(null)
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
      onUpdate(copyModal.id, newData)
    } else {
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

  const [filterDriver, setFD]     = useState(new Set())
  const [filterStatus, setFStatus] = useState('') // '' | '대기' | '이동중' | '진행중' | '완료'
  const [filterDate, setFDate]    = useState(today)
  const [editingId, setEditingId] = useState(null)

  const [deleteMode,     setDeleteMode]   = useState(false)
  const [checkedIds,     setCheckedIds]   = useState(new Set())
  const [showDelConfirm, setDelConfirm]   = useState(false)
  const [confirmSingleDel, setConfirmSingleDel] = useState(null) // 개별 삭제 일정 id

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
      const unassignedSelected = filterDriver.has('unassigned')
      if (!s.driver_id && !unassignedSelected) return false
      if (s.driver_id && !filterDriver.has(s.driver_id) && !filterDriver.has('all')) return false
    }
    if (filterDate && s.date !== filterDate) return false
    if (filterStatus && s.status !== filterStatus) return false
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

  if (view==='billing')
    return <BillingPage schedules={schedules} onUpdate={onUpdate} onBack={()=>setView('list')}/>

  if (view==='disposal')
    return <DisposalPage onBack={()=>setView('list')}/>

  if (view==='photos')
    return <PhotoDownloadPage schedules={schedules} users={users} onBack={()=>setView('list')}/>

  if (view==='detail' && selected)
    return <AdminDetail schedule={selected} onUpdate={p=>onUpdate(selected.id,p)} onBack={()=>setView('list')} drivers={drivers}/>

  let lastDriverId = '__init__'

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:navy, color:'#fff', padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <TruckIcon width={44} height={44}/>
            <div>
              <div style={{ fontSize:18, fontWeight:700, lineHeight:1.2 }}>동태관리</div>
              <div style={{ fontSize:11, opacity:.65 }}>관리자</div>
            </div>
          </div>
          <div style={{ display:'flex', flexWrap: isPC ? 'nowrap' : 'wrap', gap:6, justifyContent:'flex-end', maxWidth: isPC ? 'none' : 220 }}>
            <button onClick={()=>setView('photos')}
              style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', borderRadius:8, padding:'7px 11px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              📥 사진
            </button>
            <button onClick={()=>setView('disposal')}
              style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', borderRadius:8, padding:'7px 11px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              🚛 처리
            </button>
            <button onClick={()=>setView('billing')}
              style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', borderRadius:8, padding:'7px 11px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              💰 청구
            </button>
            <button onClick={()=>setDriverMgr(true)}
              style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', borderRadius:8, padding:'7px 11px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              👤 기사
            </button>
            <button onClick={()=>setHelp(true)}
              style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', borderRadius:8, padding:'7px 11px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              ?
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
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[['전체',stats.total,navy],['미배치',stats.unassigned,red],['진행중',stats.ing,amber],['완료',stats.done,green]].map(([l,v,c])=>(
            <Card key={l} style={{ textAlign:'center', padding:'14px 8px' }}>
              <div style={{ fontSize:28, fontWeight:700, color:c }}>{v}</div>
              <div style={{ fontSize:12, color:muted, marginTop:2 }}>{l}</div>
            </Card>
          ))}
        </div>

        {stats.unassigned>0 && (
          <div style={{ background:'#fef2f2', border:`1px solid #fecaca`, borderRadius:10, padding:'10px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
            <span>⚠️</span>
            <span style={{ fontSize:13, fontWeight:600, color:red }}>기사 미배치 {stats.unassigned}건</span>
            <span style={{ fontSize:12, color:'#b91c1c' }}>— ✏️ 버튼으로 바로 배치하세요</span>
          </div>
        )}

        <Card style={{ marginBottom:14 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:10 }}>
            <input type="date" value={filterDate} onChange={e=>setFDate(e.target.value)}
              style={{ ...iStyle, width:'auto', height:38 }}/>

            <div style={{ width:1, height:32, background:border }}/>

            {!assignMode && !deleteMode && (
              <button onClick={()=>setModal(true)}
                style={{ height:38, padding:'0 14px', background:navy, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                + 일정 등록
              </button>
            )}

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

          {/* 기사 필터 */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:700, color:muted, marginRight:2, whiteSpace:'nowrap' }}>기사</span>
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
                  style={{ height:32, padding:'0 12px', borderRadius:7, border:`1.5px solid ${on?chip?.border:border}`, background:on?chip?.bg:'#fff', color:on?chip?.color:muted, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5 }}>
                  {d.online && <span style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', display:'inline-block', flexShrink:0 }}/>}
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
                    <div style={{
                      display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
                      background: chip ? chip.bg : '#fef2f2',
                      borderRadius:10, marginBottom:8,
                      border:`1px solid ${chip ? chip.border : '#fecaca'}`
                    }}>
                      <span style={{ fontSize:17, fontWeight:700, color: chip ? chip.color : red }}>
                        {g.driverId ? `▸ ${userName(g.driverId)}` : '▸ 미배치'}
                      </span>
                      <span style={{ fontSize:16, color: chip ? chip.color : red, opacity:.65 }}>
                        {g.items.length}건
                      </span>
                    </div>
                    <div style={{ display: isPC ? 'grid' : 'flex', flexDirection: isPC ? undefined : 'column', gridTemplateColumns: isPC ? '1fr 1fr' : undefined, gap:8 }}>
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
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <Badge status={s.status}/>
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
                                <button onClick={e=>{ e.stopPropagation(); setConfirmSingleDel(s.id) }}
                                  style={{ background:'#fef2f2', color:red, border:`1px solid #fecaca`, borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                                  🗑
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize:15, fontWeight:600, color:textC, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.address}</div>
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

        {/* 테이블 뷰 */}
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
                    <th style={{ padding:'6px 8px', background:'#f8fafc', whiteSpace:'nowrap' }}>기사</th>
                    <th style={{ padding:'6px 8px', background:'#f8fafc', whiteSpace:'nowrap' }}>
                      <select
                        value={filterStatus}
                        onChange={e => setFStatus(e.target.value)}
                        style={{ padding:'4px 6px', borderRadius:7, border:`1.5px solid ${filterStatus ? amber : border}`, fontSize:15, fontWeight:600, color: filterStatus ? amber : muted, background: filterStatus ? '#fffbeb' : '#f8fafc', outline:'none', cursor:'pointer', fontFamily:"inherit" }}>
                        <option value="">상태</option>
                        <option value="대기">대기</option>
                        <option value="이동중">이동중</option>
                        <option value="진행중">진행중</option>
                        <option value="완료">완료</option>
                      </select>
                    </th>
                    {['현장담당자','날짜·시간','주소','폐기물량','시작','완료',''].map(h=>(
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
                    const isEdit = editingId===s.id
                    const isAssignChecked = assignChecked.has(s.id)
                    const isDeleteChecked = checkedIds.has(s.id)

                    return (
                      <Fragment key={s.id}>
                        {showDiv && (
                          <tr>
                            <td colSpan={(deleteMode||assignMode) ? 10 : 9} style={{
                              padding:'5px 14px', fontSize:15, fontWeight:700, letterSpacing:.4,
                              background: chip ? chip.bg : '#fef2f2',
                              color: chip ? chip.color : red,
                              borderTop:`2px solid ${chip ? chip.border : '#fecaca'}`,
                              borderBottom:`1px solid ${border}`
                            }}>
                              {s.driver_id ? `▸ ${userName(s.driver_id)}` : '▸ 미배치'}
                              <span style={{ marginLeft:10, fontWeight:400, opacity:.65, fontSize:15 }}>
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
                                style={{ fontSize:14, padding:'4px 6px', border:`1.5px solid ${blue}`, borderRadius:6, outline:'none', minWidth:90, cursor:'pointer' }}>
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
                            {s.schedule_photos?.length > 0 && (
                              <span title={`참고사진 ${s.schedule_photos.length}장`} style={{ marginLeft:5, fontSize:11, background:'#fdf4ff', color:'#9333ea', padding:'1px 5px', borderRadius:8, fontWeight:700, verticalAlign:'middle', border:'1px solid #e9d5ff' }}>🖼️{s.schedule_photos.length}</span>
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
                            <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                              <button onClick={()=>openCopyModal(s)}
                                style={{ background:'#f0f9ff', color:blue, border:`1px solid #bae6fd`, borderRadius:6, padding:'4px 8px', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                                이동/복사
                              </button>
                              <button onClick={()=>setConfirmSingleDel(s.id)}
                                style={{ background:'#fef2f2', color:red, border:`1px solid #fecaca`, borderRadius:6, padding:'4px 8px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                                🗑
                              </button>
                            </div>
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

      {confirmSingleDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, maxWidth:320, width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🗑️</div>
            <div style={{ fontWeight:700, fontSize:15, color:navy, marginBottom:8 }}>일정 삭제</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>
              {schedules.find(s=>s.id===confirmSingleDel)?.address}<br/>삭제하면 복구할 수 없습니다.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={()=>setConfirmSingleDel(null)} outline style={{ flex:1, padding:'10px 0' }}>취소</Btn>
              <Btn onClick={()=>{ onDelete([confirmSingleDel]); setConfirmSingleDel(null) }}
                style={{ flex:1, padding:'10px 0', background:red, borderColor:red }}>삭제</Btn>
            </div>
          </div>
        </div>
      )}
      {showHelp && <AdminHelpModal onClose={()=>setHelp(false)}/>}
      {showModal && <BulkScheduleModal drivers={drivers} schedules={schedules} onAddMany={list=>{ onAddMany(list); setModal(false) }} onUpdate={onUpdate} onClose={()=>setModal(false)}/>}
      {showDriverMgr && <DriverMgrModal drivers={drivers} schedules={schedules} onAdd={onAddDriver} onUpdate={onUpdateDriver} onDelete={onDeleteDriver} onClose={()=>setDriverMgr(false)}/>}
      {showAdminSettings && <AdminSettingsModal user={user} onUpdateDriver={onUpdateDriver} onClose={()=>setAdminSettings(false)}/>}

      {copyModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:400, padding:24 }}>
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
