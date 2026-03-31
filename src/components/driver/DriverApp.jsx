import { useState, useRef, useEffect } from 'react'
import DriverDetail from './DriverDetail'
import DisposalTab from './DisposalTab'
import HelpModal from './HelpModal'
import TruckIcon from '../common/TruckIcon'
import { Badge, Btn, Card } from '../common/ui'
import { navy, blue, green, amber, border, muted, textC, iStyle, today } from '../../constants/styles'
import { userName } from '../../utils/users'

export default function DriverApp({ user, schedules, onUpdate, onUpdateDriver, onLogout }) {
  const [view, setView]        = useState('list')
  const [tab, setTab]          = useState('schedule') // 'schedule' | 'disposal'
  const [showHelp, setHelp]    = useState(false)
  const [selectedId, setSelId] = useState(null)
  const scrollYRef = useRef(0)
  const [filterDate, setFD]    = useState(today)
  const [showSettings, setSettings] = useState(false)
  const [carNum, setCarNum]    = useState((user.car_number || '').slice(-4))
  const [carOk, setCarOk]      = useState(false)
  const [pwForm, setPwForm]    = useState({ current:'', next:'', confirm:'' })
  const [pwErr, setPwErr]      = useState('')
  const [pwOk, setPwOk]        = useState(false)
  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
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
      const handler = () => {
        setView('list')
        setTimeout(() => window.scrollTo(0, scrollYRef.current), 0)
      }
      window.addEventListener('popstate', handler)
      return () => window.removeEventListener('popstate', handler)
    }
  }, [view])

  const saveCar = async () => {
    await onUpdateDriver(user.id, { car_number: carNum })
    setCarOk(true)
    setTimeout(() => setCarOk(false), 2000)
  }

  const changePw = async () => {
    setPwErr('')
    if (pwForm.current !== user.pw) { setPwErr('현재 비밀번호가 틀렸습니다'); return }
    if (pwForm.next.length < 4)     { setPwErr('새 비밀번호는 4자 이상 입력하세요'); return }
    if (pwForm.next !== pwForm.confirm) { setPwErr('새 비밀번호가 일치하지 않습니다'); return }
    await onUpdateDriver(user.id, { pw: pwForm.next })
    setPwOk(true)
    setPwForm({ current:'', next:'', confirm:'' })
    setTimeout(() => setPwOk(false), 2000)
  }

  const requestNotif = async () => {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
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

  const notifLabel = notifPerm === 'granted' ? '알림 허용됨' : notifPerm === 'denied' ? '알림 차단됨 (설정에서 변경)' : '알림 허용 안 됨'
  const notifColor = notifPerm === 'granted' ? green : '#dc2626'

  return (
    <div style={{ minHeight:'100vh', background:'#f8f9fc', fontFamily:"'Noto Sans KR', sans-serif" }}>

      {notification && (
        <div style={{ position:'fixed', top:220, left:'50%', transform:'translateX(-50%)', zIndex:9999, background:navy, color:'#fff', borderRadius:16, padding:'20px 36px', fontSize:18, fontWeight:600, boxShadow:'0 4px 24px rgba(0,0,0,.35)', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:14 }}>
          {notification}
          <button onClick={()=>setNotification(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.6)', fontSize:16, cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
      )}

      <div style={{ background:'#fff', borderBottom:'1px solid #eaecf0', padding:'12px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: tab==='schedule' ? 12 : 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <TruckIcon width={40} height={40}/>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#111827', letterSpacing:'-.3px' }}>동태관리</div>
              <div style={{ fontSize:13, color:'#374151', marginTop:1, fontWeight:600 }}>{user.name} 기사님</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:1 }}>{user.phone}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setHelp(true)}
              style={{ height:30, padding:'0 10px', border:'1px solid #eaecf0', background:'transparent', color:'#6b7280', borderRadius:7, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              ?
            </button>
            <button onClick={()=>setSettings(true)}
              style={{ height:30, padding:'0 10px', border:'1px solid #eaecf0', background:'transparent', color:'#6b7280', borderRadius:7, fontSize:11, cursor:'pointer' }}>
              ⚙ 설정
            </button>
            <button onClick={onLogout}
              style={{ height:30, padding:'0 10px', border:'1px solid #eaecf0', background:'transparent', color:'#9ca3af', borderRadius:7, fontSize:11, cursor:'pointer' }}>
              로그아웃
            </button>
          </div>
        </div>
        {tab === 'schedule' && (
          <input type="date" value={filterDate} onChange={e=>setFD(e.target.value)} className="driver-date"
            style={{ padding:'9px 12px', borderRadius:9, border:'1.5px solid #eaecf0', background:'#f9fafb', color:'#111827', fontSize:15, fontWeight:600, width:'100%', boxSizing:'border-box', outline:'none' }}/>
        )}
      </div>

      {/* 탭 바 */}
      <div style={{ display:'flex', background:'#fff', borderBottom:'1px solid #eaecf0' }}>
        {[['schedule','📋 일정'],['disposal','🚛 처리']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ flex:1, padding:'12px 0', fontSize:13, fontWeight:600, border:'none', borderBottom:`2.5px solid ${tab===t?'#6366f1':'transparent'}`, color:tab===t?'#6366f1':'#9ca3af', background:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .12s' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'disposal' && <DisposalTab user={user}/>}

      {tab === 'schedule' && (
      <div style={{ padding:16, maxWidth:480, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
          {[['대기',cnt('대기'),'#9ca3af'],['진행중',cnt('진행중'),'#f59e0b'],['완료',cnt('완료'),'#10b981']].map(([l,v,c])=>(
            <Card key={l} style={{ textAlign:'center', padding:'12px 6px', borderTop:`3px solid ${c}` }}>
              <div style={{ fontSize:25, fontWeight:800, color:c, lineHeight:1.1 }}>{v}</div>
              <div style={{ fontSize:12, color:muted, marginTop:2, fontWeight:500 }}>{l}</div>
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
          const lc = s.status==='완료' ? '#10b981' : s.status==='진행중' ? '#6366f1' : s.status==='이동중' ? '#f59e0b' : '#d1d5db'
          return (
            <div key={s.id}
              onClick={()=>{ scrollYRef.current = window.scrollY; setSelId(s.id); setView('detail') }}
              style={{ background:'#fff', borderRadius:12, border:'1px solid #eaecf0', borderLeft:`4px solid ${lc}`, padding:'14px 16px', marginBottom:10, cursor:'pointer', transition:'box-shadow .1s' }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,.08)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                <span style={{ fontFamily:"'SF Mono','Fira Code',monospace", fontSize:20, fontWeight:800, color:'#111827', letterSpacing:'-.5px' }}>{s.time}</span>
                <Badge status={s.status}/>
              </div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:5, color:'#111827', lineHeight:1.3 }}>{s.address}</div>
              <div style={{ fontSize:12, color:'#9ca3af', display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                <span>폐기물 {s.waste}</span>
                <span>·</span>
                <span>담당: {s.cname}</span>
                {s.co_driver_id && (
                  <span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'1px 7px', borderRadius:10, fontWeight:600, fontSize:11 }}>
                    2인 · {userName(user.id === s.driver_id ? s.co_driver_id : s.driver_id)}
                  </span>
                )}
                {s.schedule_photos?.length > 0 && (
                  <span style={{ background:'#faf5ff', color:'#9333ea', border:'1px solid #e9d5ff', padding:'1px 6px', borderRadius:8, fontWeight:700, fontSize:11 }}>🖼 {s.schedule_photos.length}</span>
                )}
              </div>
              {s.start_time && (
                <div style={{ fontSize:12, color:'#10b981', marginTop:8, fontFamily:"'SF Mono','Fira Code',monospace", fontWeight:600 }}>
                  ▶ {s.start_time}{s.end_time ? ` → ■ ${s.end_time}` : ' (진행중)'}
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}

      {showHelp && <HelpModal onClose={()=>setHelp(false)}/>}

      {showSettings && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2000, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:480, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:`1px solid ${border}`, flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:700, color:navy }}>⚙ 설정</div>
              <button onClick={()=>{ setSettings(false); setPwErr(''); setPwOk(false); setPwForm({current:'',next:'',confirm:''}); setCarOk(false) }}
                style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
            </div>

            <div style={{ overflowY:'auto', padding:'16px 20px 32px' }}>

              {/* 차량번호 */}
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:10 }}>🚛 차량번호</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={carNum} onChange={e=>setCarNum(e.target.value.slice(-4))}
                    placeholder="뒤 4자리" maxLength={4}
                    style={{ ...iStyle, flex:1, fontSize:14 }}/>
                  <Btn onClick={saveCar} style={{ padding:'0 18px', fontSize:13 }}>저장</Btn>
                </div>
                {carOk && <div style={{ fontSize:12, color:green, marginTop:6, fontWeight:600 }}>✓ 저장되었습니다</div>}
              </div>

              <div style={{ borderTop:`1px solid ${border}`, marginBottom:24 }}/>

              {/* 비밀번호 변경 */}
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:10 }}>🔒 비밀번호 변경</div>
                {pwOk ? (
                  <div style={{ textAlign:'center', padding:'16px 0', fontSize:14, fontWeight:700, color:green }}>✅ 변경 완료!</div>
                ) : (
                  <>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, color:muted, marginBottom:4 }}>현재 비밀번호</div>
                      <input type="password" value={pwForm.current}
                        onChange={e=>setPwForm(p=>({...p,current:e.target.value}))}
                        placeholder="현재 비밀번호 입력"
                        style={{ ...iStyle, fontSize:13 }}/>
                    </div>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:11, color:muted, marginBottom:4 }}>새 비밀번호</div>
                      <input type="password" value={pwForm.next}
                        onChange={e=>setPwForm(p=>({...p,next:e.target.value}))}
                        placeholder="새 비밀번호 (4자 이상)"
                        style={{ ...iStyle, fontSize:13 }}/>
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:11, color:muted, marginBottom:4 }}>새 비밀번호 확인</div>
                      <input type="password" value={pwForm.confirm}
                        onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}
                        placeholder="새 비밀번호 다시 입력"
                        onKeyDown={e=>e.key==='Enter'&&changePw()}
                        style={{ ...iStyle, fontSize:13 }}/>
                    </div>
                    {pwErr && (
                      <div style={{ fontSize:12, color:'#dc2626', marginBottom:10, padding:'8px 12px', background:'#fef2f2', borderRadius:8 }}>
                        ⚠ {pwErr}
                      </div>
                    )}
                    <Btn onClick={changePw} style={{ width:'100%', padding:12 }}>변경</Btn>
                  </>
                )}
              </div>

              <div style={{ borderTop:`1px solid ${border}`, marginBottom:24 }}/>

              {/* 알림 설정 */}
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:10 }}>🔔 알림 설정</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:'#f8fafc', borderRadius:10, border:`1px solid ${border}` }}>
                  <div>
                    <div style={{ fontSize:13, color:textC, fontWeight:600 }}>푸시 알림</div>
                    <div style={{ fontSize:11, color:notifColor, marginTop:2 }}>{notifLabel}</div>
                  </div>
                  {notifPerm !== 'granted' && notifPerm !== 'denied' && (
                    <Btn onClick={requestNotif} style={{ padding:'6px 14px', fontSize:12 }}>허용</Btn>
                  )}
                </div>
                {notifPerm === 'denied' && (
                  <div style={{ fontSize:11, color:muted, marginTop:8, lineHeight:1.6 }}>
                    스마트폰 설정 → 브라우저 앱 → 알림 권한을 허용으로 변경하세요.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
