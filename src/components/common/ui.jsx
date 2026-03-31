// Badge, Btn, Card, Row, Field — 작은 공통 UI 컴포넌트 모음
import { useState } from 'react'
import { STATUS_CFG, blue, muted, border, textC, navy, green } from '../../constants/styles'

export function Badge({ status, billed }) {
  const key = billed ? '청구완료' : status
  const s = STATUS_CFG[key] || STATUS_CFG['대기']
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6, color:s.color, background:s.bg, border:`1px solid ${s.border||'transparent'}`, whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:2 }}>
      {s.label}
    </span>
  )
}

export function Btn({ children, onClick, color=blue, outline, style={}, disabled }) {
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

export function Card({ children, style={}, onClick }) {
  return (
    <div onClick={onClick} style={{ background:'#fff', borderRadius:12, border:`1px solid ${border}`, padding:16, ...style }}>
      {children}
    </div>
  )
}

export function Row({ label, value, valueColor }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${border}`, fontSize:14 }}>
      <span style={{ color:muted, fontSize:13 }}>{label}</span>
      <span style={{ fontWeight:500, color:valueColor||textC }}>{value}</span>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:600, color:muted, display:'block', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  )
}

export function CopyAddress({ address }) {
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
