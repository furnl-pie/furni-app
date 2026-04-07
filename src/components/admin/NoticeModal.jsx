import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Btn } from '../common/ui'
import { navy, blue, muted, green, red, amber, border, textC, iStyle } from '../../constants/styles'

function NoticeSection({ title, color, items, onChange }) {
  const [input, setInput] = useState('')

  const add = () => {
    const v = input.trim()
    if (!v) return
    onChange([...items, v])
    setInput('')
  }

  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))

  const moveUp = (i) => {
    if (i === 0) return
    const next = [...items]
    ;[next[i-1], next[i]] = [next[i], next[i-1]]
    onChange(next)
  }

  const moveDown = (i) => {
    if (i === items.length - 1) return
    const next = [...items]
    ;[next[i], next[i+1]] = [next[i+1], next[i]]
    onChange(next)
  }

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:13, fontWeight:700, color, marginBottom:10 }}>{title}</div>
      {items.length === 0 && (
        <div style={{ fontSize:12, color:muted, padding:'8px 0' }}>공지 항목 없음</div>
      )}
      {items.map((item, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, background:'#f8fafc', borderRadius:8, padding:'8px 10px', border:`1px solid ${border}` }}>
          <div style={{ flex:1, fontSize:13, color:textC }}>{item}</div>
          <button onClick={()=>moveUp(i)} style={{ background:'none', border:'none', cursor:'pointer', color:muted, fontSize:14, padding:'0 2px' }}>▲</button>
          <button onClick={()=>moveDown(i)} style={{ background:'none', border:'none', cursor:'pointer', color:muted, fontSize:14, padding:'0 2px' }}>▼</button>
          <button onClick={()=>remove(i)} style={{ background:'none', border:'none', cursor:'pointer', color:red, fontSize:16, padding:'0 2px' }}>✕</button>
        </div>
      ))}
      <div style={{ display:'flex', gap:8, marginTop:6 }}>
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&add()}
          placeholder="공지 내용 입력 후 엔터"
          style={{ ...iStyle, flex:1, fontSize:13 }}
        />
        <button onClick={add}
          style={{ padding:'0 14px', borderRadius:8, border:`1px solid ${color}`, background:color, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
          추가
        </button>
      </div>
    </div>
  )
}

export default function NoticeModal({ onClose }) {
  const [active, setActive]           = useState(false)
  const [adminItems, setAdminItems]   = useState([])
  const [driverItems, setDriverItems] = useState([])
  const [saving, setSaving]           = useState(false)
  const [ok, setOk]                   = useState(false)

  useEffect(() => {
    const ref = doc(db, 'settings', 'notice')
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data()
        setActive(d.active !== false)
        setAdminItems(d.adminItems || [])
        setDriverItems(d.driverItems || [])
      }
    })
    return unsub
  }, [])

  const save = async () => {
    setSaving(true)
    await setDoc(doc(db, 'settings', 'notice'), { active, adminItems, driverItems })
    setSaving(false)
    setOk(true)
    setTimeout(() => setOk(false), 1500)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:400, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        {/* 헤더 */}
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:navy }}>📢 공지 관리</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
        </div>

        {/* 공지 활성화 토글 */}
        <div style={{ padding:'12px 20px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:textC }}>공지 표시</div>
            <div style={{ fontSize:11, color:muted, marginTop:2 }}>끄면 모든 사용자에게 공지가 보이지 않음</div>
          </div>
          <div onClick={()=>setActive(v=>!v)}
            style={{ width:44, height:24, borderRadius:12, background:active?green:'#cbd5e1', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0 }}>
            <div style={{ position:'absolute', top:3, left:active?23:3, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transition:'left .2s' }}/>
          </div>
        </div>

        {/* 항목 편집 */}
        <div style={{ padding:'16px 20px', overflowY:'auto', flex:1, opacity:active?1:.4, pointerEvents:active?'auto':'none' }}>
          <NoticeSection
            title="🔑 관리자 공지"
            color={navy}
            items={adminItems}
            onChange={setAdminItems}
          />
          <NoticeSection
            title="🚚 기사 공지"
            color={blue}
            items={driverItems}
            onChange={setDriverItems}
          />
        </div>

        {/* 저장 */}
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${border}`, flexShrink:0 }}>
          {ok && <div style={{ fontSize:12, color:green, marginBottom:8, textAlign:'center' }}>✓ 저장되었습니다</div>}
          <Btn onClick={save} style={{ width:'100%', padding:12, fontSize:15 }}>
            {saving ? '저장 중...' : '저장하기'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
