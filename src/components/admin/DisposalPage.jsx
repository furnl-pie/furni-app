import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Card, Btn } from '../common/ui'
import { navy, blue, red, border, muted, textC, today } from '../../constants/styles'

const SITES = ['HK', '강서천일', '기타']
const QUALITY_OPTIONS = ['혼합', '목재', '왈가닥', '기타']

const iStyle = {
  padding:'8px 10px', border:`1px solid ${border}`, borderRadius:7, fontSize:13,
  outline:'none', background:'#fafafa', boxSizing:'border-box', width:'100%',
}

export default function DisposalPage({ onBack }) {
  const [records,    setRecords]    = useState([])
  const [filterDate, setFilterDate] = useState(today)
  const [editRecord, setEditRecord] = useState(null)  // 수정 중인 레코드
  const [editForm,   setEditForm]   = useState({})
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)  // 삭제 확인 id

  useEffect(() => {
    const q = query(collection(db, 'disposals'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ ...d.data(), id: d.id })))
    })
    return unsub
  }, [])

  const filtered = records
    .filter(r => r.date === filterDate)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  const totalCost = filtered.reduce((sum, r) => {
    const n = parseInt((r.cost || '').replace(/[^0-9]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const openEdit = (r) => {
    setEditRecord(r)
    setEditForm({
      date:        r.date        || today,
      site:        SITES.slice(0,-1).includes(r.site) ? r.site : '기타',
      site_custom: SITES.slice(0,-1).includes(r.site) ? '' : (r.site || ''),
      time:        r.time        || '',
      cost:        r.cost        || '',
      load:        r.load        || '',
      car_number:  r.car_number  || '',
      quality:     r.quality     || '혼합',
      memo:        r.memo        || '',
      photos:      r.photos      || [],
    })
  }

  const setF = (k, v) => setEditForm(p => ({ ...p, [k]: v }))

  const saveEdit = async () => {
    setSaving(true)
    try {
      const site = editForm.site === '기타' ? editForm.site_custom : editForm.site
      await updateDoc(doc(db, 'disposals', editRecord.id), {
        date:       editForm.date,
        site:       site,
        time:       editForm.time,
        cost:       editForm.cost,
        load:       editForm.load,
        car_number: editForm.car_number,
        quality:    editForm.quality,
        memo:       editForm.memo,
        photos:     editForm.photos,
      })
      setEditRecord(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'disposals', id))
    setConfirmDel(null)
  }

  const removePhoto = (i) => setF('photos', editForm.photos.filter((_, idx) => idx !== i))

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
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ background:'#eff6ff', color:blue, borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:600 }}>
                    {r.driver_name}
                  </span>
                  <button onClick={()=>openEdit(r)}
                    style={{ background:'#f8fafc', border:`1px solid ${border}`, borderRadius:6, padding:'3px 10px', fontSize:12, color:textC, cursor:'pointer', fontWeight:600 }}>
                    수정
                  </button>
                  <button onClick={()=>setConfirmDel(r.id)}
                    style={{ background:'#fef2f2', border:`1px solid #fca5a5`, borderRadius:6, padding:'3px 10px', fontSize:12, color:red, cursor:'pointer', fontWeight:600 }}>
                    삭제
                  </button>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:4, fontSize:13, color:textC, marginBottom: r.memo||r.photos?.length ? 8 : 0 }}>
                {r.cost       && <div><span style={{ color:muted }}>처리비용: </span>{r.cost}</div>}
                {r.load       && <div><span style={{ color:muted }}>적재량: </span>{r.load}</div>}
                {r.car_number && <div><span style={{ color:muted }}>차량번호: </span>{r.car_number}</div>}
                {r.quality    && <div><span style={{ color:muted }}>성상: </span>{r.quality}</div>}
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

      {/* 수정 모달 */}
      {editRecord && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:440, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:15, color:navy }}>처리 기록 수정</div>
              <button onClick={()=>setEditRecord(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
            </div>
            <div style={{ padding:18, display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>날짜</div>
                  <input type="date" value={editForm.date} onChange={e=>setF('date',e.target.value)} style={iStyle}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>시간</div>
                  <input type="time" value={editForm.time} onChange={e=>setF('time',e.target.value)} style={iStyle}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>처리장</div>
                <select value={editForm.site} onChange={e=>setF('site',e.target.value)} style={iStyle}>
                  {SITES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                {editForm.site === '기타' && (
                  <input value={editForm.site_custom} onChange={e=>setF('site_custom',e.target.value)}
                    placeholder="처리장 이름 입력" style={{ ...iStyle, marginTop:6 }}/>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>처리비용</div>
                  <input value={editForm.cost} onChange={e=>setF('cost',e.target.value)} placeholder="예: 50000" style={iStyle}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>적재량</div>
                  <input value={editForm.load} onChange={e=>setF('load',e.target.value)} placeholder="예: 2톤" style={iStyle}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>차량번호</div>
                  <input value={editForm.car_number} onChange={e=>setF('car_number',e.target.value)} placeholder="12가3456" style={iStyle}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>성상</div>
                  <select value={editForm.quality} onChange={e=>setF('quality',e.target.value)} style={iStyle}>
                    {QUALITY_OPTIONS.map(q=><option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>메모</div>
                <input value={editForm.memo} onChange={e=>setF('memo',e.target.value)} placeholder="메모" style={iStyle}/>
              </div>
              {editForm.photos?.length > 0 && (
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:6 }}>사진</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {editForm.photos.map((p,i)=>(
                      <div key={i} style={{ position:'relative' }}>
                        <img src={p} alt="" onClick={()=>window.open(p,'_blank')}
                          style={{ width:72, height:72, objectFit:'cover', borderRadius:8, border:`1px solid ${border}`, cursor:'pointer' }}/>
                        <button onClick={()=>removePhoto(i)}
                          style={{ position:'absolute', top:-6, right:-6, background:red, color:'#fff', border:'none', borderRadius:'50%', width:18, height:18, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <Btn onClick={()=>setEditRecord(null)} outline style={{ flex:1, padding:'10px 0' }}>취소</Btn>
                <Btn onClick={saveEdit} disabled={saving} style={{ flex:2, padding:'10px 0' }}>
                  {saving ? '저장 중...' : '저장'}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1010, padding:16 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, maxWidth:320, width:'100%', textAlign:'center', fontFamily:"'Noto Sans KR', sans-serif" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🗑️</div>
            <div style={{ fontWeight:700, fontSize:15, color:navy, marginBottom:8 }}>처리 기록 삭제</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>삭제하면 복구할 수 없습니다.</div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={()=>setConfirmDel(null)} outline style={{ flex:1, padding:'10px 0' }}>취소</Btn>
              <Btn onClick={()=>handleDelete(confirmDel)} style={{ flex:1, padding:'10px 0', background:red, borderColor:red }}>삭제</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
