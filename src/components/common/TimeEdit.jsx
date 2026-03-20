// EtaInlineEdit, DriverTimeEdit, TimeEditRow, EtaModalInput — 시간 편집 컴포넌트 모음
import { useState, useRef } from 'react'
import { blue, border, muted, navy, red } from '../../constants/styles'

export function EtaInlineEdit({ eta, onSave }) {
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

export function DriverTimeEdit({ label, value, color, onSave }) {
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

export function TimeEditRow({ label, value, color, onSave }) {
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

export function EtaModalInput({ eta, onChange }) {
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
