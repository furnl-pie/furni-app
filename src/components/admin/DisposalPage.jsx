import { useState, useEffect, useMemo } from 'react'
import useWindowWidth from '../../utils/useWindowWidth'
import { collection, onSnapshot, query, orderBy, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Card, Btn } from '../common/ui'
import Lightbox from '../common/Lightbox'
import { navy, blue, red, border, muted, textC, today } from '../../constants/styles'

const SITES = ['HK', '강서천일', '기타']
const QUALITY_OPTIONS = ['혼합', '목재', '왈가닥', '기타']

const iStyle = {
  padding:'8px 10px', border:`1px solid ${border}`, borderRadius:7, fontSize:13,
  outline:'none', background:'#fafafa', boxSizing:'border-box', width:'100%',
}

export default function DisposalPage({ onBack }) {
  const isPC = useWindowWidth() >= 1024
  const [records,    setRecords]    = useState([])
  const [filterDate, setFilterDate] = useState(today)
  const [editRecord, setEditRecord] = useState(null)  // 수정 중인 레코드
  const [editForm,   setEditForm]   = useState({})
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)  // 삭제 확인 id
  const [lbPhotos,   setLbPhotos]   = useState(null)  // Lightbox: { photos, index }
  const [lbEditPhotos, setLbEditPhotos] = useState(null)
  const [bulkModal,  setBulkModal]  = useState(false)
  const [bulkInput,  setBulkInput]  = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

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

  // 처리비 일괄 입력 파싱 및 프리뷰
  const bulkPreview = useMemo(() => {
    if (!bulkInput.trim()) return []
    // 라인별 파싱: "차량번호 금액" (금액은 만원 단위)
    const pairs = bulkInput.trim().split('\n').map(line => {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 2) return null
      const carNum = parts[0]
      const amount = parseFloat(parts[1])
      if (!carNum || isNaN(amount) || amount <= 0) return null
      return { carNum, amount }
    }).filter(Boolean)

    // 차량번호별로 입력 순서 유지
    const inputByCarNum = {}
    pairs.forEach(({ carNum, amount }) => {
      if (!inputByCarNum[carNum]) inputByCarNum[carNum] = []
      inputByCarNum[carNum].push(amount)
    })

    // 현재 날짜 filtered 레코드를 차량번호별 시간순 그룹화
    const recsByCarNum = {}
    filtered.forEach(r => {
      const key = (r.car_number || '').trim()
      if (!recsByCarNum[key]) recsByCarNum[key] = []
      recsByCarNum[key].push(r)
    })

    const result = []
    Object.entries(inputByCarNum).forEach(([carNum, amounts]) => {
      const recs = recsByCarNum[carNum] || []
      amounts.forEach((amount, i) => {
        const rec = recs[i]
        const newCost = String(amount * 10000)
        result.push({
          id:       rec?.id,
          carNum,
          time:     rec?.time || '',
          site:     rec?.site || '',
          oldCost:  rec?.cost || '',
          newCost,
          noMatch:  !rec,
        })
      })
    })
    return result
  }, [bulkInput, filtered])

  const applyBulkCost = async () => {
    const toApply = bulkPreview.filter(p => !p.noMatch)
    if (!toApply.length) return
    setBulkSaving(true)
    try {
      await Promise.all(toApply.map(({ id, newCost }) =>
        updateDoc(doc(db, 'disposals', id), { cost: newCost })
      ))
      setBulkModal(false)
      setBulkInput('')
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f8f9fc', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #eaecf0', height:54, display:'flex', alignItems:'center', padding:'0 20px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={onBack}
            style={{ width:34, height:34, border:'1px solid #eaecf0', background:'#f9fafb', borderRadius:8, cursor:'pointer', fontSize:16, color:'#6b7280', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
          <span style={{ fontSize:15, fontWeight:700, color:'#111827' }}>처리 현황</span>
        </div>
      </div>

      <div style={{ padding:16, maxWidth: isPC ? 1200 : 600, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)}
            style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid #eaecf0', fontSize:14, background:'#fff', color:'#111827', outline:'none', fontWeight:600 }}/>
          <span style={{ fontSize:12, color:'#9ca3af', fontWeight:600 }}>{filtered.length}건</span>
          <button onClick={()=>setBulkModal(true)} disabled={filtered.length===0}
            style={{ marginLeft:'auto', background:'#6366f1', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:700, cursor: filtered.length===0 ? 'default' : 'pointer', opacity: filtered.length===0 ? .45 : 1, fontFamily:'inherit' }}>
            💰 처리비 입력
          </button>
          {totalCost > 0 && (
            <span style={{ fontSize:13, fontWeight:700, color:'#6366f1', flexShrink:0 }}>
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
          <div style={{ display: isPC ? 'grid' : 'block', gridTemplateColumns: isPC ? '1fr 1fr' : undefined, gap: isPC ? 12 : undefined }}>
          {filtered.map(r => (
            <Card key={r.id} style={{ marginBottom: isPC ? 0 : 10 }}>
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
                    <img key={i} src={p} alt="" onClick={()=>setLbPhotos({ photos: r.photos, index: i })}
                      style={{ width:72, height:72, objectFit:'cover', borderRadius:8, border:`1px solid ${border}`, cursor:'pointer' }}/>
                  ))}
                </div>
              )}
            </Card>
          ))}
          </div>
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
                        <img src={p} alt="" onClick={()=>setLbEditPhotos({ photos: editForm.photos, index: i })}
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

      {lbPhotos && <Lightbox photos={lbPhotos.photos} index={lbPhotos.index} onClose={()=>setLbPhotos(null)}/>}
      {lbEditPhotos && <Lightbox photos={lbEditPhotos.photos} index={lbEditPhotos.index} onClose={()=>setLbEditPhotos(null)}/>}

      {/* 처리비 일괄 입력 모달 */}
      {bulkModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:navy }}>처리비 일괄 입력</div>
                <div style={{ fontSize:12, color:muted, marginTop:2 }}>{filterDate} · 차량번호 시간순 매칭</div>
              </div>
              <button onClick={()=>{ setBulkModal(false); setBulkInput('') }} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
            </div>
            <div style={{ padding:18 }}>
              <div style={{ fontSize:12, color:muted, marginBottom:8, lineHeight:1.8 }}>
                한 줄에 <strong>차량번호 금액</strong> 형식으로 입력하세요.<br/>
                금액은 만원 단위 (예: <strong>5</strong> → 50,000원, <strong>14</strong> → 140,000원)<br/>
                중복 차량번호는 시간순으로 순서대로 매칭됩니다.
              </div>
              <textarea
                value={bulkInput}
                onChange={e=>setBulkInput(e.target.value)}
                placeholder={'예시:\n9381 14\n1234 5\n9381 9'}
                style={{ width:'100%', minHeight:120, padding:'10px 12px', border:`1px solid ${border}`, borderRadius:8, fontSize:14, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'monospace', lineHeight:1.7 }}
              />

              {/* 프리뷰 */}
              {bulkPreview.length > 0 && (
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:textC, marginBottom:8 }}>적용 미리보기</div>
                  <div style={{ border:`1px solid ${border}`, borderRadius:8, overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          <th style={{ padding:'7px 10px', textAlign:'left', color:muted, fontWeight:600, borderBottom:`1px solid ${border}` }}>차량번호</th>
                          <th style={{ padding:'7px 10px', textAlign:'left', color:muted, fontWeight:600, borderBottom:`1px solid ${border}` }}>시간</th>
                          <th style={{ padding:'7px 10px', textAlign:'left', color:muted, fontWeight:600, borderBottom:`1px solid ${border}` }}>처리장</th>
                          <th style={{ padding:'7px 10px', textAlign:'right', color:muted, fontWeight:600, borderBottom:`1px solid ${border}` }}>금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.map((p, i) => (
                          <tr key={i} style={{ background: p.noMatch ? '#fef2f2' : i%2===0 ? '#fff' : '#f9fafb' }}>
                            <td style={{ padding:'7px 10px', fontWeight:600, color: p.noMatch ? red : navy }}>{p.carNum}</td>
                            <td style={{ padding:'7px 10px', color: p.noMatch ? red : textC }}>{p.noMatch ? '매칭 없음' : (p.time || '—')}</td>
                            <td style={{ padding:'7px 10px', color:muted, fontSize:12 }}>{p.site}</td>
                            <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color: p.noMatch ? red : '#6366f1' }}>
                              {p.noMatch ? '—' : `${parseInt(p.newCost).toLocaleString()}원`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bulkPreview.some(p=>p.noMatch) && (
                    <div style={{ fontSize:12, color:red, marginTop:6 }}>⚠ 빨간 행은 해당 날짜에 매칭되는 기록이 없어 건너뜁니다.</div>
                  )}
                </div>
              )}

              <div style={{ display:'flex', gap:8, marginTop:16 }}>
                <Btn onClick={()=>{ setBulkModal(false); setBulkInput('') }} outline style={{ flex:1, padding:'10px 0' }}>취소</Btn>
                <Btn onClick={applyBulkCost} disabled={bulkSaving || bulkPreview.filter(p=>!p.noMatch).length===0} style={{ flex:2, padding:'10px 0' }}>
                  {bulkSaving ? '저장 중...' : `✓ ${bulkPreview.filter(p=>!p.noMatch).length}건 적용`}
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
