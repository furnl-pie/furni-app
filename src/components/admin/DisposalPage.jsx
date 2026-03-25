import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Card } from '../common/ui'
import { navy, blue, border, muted, textC, today } from '../../constants/styles'

export default function DisposalPage({ onBack }) {
  const [records,    setRecords]    = useState([])
  const [filterDate, setFilterDate] = useState(today)

  useEffect(() => {
    const q = query(collection(db, 'disposals'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ ...d.data(), id: d.id })))
    })
    return unsub
  }, [])

  const filtered = records
    .filter(r => r.date === filterDate)
    .sort((a, b) => (b.time || '').localeCompare(a.time || ''))

  const totalCost = filtered.reduce((sum, r) => {
    const n = parseInt((r.cost || '').replace(/[^0-9]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:navy, color:'#fff', padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onBack}
            style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>
            ←
          </button>
          <div style={{ fontSize:17, fontWeight:700 }}>처리 현황</div>
        </div>
      </div>

      <div style={{ padding:16, maxWidth:600, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${border}`, fontSize:14, background:'#fff', color:textC, outline:'none' }}/>
          <span style={{ fontSize:13, color:muted }}>{filtered.length}건</span>
          {totalCost > 0 && (
            <span style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:navy }}>
              합계 {totalCost.toLocaleString()}원
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:52, color:muted }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
            <div style={{ fontSize:14 }}>이 날짜에 처리 기록이 없습니다</div>
          </div>
        ) : (
          filtered.map(r => (
            <Card key={r.id} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontWeight:700, color:navy, fontSize:15 }}>{r.site}</span>
                  {r.time && <span style={{ fontFamily:'monospace', fontSize:13, color:muted }}>{r.time}</span>}
                </div>
                <span style={{ background:'#eff6ff', color:blue, borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:600 }}>
                  {r.driver_name}
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:4, fontSize:13, color:textC, marginBottom: r.memo||r.photos?.length ? 8 : 0 }}>
                {r.cost       && <div><span style={{ color:muted }}>처리비용: </span>{r.cost}</div>}
                {r.load       && <div><span style={{ color:muted }}>적재량: </span>{r.load}</div>}
                {r.car_number && <div><span style={{ color:muted }}>차량번호: </span>{r.car_number}</div>}
                {r.quality    && <div><span style={{ color:muted }}>상성: </span>{r.quality}</div>}
              </div>
              {r.memo && (
                <div style={{ fontSize:12, color:muted, marginBottom: r.photos?.length ? 8 : 0 }}>{r.memo}</div>
              )}
              {r.photos?.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {r.photos.map((p, i) => (
                    <img key={i} src={p} alt="" onClick={()=>window.open(p,'_blank')}
                      style={{ width:72, height:72, objectFit:'cover', borderRadius:8, border:`1px solid ${border}`, cursor:'pointer' }}/>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
