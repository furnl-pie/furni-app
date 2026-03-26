import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Btn, Card } from '../common/ui'
import { navy, blue, green, red, border, muted, textC, iStyle, today } from '../../constants/styles'
import { readFilesAsBase64 } from '../../utils/image'

const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET

async function uploadPhoto(base64, folder) {
  if (!base64.startsWith('data:')) return base64
  const fd = new FormData()
  fd.append('file', base64)
  fd.append('upload_preset', PRESET)
  fd.append('folder', folder)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method:'POST', body:fd })
  if (!res.ok) throw new Error('사진 업로드 실패')
  return (await res.json()).secure_url
}

const SITES = ['HK', '강서천일', '기타']
const QUALITY_OPTIONS = ['혼합', '목재', '왈가닥', '기타']

const roundedNow = () => {
  const d = new Date()
  d.setMinutes(Math.round(d.getMinutes() / 10) * 10, 0, 0)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const emptyForm = (user) => ({
  date:        today,
  site:        'HK',
  site_custom: '',
  time:        roundedNow(),
  cost:        '',
  load:        '',
  car_number:  user?.car_number || '',
  quality:     '혼합',
  memo:        '',
  photos:      [],
})

export default function DisposalTab({ user }) {
  const [form,       setForm]       = useState(emptyForm(user))
  const [editingId,  setEditingId]  = useState(null) // 수정 중인 record id
  const [submitting, setSubmitting] = useState(false)
  const [ok,         setOk]         = useState(false)
  const [records,    setRecords]    = useState([])
  const [viewDate,   setViewDate]   = useState(today)
  const fileRef = useRef(null)

  useEffect(() => {
    const q = query(collection(db, 'disposals'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ ...d.data(), id: d.id })))
    })
    return unsub
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const addPhotos = async e => {
    const resized = await readFilesAsBase64(e.target.files)
    set('photos', [...form.photos, ...resized])
    e.target.value = ''
  }

  const removePhoto = i => set('photos', form.photos.filter((_, idx) => idx !== i))

  const startEdit = (r) => {
    const isCustomSite = !SITES.slice(0,-1).includes(r.site) && r.site !== 'HK' && r.site !== '강서천일'
    setForm({
      date:        r.date,
      site:        isCustomSite ? '기타' : r.site,
      site_custom: isCustomSite ? r.site : '',
      time:        r.time || '',
      cost:        r.cost || '',
      load:        r.load || '',
      car_number:  r.car_number || '',
      quality:     r.quality || '혼합',
      memo:        r.memo || '',
      photos:      r.photos || [],
    })
    setEditingId(r.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setForm(emptyForm(user))
    setEditingId(null)
  }

  const deleteRecord = async (id) => {
    if (!window.confirm('이 처리 기록을 삭제할까요?')) return
    await deleteDoc(doc(db, 'disposals', id))
  }

  const submit = async () => {
    if (form.photos.length === 0) {
      alert('처리 전 차량 사진을 첨부해주세요.')
      return
    }
    setSubmitting(true)
    try {
      const finalSite = form.site === '기타' ? (form.site_custom || '기타') : form.site
      const folder = `disposal/${form.date}`
      const uploadedPhotos = await Promise.all(form.photos.map(p => uploadPhoto(p, folder)))
      const data = {
        date:        form.date,
        site:        finalSite,
        time:        form.time,
        cost:        form.cost,
        load:        form.load,
        car_number:  form.car_number,
        quality:     form.quality,
        memo:        form.memo,
        photos:      uploadedPhotos,
      }
      if (editingId) {
        await updateDoc(doc(db, 'disposals', editingId), data)
        setEditingId(null)
      } else {
        await addDoc(collection(db, 'disposals'), {
          ...data,
          driver_id:   user.id,
          driver_name: user.name,
          createdAt:   serverTimestamp(),
        })
      }
      setForm(emptyForm(user))
      setOk(true)
      setTimeout(() => setOk(false), 2500)
    } catch (e) {
      alert('저장 실패: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const myRecords = records
    .filter(r => r.date === viewDate && r.driver_id === user.id)
    .sort((a, b) => (b.time || '').localeCompare(a.time || ''))

  return (
    <div style={{ padding:16, maxWidth:480, margin:'0 auto' }}>

      {/* 입력 폼 */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:700, color:navy }}>{editingId ? '처리비 수정' : '처리비 보고'}</div>
          {editingId && (
            <button onClick={cancelEdit}
              style={{ background:'none', border:`1px solid ${border}`, borderRadius:7, padding:'4px 10px', fontSize:12, color:muted, cursor:'pointer' }}>
              취소
            </button>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:muted, marginBottom:4 }}>날짜</div>
            <input type="date" value={form.date} onChange={e=>set('date',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
          </div>
          <div>
            <div style={{ fontSize:11, color:muted, marginBottom:4 }}>처리시간</div>
            <input type="time" value={form.time} onChange={e=>set('time',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
          </div>
        </div>

        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:muted, marginBottom:4 }}>처리장</div>
          <div style={{ position:'relative' }}>
            <select value={form.site} onChange={e=>set('site',e.target.value)} style={{ ...iStyle, fontSize:13, paddingRight:30 }}>
              {SITES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:muted, fontSize:11 }}>▼</span>
          </div>
          {form.site === '기타' && (
            <input value={form.site_custom} onChange={e=>set('site_custom',e.target.value)}
              placeholder="처리장 직접 입력" style={{ ...iStyle, fontSize:13, marginTop:6 }}/>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:muted, marginBottom:4 }}>처리비용</div>
            <input value={form.cost} onChange={e=>set('cost',e.target.value)} placeholder="예: 150,000" style={{ ...iStyle, fontSize:13 }}/>
          </div>
          <div>
            <div style={{ fontSize:11, color:muted, marginBottom:4 }}>적재량</div>
            <input value={form.load} onChange={e=>set('load',e.target.value)} placeholder="예: 1차" style={{ ...iStyle, fontSize:13 }}/>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:muted, marginBottom:4 }}>차량번호</div>
            <input value={form.car_number} onChange={e=>set('car_number',e.target.value)} placeholder="예: 12가3456" style={{ ...iStyle, fontSize:13 }}/>
          </div>
          <div>
            <div style={{ fontSize:11, color:muted, marginBottom:4 }}>성상</div>
            <div style={{ position:'relative' }}>
              <select value={form.quality} onChange={e=>set('quality',e.target.value)} style={{ ...iStyle, fontSize:13, paddingRight:30 }}>
                {QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:muted, fontSize:11 }}>▼</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:muted, marginBottom:4 }}>특이사항</div>
          <input value={form.memo} onChange={e=>set('memo',e.target.value)} placeholder="특이사항 입력" style={{ ...iStyle, fontSize:13 }}/>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:muted }}>처리 전 차량 사진</span>
            <span style={{ color:'#dc2626', fontWeight:700, fontSize:10 }}>필수</span>
          </div>
          {form.photos.length > 0 && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
              {form.photos.map((p, i) => (
                <div key={i} style={{ position:'relative' }}>
                  <img src={p} alt="" style={{ width:72, height:72, objectFit:'cover', borderRadius:8, border:`1px solid ${border}` }}/>
                  <button onClick={()=>removePhoto(i)}
                    style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', background:red, border:'none', color:'#fff', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={()=>fileRef.current?.click()}
            style={{ background:'#f8fafc', border:`1.5px dashed ${form.photos.length===0?'#dc2626':border}`, borderRadius:8, padding:'8px 0', fontSize:13, color:form.photos.length===0?'#dc2626':muted, cursor:'pointer', width:'100%' }}>
            + 사진 첨부 (필수)
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display:'none' }}/>
        </div>

        {ok && (
          <div style={{ fontSize:13, color:green, background:'#f0fdf4', padding:'9px 12px', borderRadius:8, marginBottom:10, fontWeight:600 }}>
            ✓ 보고 완료!
          </div>
        )}
        <Btn onClick={submit} disabled={submitting} style={{ width:'100%', padding:13, fontSize:15 }}>
          {submitting ? '저장 중...' : editingId ? '수정 완료' : '보고 제출'}
        </Btn>
      </Card>

      {/* 내 처리 기록 */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:textC, flex:1 }}>내 처리 기록</div>
        <input type="date" value={viewDate} onChange={e=>setViewDate(e.target.value)}
          style={{ padding:'5px 10px', borderRadius:8, border:`1px solid ${border}`, fontSize:13, background:'#fff', color:textC }}/>
      </div>

      {myRecords.length === 0 ? (
        <div style={{ textAlign:'center', padding:32, color:muted, fontSize:13 }}>이 날짜에 처리 기록이 없습니다</div>
      ) : (
        myRecords.map(r => (
          <Card key={r.id} style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontWeight:700, color:navy, fontSize:15 }}>{r.site}</span>
                {r.time && <span style={{ fontFamily:'monospace', fontSize:13, color:muted }}>{r.time}</span>}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>startEdit(r)}
                  style={{ background:'#eff6ff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:12, color:blue, fontWeight:600, cursor:'pointer' }}>
                  수정
                </button>
                <button onClick={()=>deleteRecord(r.id)}
                  style={{ background:'#fef2f2', border:'none', borderRadius:6, padding:'4px 10px', fontSize:12, color:red, fontWeight:600, cursor:'pointer' }}>
                  삭제
                </button>
              </div>
            </div>
            <div style={{ fontSize:13, color:textC, display:'flex', gap:14, flexWrap:'wrap', marginBottom:r.memo||r.photos?.length?6:0 }}>
              {r.cost        && <span>💰 {r.cost}</span>}
              {r.load        && <span>📦 {r.load}</span>}
              {r.car_number  && <span>🚛 {r.car_number}</span>}
              {r.quality     && <span>성상: {r.quality}</span>}
            </div>
            {r.memo && <div style={{ fontSize:12, color:muted, marginBottom:r.photos?.length?6:0 }}>{r.memo}</div>}
            {r.photos?.length > 0 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {r.photos.map((p, i) => (
                  <img key={i} src={p} alt="" onClick={()=>window.open(p,'_blank')}
                    style={{ width:64, height:64, objectFit:'cover', borderRadius:6, border:`1px solid ${border}`, cursor:'pointer' }}/>
                ))}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  )
}
