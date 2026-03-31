import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Btn } from '../common/ui'
import { navy, blue, muted, green, red, border, textC, iStyle } from '../../constants/styles'
import { hashPw } from '../../utils/auth'

export default function AdminSettingsModal({ user, onUpdateDriver, onClose }) {
  const [pwForm, setPwForm]           = useState({ current:'', next:'', confirm:'' })
  const [err,    setErr]              = useState('')
  const [ok,     setOk]               = useState('')
  const [globalEnabled, setGlobal]    = useState(true)
  const [overdueEnabled, setOverdue]  = useState(true)

  useEffect(() => {
    const ref = doc(db, 'settings', 'notifications')
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data()
        setGlobal(data.globalEnabled !== false)
        setOverdue(data.overdueEnabled !== false)
      }
    })
    return unsub
  }, [])

  const toggleGlobal = async (val) => {
    setGlobal(val)
    await setDoc(doc(db, 'settings', 'notifications'), { globalEnabled: val }, { merge: true })
  }

  const toggleOverdue = async (val) => {
    setOverdue(val)
    await setDoc(doc(db, 'settings', 'notifications'), { overdueEnabled: val }, { merge: true })
  }

  const changePw = async () => {
    setErr(''); setOk('')
    const currentHashed = await hashPw(pwForm.current)
    if (user.pw !== currentHashed && user.pw !== pwForm.current) return setErr('현재 비밀번호가 올바르지 않습니다')
    if (pwForm.next.length < 4)     return setErr('새 비밀번호는 4자 이상 입력하세요')
    if (pwForm.next !== pwForm.confirm) return setErr('새 비밀번호가 일치하지 않습니다')
    await onUpdateDriver(user.id, { pw: pwForm.next })
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
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${border}` }}>
          <div style={{ fontSize:14, fontWeight:700, color:textC, marginBottom:12 }}>알림 설정</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:textC }}>🔔 전체 알림</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>모든 푸시 알림 켜기/끄기</div>
            </div>
            <div onClick={()=>toggleGlobal(!globalEnabled)}
              style={{ width:44, height:24, borderRadius:12, background:globalEnabled?green:'#cbd5e1', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left:globalEnabled?23:3, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transition:'left .2s' }}/>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', opacity:globalEnabled?1:.4, pointerEvents:globalEnabled?'auto':'none' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:textC }}>⏰ 30분 미출발 알림</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>배정 시간 초과 시 관리자에게 알림</div>
            </div>
            <div onClick={()=>toggleOverdue(!overdueEnabled)}
              style={{ width:44, height:24, borderRadius:12, background:overdueEnabled?green:'#cbd5e1', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:3, left:overdueEnabled?23:3, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transition:'left .2s' }}/>
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
