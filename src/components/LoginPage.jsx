import { useState, useEffect } from 'react'
import TruckIcon from './common/TruckIcon'
import { Field, Btn } from './common/ui'
import { navy, muted, red, border, textC, iStyle } from '../constants/styles'
import { VERSION, CHANGELOG } from '../constants/version'

export default function LoginPage({ onLogin, onLoginWithToken, users }) {
  const [id,        setId]        = useState(() => localStorage.getItem('saved_id') || '')
  const [pw,        setPw]        = useState('')
  const [saveId,    setSaveId]    = useState(() => localStorage.getItem('save_id') === '1')
  const [autoLogin, setAutoLogin] = useState(() => localStorage.getItem('auto_login') === '1')
  const [err,       setErr]       = useState('')
  const [showChangelog, setShowChangelog] = useState(
    () => localStorage.getItem('app_version_seen') !== VERSION
  )

  // 토큰 기반 자동 로그인
  useEffect(() => {
    if (!autoLogin || users.length === 0) return
    const savedId = localStorage.getItem('saved_id') || ''
    const token   = localStorage.getItem('session_token') || ''
    if (!savedId || !token) return
    onLoginWithToken(savedId, token).then(result => {
      if (result?.error) {
        // 토큰 만료 → 자동로그인 해제
        localStorage.removeItem('session_token')
        localStorage.setItem('auto_login', '0')
        setAutoLogin(false)
        setErr('자동 로그인이 만료되었습니다. 다시 로그인해 주세요.')
      }
    }).catch(() => {})
  }, [users]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = async () => {
    const result = await onLogin(id, pw)
    if (result.error) return setErr(result.error)

    if (saveId) { localStorage.setItem('saved_id', id); localStorage.setItem('save_id', '1') }
    else        { localStorage.removeItem('saved_id');   localStorage.setItem('save_id', '0') }

    if (autoLogin && result.sessionToken) {
      localStorage.setItem('session_token', result.sessionToken)
      localStorage.setItem('session_uid',   id)
      localStorage.setItem('auto_login',    '1')
    } else {
      localStorage.removeItem('session_token')
      localStorage.removeItem('session_uid')
      localStorage.setItem('auto_login', '0')
    }
  }

  const toggleSaveId = () => {
    const v = !saveId; setSaveId(v)
    if (!v) setAutoLogin(false)
  }
  const toggleAutoLogin = () => {
    const v = !autoLogin; setAutoLogin(v)
    if (v) setSaveId(true)
  }

  const chkStyle = (on) => ({
    width:18, height:18, borderRadius:5,
    background: on ? '#6366f1' : '#fff',
    border: `2px solid ${on ? '#6366f1' : '#d1d5db'}`,
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', flexShrink:0, transition:'all .15s',
  })

  const inputStyle = {
    ...iStyle,
    color:'#111827', WebkitTextFillColor:'#111827',
    border:'1.5px solid #eaecf0', background:'#f9fafb', borderRadius:10,
    padding:'11px 14px', fontSize:14,
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#eef2ff 0%,#f8f9fc 50%,#ecfdf5 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:20, padding:36, width:'100%', maxWidth:360, boxShadow:'0 8px 40px rgba(99,102,241,.12)', border:'1px solid #eaecf0' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
            <TruckIcon width={120} height={76}/>
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:'#111827', letterSpacing:'-.5px' }}>동태관리</div>
          <div style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>FN퍼니 일정 관리</div>
        </div>
        <Field label="아이디">
          <input value={id} onChange={e=>{ setId(e.target.value); setErr('') }}
            onKeyDown={e=>e.key==='Enter'&&go()} placeholder="아이디를 입력하세요"
            style={inputStyle}/>
        </Field>
        <Field label="비밀번호">
          <input type="password" value={pw} onChange={e=>{ setPw(e.target.value); setErr('') }}
            onKeyDown={e=>e.key==='Enter'&&go()} placeholder="비밀번호를 입력하세요"
            style={inputStyle}/>
        </Field>
        <div style={{ fontSize:11, color:'#9ca3af', marginBottom:16, marginTop:-6 }}>기본 비밀번호 : 1111</div>

        <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
          {[
            [saveId,    toggleSaveId,    '아이디 저장',  'chk-save-id'],
            [autoLogin, toggleAutoLogin, '자동 로그인',  'chk-auto-login'],
          ].map(([on, fn, label, cid]) => (
            <label key={cid} htmlFor={cid}
              style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', userSelect:'none' }}>
              <input type="checkbox" id={cid} checked={on} onChange={fn}
                style={{ position:'absolute', opacity:0, width:0, height:0 }}/>
              <div style={chkStyle(on)} aria-hidden="true">
                {on && <span style={{ color:'#fff', fontSize:11, fontWeight:700, lineHeight:1 }}>✓</span>}
              </div>
              <span style={{ fontSize:12, color: on ? '#374151' : '#9ca3af', fontWeight: on ? 600 : 400 }}>{label}</span>
            </label>
          ))}
        </div>

        {err && <div style={{ fontSize:12, color:'#e11d48', marginBottom:12, textAlign:'center', background:'#fff1f2', padding:'8px', borderRadius:8, border:'1px solid #fecdd3' }}>{err}</div>}
        <Btn onClick={go} color='#6366f1' style={{ width:'100%', padding:13, fontSize:15, borderRadius:11 }}>로그인</Btn>

        {showChangelog && (
          <div style={{ marginTop:14, background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'10px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#166534' }}>🆕 업데이트 안내 — {VERSION}</div>
              <button onClick={() => { localStorage.setItem('app_version_seen', VERSION); setShowChangelog(false) }}
                style={{ background:'none', border:'none', fontSize:14, cursor:'pointer', color:'#6b7280', lineHeight:1 }}>✕</button>
            </div>
            <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12, color:'#166534', lineHeight:1.9 }}>
              {CHANGELOG.slice(0, 4).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', marginTop:showChangelog ? 8 : 14, fontSize:11, color:'#d1d5db' }}>
          <span style={{ cursor:'pointer' }} onClick={() => setShowChangelog(v => !v)}>변경 내역</span>
          <span>{VERSION}</span>
        </div>
      </div>
    </div>
  )
}
