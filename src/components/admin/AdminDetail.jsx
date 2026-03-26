import { useState, useRef } from 'react'
import Lightbox from '../common/Lightbox'
import { Badge, Btn, Card, Row, CopyAddress } from '../common/ui'
import { TimeEditRow } from '../common/TimeEdit'
import { getUsers } from '../../utils/users'
import { readFilesAsBase64, downloadAllPhotos, copyAllPhotosAsImage } from '../../utils/image'
import {
  navy, blue, green, amber, red, border, muted, textC, iStyle, getKSTToday
} from '../../constants/styles'

export default function AdminDetail({ schedule, onBack, onUpdate, drivers }) {
  const [lightbox, setLightbox]     = useState(null)
  const [lbSource, setLbSource]     = useState('schedule')
  const [editDriver, setEditDriver] = useState(false)
  const [driverId, setDriverId]     = useState(schedule.driver_id || '')
  const [editCoDriver, setEditCoDriver] = useState(false)
  const [coDriverId, setCoDriverId]     = useState(schedule.co_driver_id || '')
  const [pasteMsg, setPasteMsg]     = useState('')
  const spFileRef = useRef()
  const wpFileRef = useRef()
  const cpFileRef = useRef()
  const dropRef   = useRef()

  const [showBilling, setShowBilling] = useState(false)
  const [billingForm, setBillingForm] = useState({
    workers: schedule.billing_workers || (schedule.co_driver_id ? '2' : '1'),
    waste:   schedule.billing_waste   || schedule.final_waste || schedule.waste || '',
    amount:  schedule.billing_amount  ? String(schedule.billing_amount) : '',
    unit:    schedule.billing_unit    ? String(schedule.billing_unit)   : '',
    total:   schedule.billing_total   ? String(schedule.billing_total)  : '',
  })
  const [billCopied, setBillCopied] = useState(false)
  const [imgCopied, setImgCopied] = useState(false)
  const [billSaved,  setBillSaved]  = useState(false)
  const billUnitRef = useRef()
  const setBF = (k,v) => setBillingForm(p => {
    const next = {...p, [k]:v}
    const a = parseFloat(next.amount) || 0
    const u = parseFloat(next.unit)   || 0
    next.total = (a + u) > 0 ? String(Math.round((a + u) * 1.1 * 10) / 10) : ''
    return next
  })

  const [editInfo, setEditInfo] = useState(false)
  const [infoForm, setInfoForm] = useState({
    date:   schedule.date   || '',
    time:   schedule.time   || '',
    address:schedule.address|| '',
    waste:  schedule.waste  || '',
    cname:    schedule.cname    || '',
    cphone:   schedule.cphone   || '',
    door_pw:  schedule.door_pw  || '',
    unit_pw:  schedule.unit_pw  || '',
    memo:     schedule.memo     || '',
  })
  const setIF = (k,v) => setInfoForm(p=>({...p,[k]:v}))
  const saveInfo = () => { onUpdate(infoForm); setEditInfo(false) }
  const cancelInfo = () => {
    setInfoForm({
      date:   schedule.date   || '',
      time:   schedule.time   || '',
      address:schedule.address|| '',
      waste:  schedule.waste  || '',
      cname:    schedule.cname    || '',
      cphone:   schedule.cphone   || '',
      door_pw:  schedule.door_pw  || '',
      unit_pw:  schedule.unit_pw  || '',
      memo:     schedule.memo     || '',
    })
    setEditInfo(false)
  }

  const schedulePhotos = schedule.schedule_photos || []
  const completePhotos = schedule.photos || []

  const saveDriver = () => { onUpdate({ driver_id: driverId||null }); setEditDriver(false) }

  const appendSchedulePhotos = async newDataUrls => {
    if (!newDataUrls.length) return
    onUpdate({ schedule_photos: [...(schedule.schedule_photos||[]), ...newDataUrls] })
  }

  const addSchedulePhotos = async e => {
    const urls = await readFilesAsBase64(e.target.files)
    await appendSchedulePhotos(urls)
    e.target.value = ''
  }

  const removeSchedulePhoto = idx =>
    onUpdate({ schedule_photos: (schedule.schedule_photos||[]).filter((_,i)=>i!==idx) })

  const addWorkPhotos = async e => {
    const urls = await readFilesAsBase64(e.target.files)
    onUpdate({ work_photos: [...(schedule.work_photos||[]), ...urls] })
    e.target.value = ''
  }
  const removeWorkPhoto = idx =>
    onUpdate({ work_photos: (schedule.work_photos||[]).filter((_,i)=>i!==idx) })

  const addCompletePhotos = async e => {
    const urls = await readFilesAsBase64(e.target.files)
    onUpdate({ photos: [...(schedule.photos||[]), ...urls] })
    e.target.value = ''
  }
  const removeCompletePhoto = idx =>
    onUpdate({ photos: (schedule.photos||[]).filter((_,i)=>i!==idx) })

  const handlePagePaste = async e => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItems = items.filter(it => it.type.startsWith('image/'))
    if (!imageItems.length) return
    e.preventDefault()
    const files = imageItems.map(it => it.getAsFile()).filter(Boolean)
    const urls = await readFilesAsBase64(files)
    await appendSchedulePhotos(urls)
    setPasteMsg(`📋 ${urls.length}장 붙여넣기 완료`)
    setTimeout(() => setPasteMsg(''), 2500)
  }

  const handleDrop = async e => {
    e.preventDefault()
    dropRef.current?.classList.remove('drag-over')
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    const urls = await readFilesAsBase64(files)
    await appendSchedulePhotos(urls)
  }
  const handleDragOver = e => { e.preventDefault(); dropRef.current?.classList.add('drag-over') }
  const handleDragLeave = () => dropRef.current?.classList.remove('drag-over')

  const allWorkPhotos = [...(schedule.work_photos||[]), ...completePhotos]
  const workLen = (schedule.work_photos||[]).length

  const openLightbox = (src, idx) => { setLbSource(src); setLightbox(idx) }
  const lbPhotos = lbSource==='schedule' ? schedulePhotos : lbSource==='billing' ? allWorkPhotos : allWorkPhotos

  const users = getUsers()

  return (
    <div onPaste={handlePagePaste} style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <style>{`.drag-over{border-color:${blue}!important;background:#eff6ff!important}`}</style>
      <div style={{ background:navy, color:'#fff', padding:'14px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:0, lineHeight:1 }}>←</button>
        <div style={{ flex:1, fontSize:16, fontWeight:700 }}>일정 상세 (관리자)</div>
        <Badge status={schedule.status}/>
      </div>

      <div style={{ padding:20, maxWidth:640, margin:'0 auto' }}>

        {/* 기사 배치 */}
        <div style={{ background:schedule.driver_id?'#f0fdf4':'#fef2f2', border:`1.5px solid ${schedule.driver_id?'#86efac':'#fca5a5'}`, borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:10, color:schedule.driver_id?green:red }}>
            {schedule.driver_id?'✓ 담당 기사':'⚠ 기사 미배치'}
          </div>
          {editDriver ? (
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <select value={driverId} onChange={e=>setDriverId(e.target.value)} style={{ ...iStyle, flex:1, margin:0 }}>
                <option value="">— 기사 선택 —</option>
                {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <Btn onClick={saveDriver} style={{ padding:'9px 16px', fontSize:13 }}>저장</Btn>
              <Btn onClick={()=>{ setEditDriver(false); setDriverId(schedule.driver_id||'') }} outline color={muted} style={{ padding:'9px 12px', fontSize:13 }}>취소</Btn>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                {schedule.driver_id
                  ? <><span style={{ fontSize:16, fontWeight:700, color:textC }}>{users.find(u=>u.id===schedule.driver_id)?.name}</span>
                      <span style={{ fontSize:13, color:muted, marginLeft:10 }}>{users.find(u=>u.id===schedule.driver_id)?.phone}</span></>
                  : <span style={{ fontSize:14, color:red }}>배치된 기사가 없습니다</span>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {schedule.driver_id && users.find(u=>u.id===schedule.driver_id)?.phone && (
                  <a href={`tel:${users.find(u=>u.id===schedule.driver_id)?.phone}`} style={{ textDecoration:'none' }}>
                    <button style={{ background:green, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      📞 전화
                    </button>
                  </a>
                )}
                <Btn onClick={()=>setEditDriver(true)} outline color={blue} style={{ padding:'7px 14px', fontSize:12 }}>
                  {schedule.driver_id?'변경':'배치'}
                </Btn>
              </div>
            </div>
          )}

          {/* 보조기사 */}
          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${schedule.driver_id?'#86efac':'#fca5a5'}` }}>
            <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:8 }}>보조기사 (2인 현장)</div>
            {editCoDriver ? (
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <select value={coDriverId} onChange={e=>setCoDriverId(e.target.value)} style={{ ...iStyle, flex:1, margin:0 }}>
                  <option value="">— 없음 (1인 현장) —</option>
                  {drivers.filter(d=>d.id!==schedule.driver_id).map(d=>(
                    <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                  ))}
                </select>
                <Btn onClick={()=>{ onUpdate({ co_driver_id: coDriverId||null }); setEditCoDriver(false) }} style={{ padding:'9px 16px', fontSize:13 }}>저장</Btn>
                <Btn onClick={()=>{ setEditCoDriver(false); setCoDriverId(schedule.co_driver_id||'') }} outline color={muted} style={{ padding:'9px 12px', fontSize:13 }}>취소</Btn>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  {schedule.co_driver_id
                    ? <><span style={{ fontSize:15, fontWeight:600, color:textC }}>{users.find(u=>u.id===schedule.co_driver_id)?.name}</span>
                        <span style={{ fontSize:12, color:muted, marginLeft:8 }}>{users.find(u=>u.id===schedule.co_driver_id)?.phone}</span>
                        <span style={{ marginLeft:8, fontSize:11, background:'#dbeafe', color:blue, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>2인 현장</span></>
                    : <span style={{ fontSize:13, color:muted }}>없음 (1인 현장)</span>}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {schedule.co_driver_id && users.find(u=>u.id===schedule.co_driver_id)?.phone && (
                    <a href={`tel:${users.find(u=>u.id===schedule.co_driver_id)?.phone}`} style={{ textDecoration:'none' }}>
                      <button style={{ background:green, color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        📞 전화
                      </button>
                    </a>
                  )}
                  <button onClick={()=>setEditCoDriver(true)}
                    style={{ background:'none', border:`1px solid ${border}`, borderRadius:7, padding:'6px 12px', fontSize:12, color:muted, cursor:'pointer' }}>
                    {schedule.co_driver_id ? '변경' : '+ 배정'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 기본 정보 */}
        <Card style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase' }}>현장 정보</div>
            {!editInfo
              ? <button onClick={()=>setEditInfo(true)}
                  style={{ background:'none', border:`1px solid ${border}`, borderRadius:7, padding:'5px 12px', fontSize:12, color:muted, cursor:'pointer' }}>
                  ✏️ 수정
                </button>
              : <div style={{ display:'flex', gap:8 }}>
                  <button onClick={cancelInfo}
                    style={{ background:'none', border:`1px solid ${border}`, borderRadius:7, padding:'5px 12px', fontSize:12, color:muted, cursor:'pointer' }}>
                    취소
                  </button>
                  <button onClick={saveInfo}
                    style={{ background:blue, color:'#fff', border:'none', borderRadius:7, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    저장
                  </button>
                </div>
            }
          </div>
          {editInfo ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>날짜</div>
                  <input type="date" value={infoForm.date} onChange={e=>setIF('date',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>시간</div>
                  <div style={{ display:'flex', gap:4, marginBottom:5 }}>
                    {['오전중','오후중','당일중'].map(v=>(
                      <button key={v} type="button" onClick={()=>setIF('time',v)}
                        style={{ flex:1, padding:'5px 2px', fontSize:11, borderRadius:6, border:`1px solid ${infoForm.time===v?blue:border}`, background:infoForm.time===v?blue:'#fff', color:infoForm.time===v?'#fff':textC, cursor:'pointer', fontWeight:infoForm.time===v?700:400 }}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <input type="time"
                    value={['오전중','오후중','당일중'].includes(infoForm.time) ? '' : infoForm.time}
                    onChange={e=>setIF('time',e.target.value)}
                    style={{ ...iStyle, fontSize:13 }}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>주소</div>
                <input value={infoForm.address} onChange={e=>setIF('address',e.target.value)} placeholder="현장 주소" style={{ ...iStyle, fontSize:13 }}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>폐기물량</div>
                <input value={infoForm.waste} onChange={e=>setIF('waste',e.target.value)} placeholder="예: 2톤" style={{ ...iStyle, fontSize:13 }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>현장 담당자</div>
                  <input value={infoForm.cname} onChange={e=>setIF('cname',e.target.value)} placeholder="담당자 이름" style={{ ...iStyle, fontSize:13 }}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>연락처</div>
                  <input value={infoForm.cphone} onChange={e=>setIF('cphone',e.target.value)} placeholder="010-0000-0000" style={{ ...iStyle, fontSize:13 }}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>공동 비밀번호</div>
                  <input value={infoForm.door_pw} onChange={e=>setIF('door_pw',e.target.value)} placeholder="공동현관 비번" style={{ ...iStyle, fontSize:13 }}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>세대 비밀번호</div>
                  <input value={infoForm.unit_pw} onChange={e=>setIF('unit_pw',e.target.value)} placeholder="세대 비번" style={{ ...iStyle, fontSize:13 }}/>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>메모</div>
                <input value={infoForm.memo} onChange={e=>setIF('memo',e.target.value)} placeholder="관리자 메모 (선택)" style={{ ...iStyle, fontSize:13 }}/>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:12 }}><CopyAddress address={schedule.address}/></div>
              <Row label="날짜 · 시간" value={`${schedule.date}  ${schedule.time}`}/>
              <Row label="폐기물량"     value={schedule.waste}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${border}`, fontSize:14 }}>
                <span style={{ color:muted, fontSize:13 }}>현장 담당자</span>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontWeight:500, color:textC }}>{schedule.cname}  {schedule.cphone}</span>
                  {schedule.cphone && (
                    <a href={`tel:${schedule.cphone}`} style={{ textDecoration:'none' }}>
                      <button style={{ background:green, color:'#fff', border:'none', borderRadius:7, padding:'4px 12px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                        📞 전화
                      </button>
                    </a>
                  )}
                </div>
              </div>
              {schedule.door_pw && <Row label="공동 비밀번호" value={schedule.door_pw}/>}
              {schedule.unit_pw && <Row label="세대 비밀번호" value={schedule.unit_pw}/>}
              {schedule.memo && <Row label="관리자 메모" value={schedule.memo}/>}
            </>
          )}
        </Card>

        {/* 일정 사진 */}
        <Card style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:textC }}>일정 사진</div>
              <div style={{ fontSize:12, color:muted, marginTop:2 }}>현장 참고용 · 기사 앱에도 표시</div>
            </div>
            <button onClick={()=>spFileRef.current?.click()}
              style={{ background:blue, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              + 사진 추가
            </button>
            <input ref={spFileRef} type="file" accept="image/*" multiple onChange={addSchedulePhotos} style={{ display:'none' }}/>
          </div>

          {pasteMsg && (
            <div style={{ background:'#dcfce7', border:`1px solid #86efac`, borderRadius:8, padding:'7px 12px', marginBottom:8, fontSize:13, color:'#166534', fontWeight:500 }}>
              {pasteMsg}
            </div>
          )}

          <div ref={dropRef}
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            onClick={schedulePhotos.length===0 ? ()=>spFileRef.current?.click() : undefined}
            style={{
              border: `2px dashed ${schedulePhotos.length>0 ? border : '#93c5fd'}`,
              borderRadius:10,
              background: schedulePhotos.length>0 ? 'transparent' : '#f0f9ff',
              cursor: schedulePhotos.length===0 ? 'pointer' : 'default',
              transition:'all .15s'
            }}>
            {schedulePhotos.length > 0 ? (
              <div style={{ padding:'8px 0 0' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:6 }}>
                  {schedulePhotos.map((src,i)=>(
                    <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                      <img src={src} alt={`일정사진${i+1}`} onClick={()=>openLightbox('schedule',i)}
                        style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer', transition:'transform .15s' }}
                        onMouseEnter={e=>e.target.style.transform='scale(1.04)'}
                        onMouseLeave={e=>e.target.style.transform='scale(1)'}/>
                      <button onClick={()=>removeSchedulePhoto(i)}
                        style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.6)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                      <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                    </div>
                  ))}
                  <div onClick={()=>spFileRef.current?.click()}
                    style={{ aspectRatio:'1', border:`2px dashed ${border}`, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#f8fafc' }}>
                    <div style={{ fontSize:20, color:muted }}>+</div>
                    <div style={{ fontSize:11, color:muted }}>추가</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:muted, textAlign:'center', paddingBottom:6 }}>
                  Ctrl+V 붙여넣기 · 드래그 추가 · 카카오톡 이미지 복사 후 Ctrl+V 가능
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:18 }}>
                <div style={{ fontSize:26, marginBottom:6 }}>📎</div>
                <div style={{ fontSize:14, color:'#1d4ed8', fontWeight:600, marginBottom:4 }}>사진 추가하기</div>
                <div style={{ fontSize:12, color:muted, lineHeight:1.8 }}>
                  클릭 · 드래그앤드롭 · Ctrl+V 붙여넣기<br/>
                  <span style={{ color:'#059669' }}>카카오톡에서 이미지 복사 → 이 화면에서 Ctrl+V</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 업무 기록 */}
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase', marginBottom:10 }}>업무 기록</div>

          <TimeEditRow label="출발" value={schedule.depart_time} color={blue}
            onSave={v=>onUpdate({ depart_time:v||null })}/>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${border}`, fontSize:14, gap:8 }}>
            <span style={{ color:muted, fontSize:13, flexShrink:0 }}>도착 예상 · 문자</span>
            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
              <span style={{ fontWeight:500, color:schedule.eta?blue:muted, fontFamily:'monospace' }}>
                {schedule.eta||'미입력'}
              </span>
              {schedule.sms_sent
                ? <span style={{ fontSize:11, background:'#dcfce7', color:green, padding:'2px 7px', borderRadius:4, fontWeight:600, whiteSpace:'nowrap' }}>💬 발송됨</span>
                : <span style={{ fontSize:11, background:'#f1f5f9', color:muted, padding:'2px 7px', borderRadius:4, whiteSpace:'nowrap' }}>미발송</span>
              }
            </div>
          </div>

          <TimeEditRow label="작업 시작" value={schedule.start_time} color={green}
            onSave={v=>onUpdate({ start_time:v||null })}/>

          {(schedule.est_waste||schedule.est_duration) && (
            <Row label="예상 물량·시간"
              value={[schedule.est_waste, schedule.est_duration].filter(Boolean).join('  ·  ')}
              valueColor={amber}/>
          )}

          <TimeEditRow label="업무 완료" value={schedule.end_time} color={green}
            onSave={v=>onUpdate({ end_time:v||null })}/>

          {schedule.final_waste && (
            <Row label="최종 물량" value={schedule.final_waste} valueColor={amber}/>
          )}

          {schedule.start_time && schedule.end_time && (() => {
            const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m }
            const diff = toMin(schedule.end_time) - toMin(schedule.start_time)
            if (diff <= 0) return null
            const h = Math.floor(diff/60), m = diff%60
            const total = h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`
            return (
              <div style={{ padding:'8px 0 4px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
                  <span style={{ color:muted }}>작업 시간</span>
                  <span style={{ fontWeight:600, color:blue }}>
                    {schedule.start_time} ~ {schedule.end_time}
                    <span style={{ marginLeft:8, background:'#dbeafe', color:blue, fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700 }}>
                      총 {total}
                    </span>
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                  <button onClick={()=>setShowBilling(true)}
                    style={{ background:schedule.billing_total?green:navy, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                    {schedule.billing_total ? `✓ 청구 완료 (${schedule.billing_total}만원)` : '💰 청구서 작성'}
                  </button>
                </div>
              </div>
            )
          })()}
        </Card>

        {schedule.driver_note && (
          <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:amber, marginBottom:6 }}>📋 기사 특이사항</div>
            <div style={{ fontSize:13, color:textC, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{schedule.driver_note}</div>
          </div>
        )}

        {/* 작업 시작 사진 */}
        {(() => {
          const workPics = schedule.work_photos || []
          if (workPics.length === 0 && !schedule.start_time) return null
          return (
            <Card style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:700, color:textC }}>
                  📍 작업 시작 사진
                  <span style={{ fontSize:12, color:muted, marginLeft:6, fontWeight:400 }}>{workPics.length}장</span>
                </div>
                <button onClick={()=>wpFileRef.current?.click()}
                  style={{ background:amber, color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  + 추가
                </button>
                <input ref={wpFileRef} type="file" accept="image/*" multiple onChange={addWorkPhotos} style={{ display:'none' }}/>
              </div>
              {workPics.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {workPics.map((src,i)=>(
                    <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                      <img src={src} alt={`현장${i+1}`} onClick={()=>openLightbox('allwork',i)}
                        style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                      <button onClick={()=>removeWorkPhoto(i)}
                        style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.6)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                      <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'14px 0', color:muted, fontSize:13 }}>사진 없음</div>
              )}
            </Card>
          )
        })()}

        {/* 작업 완료 사진 */}
        {(() => {
          if (completePhotos.length === 0 && schedule.status !== '완료') return null
          return (
            <Card style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:700, color:textC }}>
                  ✅ 작업 완료 사진
                  <span style={{ fontSize:12, color:muted, marginLeft:6, fontWeight:400 }}>{completePhotos.length}장</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {((schedule.work_photos||[]).length > 0 || completePhotos.length > 0) && (<>
                    <button onClick={()=>{
                      const driverName = users.find(u=>u.id===schedule.driver_id)?.name || '미배치'
                      const siteName = [schedule.address?.slice(0,20), schedule.cname].filter(Boolean).join('_')
                      downloadAllPhotos([...(schedule.work_photos||[]), ...completePhotos], '전체사진', [driverName, siteName])
                    }}
                      style={{ background:'#f1f5f9', color:muted, border:`1px solid ${border}`, borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      ⬇ 전체 다운로드
                    </button>
                    <button onClick={async ()=>{
                      const ok = await copyAllPhotosAsImage([...(schedule.work_photos||[]), ...completePhotos])
                      if (ok) { setImgCopied(true); setTimeout(()=>setImgCopied(false), 2000) }
                    }}
                      style={{ background: imgCopied ? '#dcfce7' : '#f1f5f9', color: imgCopied ? green : muted, border:`1px solid ${imgCopied ? '#86efac' : border}`, borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
                      {imgCopied ? '✓ 복사됨' : '🖼 이미지 복사'}
                    </button>
                  </>)}
                  <button onClick={()=>cpFileRef.current?.click()}
                    style={{ background:green, color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    + 추가
                  </button>
                </div>
                <input ref={cpFileRef} type="file" accept="image/*" multiple onChange={addCompletePhotos} style={{ display:'none' }}/>
              </div>
              {completePhotos.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {completePhotos.map((src,i)=>(
                    <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                      <img src={src} alt={`완료${i+1}`} onClick={()=>openLightbox('allwork', workLen + i)}
                        style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                      <button onClick={()=>removeCompletePhoto(i)}
                        style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.6)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                      <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'14px 0', color:muted, fontSize:13 }}>사진 없음</div>
              )}
            </Card>
          )
        })()}
      </div>

      {/* 청구서 작성 모달 */}
      {showBilling && (() => {
        const toMin = t => { if(!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m }
        const diff = toMin(schedule.end_time) - toMin(schedule.start_time)
        const h = Math.floor(diff/60), m = diff%60
        const duration = diff > 0 ? (h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`) : ''
        const workTime = (schedule.start_time && schedule.end_time && duration)
          ? `${schedule.start_time} ~ ${schedule.end_time} (${duration})`
          : duration

        const companyName = (schedule.cname || '').replace(/\(.*?\)/g, '').trim()
        const wasteAmt = billingForm.waste

        const buildText = () =>
`[FN퍼니 작업보고]
작업날짜: ${schedule.date}
업체명: ${companyName}
작업인원: ${billingForm.workers}인
현장주소: ${schedule.address}
작업시간: ${workTime}
성상: 혼합
폐기물양: ${wasteAmt}
특이사항: ${schedule.driver_note || '없음'}

<청구금액>
${wasteAmt} > ${billingForm.amount}만원
${billingForm.workers}인 *${duration} > ${billingForm.unit}만원
${billingForm.total}만원 (부가세 포함)
*청구내역이나 업무관련 의견 편하게 말씀해주세요 적극 재검토 하겠습니다^^
기업 351-112230-01-015 주식회사 퍼니환경개발`

        const copy = () => {
          navigator.clipboard.writeText(buildText()).then(() => {
            setBillCopied(true)
            setTimeout(() => setBillCopied(false), 2000)
          })
        }

        const saveBilling = () => {
          onUpdate({
            billing_workers: billingForm.workers,
            billing_waste:   billingForm.waste,
            billing_amount:  parseFloat(billingForm.amount) || 0,
            billing_unit:    parseFloat(billingForm.unit)   || 0,
            billing_total:   parseFloat(billingForm.total)  || 0,
            billing_date:    getKSTToday(),
          })
          setBillSaved(true)
          setTimeout(() => setBillSaved(false), 2000)
        }

        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
            <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:440, maxHeight:'90vh', overflowY:'auto' }}>

              <div style={{ padding:'16px 20px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
                <div style={{ fontSize:17, fontWeight:700, color:navy }}>💰 청구서 작성</div>
                <button onClick={()=>setShowBilling(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
              </div>

              <div style={{ padding:'16px 20px' }}>

                {((schedule.work_photos||[]).length > 0 || completePhotos.length > 0) && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:15, fontWeight:600, color:muted, marginBottom:8 }}>전체 작업사진</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
                      {allWorkPhotos.map((p,i) => (
                        <img key={i} src={p} onClick={()=>openLightbox('billing',i)}
                          style={{ width:'100%', aspectRatio:'1', objectFit:'cover', borderRadius:6, cursor:'pointer' }}/>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>

                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>작업인원</div>
                    <div style={{ display:'flex', gap:8 }}>
                      {['1','2','3','4'].map(n=>(
                        <button key={n} onClick={()=>setBF('workers',n)}
                          style={{ flex:1, padding:'10px 0', borderRadius:8, border:`1.5px solid ${billingForm.workers===n?navy:border}`, background:billingForm.workers===n?navy:'#f8fafc', color:billingForm.workers===n?'#fff':muted, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                          {n}인
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>폐기물 양</div>
                      <input value={billingForm.waste} onChange={e=>setBillingForm(p=>({...p, waste:e.target.value}))}
                        placeholder="예) 1톤" style={{ ...iStyle, fontSize:15, fontWeight:700, width:'100%' }}/>
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>폐기물 청구금액</div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <input type="number" value={billingForm.amount} onChange={e=>setBF('amount',e.target.value)}
                          onKeyDown={e=>{ if(e.key==='Enter') billUnitRef.current?.focus() }}
                          placeholder="금액" style={{ ...iStyle, fontSize:15, fontWeight:700, textAlign:'right', flex:1 }}/>
                        <span style={{ fontSize:14, color:muted, whiteSpace:'nowrap' }}>만원</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>
                      {billingForm.workers}인 금액
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input ref={billUnitRef} type="number" value={billingForm.unit} onChange={e=>setBF('unit',e.target.value)}
                        placeholder="금액 입력" style={{ ...iStyle, fontSize:15, fontWeight:700, textAlign:'right', flex:1 }}/>
                      <span style={{ fontSize:16, color:muted, whiteSpace:'nowrap' }}>만원</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>합계 (부가세 포함)
                      <span style={{ fontWeight:400, color:'#94a3b8', marginLeft:6 }}>자동 계산됨</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input type="number" value={billingForm.total}
                        onChange={e=>setBillingForm(p=>({...p, total:e.target.value}))}
                        placeholder="자동 합산" style={{ ...iStyle, fontSize:14, fontWeight:700, textAlign:'right', flex:1, borderColor: billingForm.total ? navy : undefined }}/>
                      <span style={{ fontSize:16, color:muted, whiteSpace:'nowrap' }}>만원</span>
                    </div>
                  </div>
                </div>

                <div style={{ background:'#eff6ff', border:`1px solid #bfdbfe`, borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:14, fontFamily:'monospace', lineHeight:2 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:navy, marginBottom:2 }}>&lt;청구금액&gt;</div>
                  <div style={{ color:textC }}>{wasteAmt || '__'} &gt; {billingForm.amount||'__'}만원</div>
                  <div style={{ color:textC }}>{billingForm.workers}인 *{duration||'__'} &gt; {billingForm.unit||'__'}만원</div>
                  <div style={{ color:textC, fontWeight:700 }}>{billingForm.total||'__'}만원 (부가세 포함)</div>
                  <div style={{ color:muted, fontSize:13, marginTop:4, lineHeight:1.7 }}>*청구내역이나 업무관련 의견 편하게 말씀해주세요 적극 재검토 하겠습니다^^</div>
                  <div style={{ color:navy, fontSize:13, fontWeight:600 }}>기업 351-112230-01-015 주식회사 퍼니환경개발</div>
                </div>

                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <Btn onClick={()=>setShowBilling(false)} outline color={muted} style={{ flex:1, fontSize:14 }}>닫기</Btn>
                  <Btn onClick={copy} color={billCopied?green:navy} outline style={{ flex:2, fontSize:14 }}>
                    {billCopied ? '✓ 복사됨!' : '📋 복사'}
                  </Btn>
                </div>
                <Btn onClick={saveBilling} color={billSaved?green:navy} style={{ width:'100%', fontSize:15, fontWeight:700 }}>
                  {billSaved ? '✓ 저장됨!' : '💾 청구 내역 저장'}
                </Btn>
              </div>
            </div>
          </div>
        )
      })()}

      {lightbox!==null && <Lightbox photos={lbPhotos} index={lightbox} onClose={()=>setLightbox(null)}/>}
    </div>
  )
}
