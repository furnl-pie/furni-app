import { useState, useEffect } from 'react'
import TruckIcon from './common/TruckIcon'
import { Field, Btn } from './common/ui'
import { navy, muted, red, border, textC, iStyle } from '../constants/styles'

export default function LoginPage({ onLogin, users }) {
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
