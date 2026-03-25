import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Btn, Card } from '../common/ui'
import { navy, blue, green, red, border, muted, textC, iStyle, today } from '../../constants/styles'

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
const QUALITY_OPTIONS = ['혼합', '목재', '철재', '플라스틱', '기타']

const emptyForm = (user) => ({
  date:        today,
  site:        'HK',
  site_custom: '',
  time:        '',
  cost:        '',
  load:        '',
  car_number:  user?.car_number || '',
  quality:     '혼합',
  memo:        '',
  photos:      [],
})

export default function DisposalTab({ user }) {
  const [form,       setForm]       = useState(emptyForm(user))
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
    const files = Array.from(e.target.files)
    const readers = await Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader()
      r.onload = ev => res(ev.target.result)
      r.readAsDataURL(f)
    })))
    set('photos', [...form.photos, ...readers])
    e.target.value = ''
  }

  const removePhoto = i => set('photos', form.photos.filter((_, idx) => idx !== i))

  const submit = async () => {
    setSubmitting(true)
    try {
      const finalSite = form.site === '기타' ? (form.site_custom || '기타') : form.site
      const folder = `disposal/${form.date}`
      const uploadedPhotos = await Promise.all(form.photos.map(p => uploadPhoto(p, folder)))
      await addDoc(collection(db, 'disposals'), {
        date:        form.date,
        site:        finalSite,
        time:        form.time,
        cost:        form.cost,
        load:        form.load,
        car_number:  form.car_number,
        quality:     form.quality,
        memo:        form.memo,
        photos:      uploadedPhotos,
        driver_id:   user.id,
        driver_name: user.name,
        createdAt:   serverTimestamp(),
      })
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
        <div style={{ fontSize:14, fontWeight:700, color:navy, marginBottom:14 }}>처리비 보고</div>

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
          <select value={form.site} onChange={e=>set('site',e.target.value)} style={{ ...iStyle, fontSize:13 }}>
            {SITES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
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
            <input value={form.load} onChange={e=>set('load',e.target.value)} placeholder="예: 2톤" style={{ ...iStyle, fontSize:13 }}/>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:muted, marginBottom:4 }}>차량번호</div>
            <input value={form.car_number} onChange={e=>set('car_number',e.target.value)} placeholder="예: 12가3456" style={{ ...iStyle, fontSize:13 }}/>
          </div>
          <div>
            <div style={{ fontSize:11, color:muted, marginBottom:4 }}>상성</div>
            <select value={form.quality} onChange={e=>set('quality',e.target.value)} style={{ ...iStyle, fontSize:13 }}>
              {QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:muted, marginBottom:4 }}>특이사항</div>
          <input value={form.memo} onChange={e=>set('memo',e.target.value)} placeholder="특이사항 입력" style={{ ...iStyle, fontSize:13 }}/>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:muted, marginBottom:6 }}>사진</div>
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
            style={{ background:'#f8fafc', border:`1.5px dashed ${border}`, borderRadius:8, padding:'8px 0', fontSize:13, color:muted, cursor:'pointer', width:'100%' }}>
            + 사진 추가
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display:'none' }}/>
        </div>

        {ok && (
          <div style={{ fontSize:13, color:green, background:'#f0fdf4', padding:'9px 12px', borderRadius:8, marginBottom:10, fontWeight:600 }}>
            ✓ 보고 완료!
          </div>
        )}
        <Btn onClick={submit} disabled={submitting} style={{ width:'100%', padding:13, fontSize:15 }}>
          {submitting ? '저장 중...' : '보고 제출'}
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
              <span style={{ fontWeight:700, color:navy, fontSize:15 }}>{r.site}</span>
              {r.time && <span style={{ fontFamily:'monospace', fontSize:13, color:muted }}>{r.time}</span>}
            </div>
            <div style={{ fontSize:13, color:textC, display:'flex', gap:14, flexWrap:'wrap', marginBottom:r.memo||r.photos?.length?6:0 }}>
              {r.cost        && <span>💰 {r.cost}</span>}
              {r.load        && <span>📦 {r.load}</span>}
              {r.car_number  && <span>🚛 {r.car_number}</span>}
              {r.quality     && <span>상성: {r.quality}</span>}
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
