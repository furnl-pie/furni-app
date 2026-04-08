import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, onSnapshot, orderBy, query, updateDoc, doc, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { navy, blue, border, muted, textC, green, amber } from '../../constants/styles'
import { Badge } from './ui'

// driverId: 대화 상대 기사 ID
// me: 현재 로그인 유저 { id, name, role }
// driverName: 헤더 표시용 이름
// embedded: true면 탭 안에 인라인으로 표시 (모달 아님)
// schedules: 기사 탭에서 오늘 일정 표시용
// onClose: null이면 닫기 버튼 없음
export default function ChatModal({ driverId, me, driverName, onClose, embedded = false, schedules = [] }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const bottomRef               = useRef(null)

  useEffect(() => {
    const q = query(
      collection(db, 'chats', driverId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setMessages(msgs)
      // 상대방 메시지 읽음 처리
      snap.docs.forEach(d => {
        const data = d.data()
        if (data.sender !== me.id && !data.read) {
          updateDoc(doc(db, 'chats', driverId, 'messages', d.id), { read: true }).catch(() => {})
        }
      })
    })
    return unsub
  }, [driverId, me.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    await addDoc(collection(db, 'chats', driverId, 'messages'), {
      text,
      sender: me.id,
      senderName: me.name,
      createdAt: serverTimestamp(),
      read: false,
    })
  }

  const fmtTime = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const chatContent = (
    <>
      {/* 오늘 일정 (기사 탭에서만 표시) */}
      {embedded && schedules.length > 0 && (
        <div style={{ padding:'12px 16px 0', flexShrink:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8 }}>오늘 배정 일정</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:160, overflowY:'auto' }}>
            {schedules.map(s => {
              const lc = s.status==='완료' ? green : s.status==='진행중' ? '#6366f1' : s.status==='이동중' ? amber : '#d1d5db'
              return (
                <div key={s.id} style={{ background:'#f8fafc', borderRadius:8, borderLeft:`3px solid ${lc}`, padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#111827' }}>{s.time} {s.address}</div>
                    <div style={{ fontSize:11, color:muted, marginTop:2 }}>{s.cname} · {s.waste}</div>
                  </div>
                  <Badge status={s.status}/>
                </div>
              )
            })}
          </div>
          <div style={{ height:1, background:border, margin:'12px 0 0' }}/>
        </div>
      )}
      {embedded && schedules.length === 0 && (
        <div style={{ padding:'12px 16px 0', flexShrink:0 }}>
          <div style={{ fontSize:12, color:muted }}>오늘 배정된 일정이 없습니다</div>
          <div style={{ height:1, background:border, margin:'12px 0 0' }}/>
        </div>
      )}

      {/* 메시지 목록 */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 16px 8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', color:muted, fontSize:13, marginTop:40 }}>메시지가 없습니다</div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender === me.id
          const showName = !isMe && (i === 0 || messages[i-1].sender !== msg.sender)
          return (
            <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom:8 }}>
              {showName && (
                <div style={{ fontSize:11, color:muted, marginBottom:2, marginLeft:4 }}>{msg.senderName}</div>
              )}
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                <div style={{
                  maxWidth:'72%', padding:'9px 13px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isMe ? navy : '#f1f5f9',
                  color: isMe ? '#fff' : textC,
                  fontSize:14, lineHeight:1.5,
                  wordBreak:'break-word',
                }}>
                  {msg.text}
                </div>
                <div style={{ fontSize:10, color:muted, flexShrink:0 }}>
                  {fmtTime(msg.createdAt)}
                  {isMe && <span style={{ marginLeft:3 }}>{msg.read ? ' ✓✓' : ' ✓'}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* 입력창 */}
      <div style={{ padding:'10px 12px', borderTop:`1px solid ${border}`, display:'flex', gap:8, flexShrink:0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="메시지 입력..."
          style={{ flex:1, padding:'10px 14px', borderRadius:22, border:`1.5px solid ${border}`, fontSize:14, outline:'none', fontFamily:'inherit' }}
        />
        <button
          onClick={send}
          style={{ width:44, height:44, borderRadius:'50%', border:'none', background:navy, color:'#fff', fontSize:18, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          ➤
        </button>
      </div>
    </>
  )

  // 탭 내 인라인 모드
  if (embedded) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 160px)', fontFamily:"'Noto Sans KR', sans-serif" }}>
        {chatContent}
      </div>
    )
  }

  // 모달 모드 (관리자)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:3000, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:480, height:'80vh', display:'flex', flexDirection:'column' }}>
        {/* 헤더 */}
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:navy }}>💬 {driverName}</div>
          {onClose && <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:muted }}>✕</button>}
        </div>
        {chatContent}
      </div>
    </div>
  )
}
