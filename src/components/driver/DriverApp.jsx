import { useState, useRef, useEffect } from 'react'
import DriverDetail from './DriverDetail'
import DisposalTab from './DisposalTab'
import TruckIcon from '../common/TruckIcon'
import { Badge, Btn, Card } from '../common/ui'
import { navy, blue, green, amber, border, muted, textC, iStyle, today } from '../../constants/styles'
import { userName } from '../../utils/users'

export default function DriverApp({ user, schedules, onUpdate, onUpdateDriver, onLogout }) {
  const [view, setView]        = useState('list')
  const [tab, setTab]          = useState('schedule') // 'schedule' | 'disposal'
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

      {notification && (
        <div style={{ position:'fixed', top:220, left:'50%', transform:'translateX(-50%)', zIndex:9999, background:navy, color:'#fff', borderRadius:16, padding:'20px 36px', fontSize:18, fontWeight:600, boxShadow:'0 4px 24px rgba(0,0,0,.35)', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:14 }}>
          {notification}
          <button onClick={()=>setNotification(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.6)', fontSize:16, cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
      )}

      <div style={{ background:navy, color:'#fff', padding:'16px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <TruckIcon width={52} height={52}/>
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
        {tab === 'schedule' && (
          <input type="date" value={filterDate} onChange={e=>setFD(e.target.value)} className="driver-date"
            style={{ padding:'8px 12px', borderRadius:8, border:'none', background:'rgba(255,255,255,.15)', color:'#fff', WebkitTextFillColor:'#fff', fontSize:20, width:'100%', boxSizing:'border-box', colorScheme:'dark' }}/>
        )}
      </div>

      {/* 탭 바 */}
      <div style={{ display:'flex', background:'#fff', borderBottom:`1px solid ${border}` }}>
        {[['schedule','📋 일정'],['disposal','🚛 처리']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ flex:1, padding:'12px 0', fontSize:14, fontWeight:600, border:'none', borderBottom:`2.5px solid ${tab===t?blue:'transparent'}`, color:tab===t?blue:muted, background:'none', cursor:'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'disposal' && <DisposalTab user={user}/>}

      {tab === 'schedule' && (
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
      )}

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
                  <div style={{ fontSize:12, color:'#dc2626', marginBottom:12, padding:'8px 12px', background:'#fef2f2', borderRadius:8 }}>
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
