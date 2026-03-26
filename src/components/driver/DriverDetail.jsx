import { useState, useRef, Fragment } from 'react'
import Lightbox from '../common/Lightbox'
import SlidePhotoViewer from '../common/SlidePhotoViewer'
import { Badge, Btn, Card, Row, CopyAddress } from '../common/ui'
import { EtaInlineEdit, DriverTimeEdit, EtaModalInput } from '../common/TimeEdit'
import { navy, blue, green, amber, red, border, muted, textC, iStyle, nowTime } from '../../constants/styles'
import { resizeImage, downloadAllPhotos } from '../../utils/image'
import { getUsers } from '../../utils/users'

export default function DriverDetail({ schedule, onUpdate, onBack }) {
  const fileRef     = useRef()
  const workFileRef = useRef()

  const [photos,      setPhotos]      = useState(schedule.photos      || [])
  const [driverNote,  setDriverNote]  = useState(schedule.driver_note || '')
  const [editingDone, setEditingDone] = useState(false)

  const prevStatusRef = useRef(schedule.status)
  if (prevStatusRef.current !== schedule.status) {
    prevStatusRef.current = schedule.status
    setPhotos(schedule.photos || [])
    setDriverNote(schedule.driver_note || '')
    setEditingDone(false)
  }

  const [lightbox,  setLightbox]  = useState(null)
  const [lbSource,  setLbSource]  = useState('schedule_ref')

  const [showDepartModal, setDepartModal] = useState(false)
  const [eta,        setEta]       = useState('')
  const [smsPreview, setSmsPreview] = useState('')

  const [showWorkModal, setWorkModal] = useState(false)
  const [estWaste,    setEstWaste]    = useState('')
  const [estDuration, setEstDuration] = useState('')
  const [sitePhotos,  setSitePhotos]  = useState([])
  const sitePhotoRef = useRef()

  const [showResendModal, setResendModal] = useState(false)

  const [showCancelDepart,  setShowCancelDepart]  = useState(false)
  const [showCancelStart,   setShowCancelStart]   = useState(false)
  const [showCancelEnd,     setShowCancelEnd]      = useState(false)

  const openLb = (src, idx) => { setLbSource(src); setLightbox(idx) }

  const buildSms = (etaVal) =>
    `[배차알림] 안녕하세요, ${schedule.cname}님.\n폐기물 수거 차량이 출발했습니다.\n\n📍 현장: ${schedule.address}\n🕐 도착 예정: ${etaVal}\n\n문의: ${getUsers().find(u=>u.id===schedule.driver_id)?.phone||''}`

  // 날짜 "2026-03-20" → "3월20일 (금)"
  const fmtDateKo = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['일','월','화','수','목','금','토']
    return `${d.getMonth()+1}월${d.getDate()}일 (${days[d.getDay()]})`
  }

  // 출발 보고 복사
  const copyDepartReport = (etaVal) => {
    const hasPhoto = (schedule.schedule_photos||[]).length > 0
    const lines = [
      schedule.cname,
      `${fmtDateKo(schedule.date)} ${schedule.time||''}`.trim(),
      schedule.address,
      hasPhoto ? '사진첨부' : '',
      schedule.cphone,
      '',
      etaVal,
      '통화완료',
    ].filter(l => l !== undefined)
    navigator.clipboard.writeText(lines.join('\n'))
  }

  // 작업 종료 보고 복사
  const copyDoneReport = () => {
    const shortDate = schedule.date ? schedule.date.slice(2).replace(/-0?/g, '.').replace(/^\./, '') : ''
    const driver = getUsers().find(u => u.id === schedule.driver_id)
    const coDriver = getUsers().find(u => u.id === schedule.co_driver_id)
    const workerCount = coDriver ? '2인' : '1인'
    const driverName = driver?.name || ''
    let duration = ''
    if (schedule.start_time && schedule.end_time) {
      const toMin = t => { const [h, m] = t.split(':').map(Number); return h*60+m }
      const diff = toMin(schedule.end_time) - toMin(schedule.start_time)
      if (diff > 0) {
        const h = Math.floor(diff/60), m = diff%60
        duration = h > 0 ? (m > 0 ? `(${h}시간 ${m}분)` : `(${h}시간)`) : `(${m}분)`
      }
    }
    const lines = [
      '[FN퍼니 작업보고]',
      `작업날짜: ${shortDate}`,
      `업체명: ${schedule.cname||''}`,
      `작업인원: ${workerCount} ${driverName}`,
      `현장주소: ${schedule.address||''}`,
      `작업시간: ${schedule.start_time||''} - ${schedule.end_time||''} ${duration}`.trim(),
      `성상: 혼합`,
      `폐기물양: ${schedule.final_waste||schedule.waste||''}`,
      `특이사항: ${schedule.driver_note||''}`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const openDepartModal = () => {
    const d = new Date()
    const m = d.getMinutes()
    d.setMinutes(m < 30 ? 30 : 0); if (m >= 30) d.setHours(d.getHours() + 1)
    const etaDef = d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})
    setEta(etaDef)
    setSmsPreview(buildSms(etaDef))
    setDepartModal(true)
  }

  const openSms = (phone, message) => {
    if (phone) window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`
  }

  const confirmDepart = () => {
    onUpdate({ status:'이동중', depart_time: nowTime(), eta, sms_sent: true })
    setDepartModal(false)
    openSms(schedule.cphone, smsPreview)
  }

  const openWorkModal = () => {
    setEstWaste('')
    setEstDuration('')
    setSitePhotos([])
    setWorkModal(true)
  }

  const confirmWork = () => {
    onUpdate({
      status:'진행중',
      start_time: nowTime(),
      est_waste: estWaste,
      est_duration: estDuration,
      ...(sitePhotos.length > 0 ? { work_photos: [...(schedule.work_photos||[]), ...sitePhotos] } : {})
    })
    setWorkModal(false)
  }

  const addSitePhotos = async e => {
    const files = Array.from(e.target.files)
    for (const f of files) {
      const resized = await resizeImage(f)
      setSitePhotos(prev => [...prev, resized])
    }
    e.target.value = ''
  }

  const openResendModal = () => {
    const d = new Date(); d.setMinutes(d.getMinutes() + 30)
    const m = d.getMinutes()
    d.setMinutes(m < 30 ? 30 : 0); if (m >= 30) d.setHours(d.getHours() + 1)
    const etaDef = schedule.eta || d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})
    setEta(etaDef)
    setSmsPreview(buildSms(etaDef))
    setResendModal(true)
  }
  const confirmResend = () => {
    onUpdate({ eta, sms_sent: true })
    setResendModal(false)
    openSms(schedule.cphone, smsPreview)
  }

  const cancelDepart = () => {
    onUpdate({ status:'대기', depart_time:null, eta:null, sms_sent:false })
    setShowCancelDepart(false)
  }
  const cancelStart = () => {
    onUpdate({ status:'이동중', start_time:null, est_waste:'', est_duration:'' })
    setShowCancelStart(false)
  }
  const cancelEnd = () => {
    onUpdate({ status:'진행중', end_time:null })
    setShowCancelEnd(false)
  }

  const [finalWaste, setFinalWaste]             = useState(schedule.final_waste || '')
  const [showFinalWasteModal, setFinalWasteModal] = useState(false)

  const addPhotos = async e => {
    const files = Array.from(e.target.files)
    for (const f of files) {
      try {
        const resized = await resizeImage(f)
        setPhotos(prev => [...prev, resized])
      } catch (err) {}
    }
    e.target.value = ''
  }
  const removePhoto = idx => setPhotos(prev => prev.filter((_,i)=>i!==idx))

  const addWorkPhotos = async e => {
    const files = Array.from(e.target.files)
    const newUrls = []
    for (const f of files) {
      try { newUrls.push(await resizeImage(f)) } catch (err) {}
    }
    onUpdate({ work_photos: [...(schedule.work_photos||[]), ...newUrls] })
    e.target.value = ''
  }
  const removeWorkPhoto = idx =>
    onUpdate({ work_photos: (schedule.work_photos||[]).filter((_,i)=>i!==idx) })

  const handlePaste = async e => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItems = items.filter(it => it.type.startsWith('image/'))
    if (!imageItems.length) return
    e.preventDefault()
    for (const item of imageItems) {
      const file = item.getAsFile()
      if (file) {
        const resized = await resizeImage(file)
        setPhotos(prev => [...prev, resized])
      }
    }
  }
  const handleDone = () => { onUpdate({ status:'완료', end_time:nowTime(), photos, driver_note:driverNote, final_waste:finalWaste }) }
  const saveEdit   = () => { onUpdate({ photos, driver_note:driverNote, final_waste:finalWaste }); setEditingDone(false) }

  const isReady    = schedule.status === '대기'
  const isMoving   = schedule.status === '이동중'
  const isWorking  = schedule.status === '진행중'
  const isDone     = schedule.status === '완료'

  const displayPhotos = (isDone && !editingDone) ? (schedule.photos||[]) : photos
  const lbPhotos = lbSource==='schedule_ref' ? (schedule.schedule_photos||[]) : lbSource==='work' ? (schedule.work_photos||[]) : displayPhotos

  return (
    <div onPaste={handlePaste} style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:navy, color:'#fff', padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:'#fff', fontSize:26, cursor:'pointer', padding:0, lineHeight:1 }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:700 }}>일정 상세</div>
        </div>
        <Badge status={schedule.status}/>
      </div>

      <div style={{ padding:16, maxWidth:520, margin:'0 auto' }}>

        <Card style={{ marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>현장 정보</div>
          <Row label="예정 시간"   value={`${schedule.date}  ${schedule.time}`}/>
          <Row label="폐기물량"    value={schedule.waste}/>
          <Row label="현장 담당자" value={schedule.cname}/>
          <Row label="연락처"      value={schedule.cphone}/>
          {schedule.door_pw && <Row label="공동 비밀번호" value={schedule.door_pw}/>}
          {schedule.unit_pw && <Row label="세대 비밀번호" value={schedule.unit_pw}/>}
          {schedule.memo && <Row label="메모" value={schedule.memo}/>}
          <div style={{ margin:'14px 0' }}><CopyAddress address={schedule.address}/></div>
          <a href={`tel:${schedule.cphone}`} style={{ textDecoration:'none', display:'block' }}>
            <div style={{ background:green, color:'#fff', borderRadius:10, padding:16, textAlign:'center', fontWeight:700, fontSize:18 }}>
              📞 {schedule.cname}에게 전화
            </div>
          </a>
        </Card>

        {(schedule.schedule_photos||[]).length > 0 && (
          <Card style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
              📎 현장 참고 사진 ({schedule.schedule_photos.length}장)
            </div>
            <SlidePhotoViewer
              photos={schedule.schedule_photos}
              onOpen={i => openLb('schedule_ref', i)}
            />
          </Card>
        )}

        <Card>
          <div style={{ fontSize:13, fontWeight:700, color:muted, letterSpacing:1, textTransform:'uppercase', marginBottom:16 }}>업무 기록</div>

          <div style={{ display:'flex', alignItems:'center', marginBottom:22, gap:4 }}>
            {[['대기','대기'],['이동중','이동중'],['진행중','진행중'],['완료','완료']].map(([s,l],i)=>{
              const order = ['대기','이동중','진행중','완료']
              const cur = order.indexOf(schedule.status)
              const done = i < cur
              const active = i === cur
              const dotColor = active ? blue : done ? green : border
              const textColor = active ? blue : done ? green : muted
              return (
                <Fragment key={s}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
                    <div style={{ width:16, height:16, borderRadius:'50%', background: done||active ? dotColor : '#f1f5f9', border:`2px solid ${dotColor}` }}/>
                    <div style={{ fontSize:13, fontWeight: active?700:400, color:textColor, whiteSpace:'nowrap' }}>{l}</div>
                  </div>
                  {i < 3 && <div style={{ flex:2, height:2, background: done ? green : border, marginBottom:20 }}/>}
                </Fragment>
              )
            })}
          </div>

          {/* STEP 1: 출발 */}
          <div style={{ borderBottom:`1px solid ${border}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0 6px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:textC, minWidth:22 }}>①</span>
                <span style={{ fontSize:15, fontWeight:700, color:textC }}>출발</span>
              </div>
              <div style={{ flexShrink:0 }}>
                {isReady && <Btn onClick={openDepartModal} color={blue} style={{ padding:'8px 16px', fontSize:14 }}>🚚 출발</Btn>}
                {(isMoving||isWorking||isDone) && schedule.depart_time && (
                  <button onClick={()=>setShowCancelDepart(true)}
                    style={{ background:'none', border:`1px solid ${border}`, borderRadius:8, padding:'7px 11px', fontSize:13, color:muted, cursor:'pointer' }}>
                    출발 취소
                  </button>
                )}
              </div>
            </div>
            <div style={{ paddingLeft:28, paddingBottom:10 }}>
              {schedule.depart_time
                ? <div style={{ fontSize:14, color:green, fontFamily:'monospace', marginBottom: (isMoving||isWorking||isDone) ? 8 : 0 }}>🚚 {schedule.depart_time} 출발</div>
                : <div style={{ fontSize:14, color:muted }}>현장으로 출발 시 클릭</div>}
              {(isMoving||isWorking||isDone) && (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, padding:'8px 12px', background:'#f0f9ff', borderRadius:8, border:`1px solid #bae6fd` }}>
                    <span style={{ fontSize:14, color:muted, whiteSpace:'nowrap' }}>🕐 도착 예상</span>
                    <EtaInlineEdit eta={schedule.eta} onSave={v=>onUpdate({ eta:v })}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:schedule.sms_sent?'#f0fdf4':'#f8fafc', borderRadius:8, border:`1px solid ${schedule.sms_sent?'#bbf7d0':border}` }}>
                    <span style={{ fontSize:15 }}>💬</span>
                    {schedule.sms_sent
                      ? <div style={{ flex:1, fontSize:14 }}><span style={{ fontWeight:700, color:green }}>문자 발송됨</span><span style={{ color:muted, marginLeft:8 }}>{schedule.cname}</span></div>
                      : <div style={{ flex:1, fontSize:14, color:muted }}>문자 미발송</div>
                    }
                    <button onClick={openResendModal}
                      style={{ background:schedule.sms_sent?'none':green, color:schedule.sms_sent?muted:'#fff', border:`1px solid ${schedule.sms_sent?border:green}`, borderRadius:7, padding:'7px 12px', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                      {schedule.sms_sent?'재발송':'💬 발송'}
                    </button>
                  </div>
                  <button onClick={()=>{ copyDepartReport(schedule.eta||''); alert('복사되었습니다') }}
                    style={{ marginTop:8, padding:'6px 12px', borderRadius:7, border:`1px solid #7c3aed`, background:'none', color:'#7c3aed', fontSize:15, fontWeight:600, cursor:'pointer' }}>
                    📋 출발 보고 복사
                  </button>
                </>
              )}
            </div>
          </div>

          {/* STEP 2: 작업 시작 */}
          <div style={{ borderBottom:`1px solid ${border}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0 6px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:textC, minWidth:22 }}>②</span>
                <span style={{ fontSize:15, fontWeight:700, color:textC }}>작업 시작</span>
              </div>
              <div style={{ flexShrink:0 }}>
                {isMoving && <Btn onClick={openWorkModal} color={amber} style={{ padding:'8px 16px', fontSize:14 }}>▶ 작업 시작</Btn>}
                {(isWorking||isDone) && schedule.start_time && (
                  <button onClick={()=>setShowCancelStart(true)}
                    style={{ background:'none', border:`1px solid ${border}`, borderRadius:8, padding:'7px 11px', fontSize:13, color:muted, cursor:'pointer' }}>
                    취소
                  </button>
                )}
              </div>
            </div>
            <div style={{ paddingLeft:28, paddingBottom:10 }}>
              {(isWorking||isDone) && schedule.start_time ? (
                <DriverTimeEdit label="시작" value={schedule.start_time} color={green} onSave={v=>onUpdate({ start_time:v||null })}/>
              ) : (
                <div style={{ fontSize:14, color:isMoving?blue:muted }}>
                  {isMoving ? '현장 도착 후 클릭' : '출발 후 활성화'}
                </div>
              )}
              {schedule.est_waste && (
                <div style={{ fontSize:14, color:muted, marginTop:4 }}>
                  예상물량 <b>{schedule.est_waste}</b>{schedule.est_duration?` · ${schedule.est_duration}`:''}
                </div>
              )}
              {(isWorking||isDone) && (
                <div style={{ marginTop:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:muted }}>
                      📍 현장 사진 ({(schedule.work_photos||[]).length}장)
                    </span>
                    <button onClick={()=>workFileRef.current?.click()}
                      style={{ background:amber, color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                      + 추가
                    </button>
                    <input ref={workFileRef} type="file" accept="image/*" multiple onChange={addWorkPhotos} style={{ display:'none' }}/>
                  </div>
                  {(schedule.work_photos||[]).length > 0 ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                      {schedule.work_photos.map((src,i)=>(
                        <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                          <img src={src} alt={`현장${i+1}`} onClick={()=>openLb('work',i)}
                            style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                          <button onClick={()=>removeWorkPhoto(i)}
                            style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                          <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div onClick={()=>workFileRef.current?.click()}
                      style={{ border:`2px dashed ${border}`, borderRadius:8, padding:12, textAlign:'center', cursor:'pointer', background:'#f8fafc' }}>
                      <div style={{ fontSize:13, color:muted }}>탭하여 현장 사진 추가</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: 업무 완료 */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0 6px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:textC, minWidth:22 }}>③</span>
                <span style={{ fontSize:15, fontWeight:700, color:textC }}>업무 완료</span>
              </div>
              {isDone && (
                <button onClick={()=>setShowCancelEnd(true)}
                  style={{ background:'none', border:`1px solid ${border}`, borderRadius:8, padding:'7px 11px', fontSize:13, color:muted, cursor:'pointer', flexShrink:0 }}>
                  종료 취소
                </button>
              )}
            </div>

            {(isReady||isMoving) && (
              <div style={{ textAlign:'center', padding:'14px 0', color:muted, fontSize:13 }}>
                {isReady ? '출발 버튼을 먼저 누르세요' : '작업 시작 버튼을 누르세요'}
              </div>
            )}

            {isWorking && (
              <>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>최종 물량 (선택)</div>
                  <button onClick={()=>setFinalWasteModal(true)}
                    style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1.5px solid ${finalWaste?amber:border}`, background:finalWaste?'#fef3c7':'#f8fafc', color:finalWaste?amber:muted, fontSize:14, fontWeight:finalWaste?700:400, cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <span>{finalWaste || '— 선택 안함 —'}</span>
                    <span style={{ fontSize:11, color:muted }}>선택 ›</span>
                  </button>
                  <input
                    value={finalWaste}
                    onChange={e=>setFinalWaste(e.target.value)}
                    placeholder="직접 입력 (예: 1/2차 이상, 소량 등)"
                    style={{ ...iStyle, fontSize:13, borderColor: finalWaste ? amber : undefined }}
                  />
                </div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                    <span>완료 사진 <span style={{ color:photos.length>0?green:muted }}>({photos.length}장)</span></span>
                    <span style={{ fontSize:11 }}>여러 장 가능</span>
                  </div>
                  {photos.length > 0 ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:8 }}>
                      {photos.map((src,i)=>(
                        <div key={i} style={{ position:'relative', aspectRatio:'1' }} onClick={()=>openLb('complete',i)}>
                          <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:`1px solid ${border}`, cursor:'pointer' }}/>
                          <button onClick={e=>{ e.stopPropagation(); removePhoto(i) }}
                            style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                          <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                        </div>
                      ))}
                      <div onClick={()=>fileRef.current?.click()}
                        style={{ aspectRatio:'1', border:`2px dashed ${border}`, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#f8fafc' }}>
                        <div style={{ fontSize:20 }}>+</div><div style={{ fontSize:10, color:muted }}>추가</div>
                      </div>
                    </div>
                  ) : (
                    <div onClick={()=>fileRef.current?.click()}
                      style={{ border:`2px dashed ${border}`, borderRadius:10, padding:18, textAlign:'center', cursor:'pointer', background:'#f8fafc' }}>
                      <div style={{ fontSize:26, marginBottom:4 }}>📷</div>
                      <div style={{ fontSize:13, color:muted }}>사진 첨부하기</div>
                      <div style={{ fontSize:11, color:'#ccc', marginTop:2 }}>탭하여 촬영 또는 갤러리에서 선택</div>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display:'none' }}/>
                </div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>특이사항 (선택)</div>
                  <textarea value={driverNote} onChange={e=>setDriverNote(e.target.value)}
                    placeholder={"현장 특이사항을 기록하세요.\n예) 진입로 협소, 담당자 부재 등"}
                    rows={3} style={{ ...iStyle, resize:'vertical', lineHeight:1.7, fontSize:13 }}/>
                </div>
                <Btn onClick={handleDone} color={red} style={{ width:'100%', padding:14, fontSize:16, borderRadius:12 }}>✓ 업무 완료 보고</Btn>
                <div style={{ fontSize:11, color:muted, textAlign:'center', marginTop:6 }}>완료 시 관리자 화면에 즉시 반영됩니다</div>
              </>
            )}

            {isDone && (
              <div>
                <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                  <div style={{ fontSize:16, fontWeight:700, color:green, marginBottom:8 }}>✅ 업무 완료</div>
                  <DriverTimeEdit label="종료" value={schedule.end_time} color={green} onSave={v=>onUpdate({ end_time:v||null })}/>
                  {schedule.start_time && schedule.end_time && (() => {
                    const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m }
                    const diff = toMin(schedule.end_time) - toMin(schedule.start_time)
                    if (diff <= 0) return null
                    const h = Math.floor(diff/60), m = diff%60
                    const total = h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`
                    return (
                      <div style={{ marginTop:6, fontSize:14, color:blue, fontWeight:600 }}>
                        ⏱ {schedule.start_time} ~ {schedule.end_time}
                        <span style={{ marginLeft:8, background:'#dbeafe', padding:'2px 8px', borderRadius:10, fontSize:13 }}>총 {total}</span>
                      </div>
                    )
                  })()}
                  {schedule.final_waste && (
                    <div style={{ fontSize:15, color:amber, fontWeight:700, marginTop:6 }}>📦 최종 물량: {schedule.final_waste}</div>
                  )}
                </div>
                {!editingDone && (
                  <div style={{ display:'flex', gap:10, marginBottom:10, justifyContent:'center' }}>
                    <button onClick={()=>{ setPhotos(schedule.photos||[]); setDriverNote(schedule.driver_note||''); setEditingDone(true) }}
                      style={{ background:'none', border:`1px solid ${blue}`, borderRadius:7, padding:'6px 12px', fontSize:13, color:blue, cursor:'pointer', fontWeight:600 }}>
                      ✏️ 사진/특이사항 수정
                    </button>
                    <button onClick={()=>{ copyDoneReport(); alert('복사되었습니다') }}
                      style={{ padding:'6px 12px', borderRadius:7, border:`1px solid #7c3aed`, background:'none', color:'#7c3aed', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                      📋 작업 보고 복사
                    </button>
                  </div>
                )}
                {editingDone ? (
                  <>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                        <span>완료 사진 ({photos.length}장)</span>
                      </div>
                      {photos.length > 0 ? (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:8 }}>
                          {photos.map((src,i)=>(
                            <div key={i} style={{ position:'relative', aspectRatio:'1' }} onClick={()=>openLb('complete',i)}>
                              <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:`1px solid ${border}`, cursor:'pointer' }}/>
                              <button onClick={e=>{ e.stopPropagation(); removePhoto(i) }}
                                style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                            </div>
                          ))}
                          <div onClick={()=>fileRef.current?.click()}
                            style={{ aspectRatio:'1', border:`2px dashed ${border}`, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#f8fafc' }}>
                            <div style={{ fontSize:20 }}>+</div><div style={{ fontSize:10, color:muted }}>추가</div>
                          </div>
                        </div>
                      ) : (
                        <div onClick={()=>fileRef.current?.click()}
                          style={{ border:`2px dashed ${border}`, borderRadius:10, padding:14, textAlign:'center', cursor:'pointer', background:'#f8fafc', marginBottom:8 }}>
                          <div style={{ fontSize:24, marginBottom:4 }}>📷</div>
                          <div style={{ fontSize:13, color:muted }}>사진 추가</div>
                        </div>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" multiple onChange={addPhotos} style={{ display:'none' }}/>
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>최종 물량</div>
                      <button onClick={()=>setFinalWasteModal(true)}
                        style={{ width:'100%', padding:'11px 14px', borderRadius:8, border:`1.5px solid ${finalWaste?amber:border}`, background:finalWaste?'#fef3c7':'#f8fafc', color:finalWaste?amber:muted, fontSize:14, fontWeight:finalWaste?700:400, cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <span>{finalWaste || '— 선택 안함 —'}</span>
                        <span style={{ fontSize:11, color:muted }}>선택 ›</span>
                      </button>
                      <input
                        value={finalWaste}
                        onChange={e=>setFinalWaste(e.target.value)}
                        placeholder="직접 입력 (예: 1/2차 이상, 소량 등)"
                        style={{ ...iStyle, fontSize:13, borderColor: finalWaste ? amber : undefined }}
                      />
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:6 }}>특이사항</div>
                      <textarea value={driverNote} onChange={e=>setDriverNote(e.target.value)}
                        placeholder="특이사항 입력" rows={3}
                        style={{ ...iStyle, resize:'vertical', lineHeight:1.7, fontSize:13 }}/>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <Btn onClick={()=>{ setPhotos(schedule.photos||[]); setDriverNote(schedule.driver_note||''); setFinalWaste(schedule.final_waste||''); setEditingDone(false) }} outline color={muted} style={{ flex:1 }}>취소</Btn>
                      <Btn onClick={saveEdit} color={green} style={{ flex:2 }}>저장</Btn>
                    </div>
                  </>
                ) : (
                  <>
                    {schedule.driver_note && (
                      <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:amber, marginBottom:4 }}>📋 특이사항</div>
                        <div style={{ fontSize:13, color:textC, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{schedule.driver_note}</div>
                      </div>
                    )}
                    {(() => {
                      const workPics = schedule.work_photos || []
                      const donePics = displayPhotos
                      const allPics  = [...workPics, ...donePics]
                      return (
                        <div>
                          {allPics.length > 0 && (
                            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
                              <button onClick={()=>downloadAllPhotos(allPics, '전체사진')}
                                style={{ background:'#f1f5f9', color:muted, border:`1px solid ${border}`, borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                                ⬇ 전체 다운로드
                              </button>
                            </div>
                          )}
                          <div style={{ marginBottom:10 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <span style={{ fontSize:11, fontWeight:600, color:muted }}>📍 현장 사진 ({workPics.length}장)</span>
                              <button onClick={()=>workFileRef.current?.click()}
                                style={{ background:amber, color:'#fff', border:'none', borderRadius:6, padding:'3px 9px', fontSize:11, fontWeight:600, cursor:'pointer' }}>+ 추가</button>
                            </div>
                            {workPics.length > 0 ? (
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                                {workPics.map((src,i)=>(
                                  <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                                    <img src={src} alt="" onClick={()=>openLb('work',i)}
                                      style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                                    <button onClick={()=>removeWorkPhoto(i)}
                                      style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                                    <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div onClick={()=>workFileRef.current?.click()}
                                style={{ border:`2px dashed ${border}`, borderRadius:8, padding:10, textAlign:'center', cursor:'pointer', background:'#f8fafc' }}>
                                <span style={{ fontSize:12, color:muted }}>탭하여 추가</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                              <span style={{ fontSize:11, fontWeight:600, color:muted }}>✅ 완료 사진 ({donePics.length}장)</span>
                              <label style={{ background:green, color:'#fff', borderRadius:6, padding:'3px 9px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                                + 추가
                                <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={async e=>{
                                  const files = Array.from(e.target.files)
                                  const newUrls = []
                                  for (const f of files) newUrls.push(await resizeImage(f))
                                  onUpdate({ photos: [...(schedule.photos||[]), ...newUrls] })
                                  e.target.value = ''
                                }}/>
                              </label>
                            </div>
                            {donePics.length > 0 ? (
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                                {donePics.map((src,i)=>(
                                  <div key={i} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:`1px solid ${border}` }}>
                                    <img src={src} alt="" onClick={()=>openLb('complete',i)}
                                      style={{ width:'100%', height:'100%', objectFit:'cover', cursor:'pointer' }}/>
                                    <button onClick={()=>onUpdate({ photos: (schedule.photos||[]).filter((_,j)=>j!==i) })}
                                      style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                                    <div style={{ position:'absolute', bottom:3, left:4, fontSize:9, color:'#fff', background:'rgba(0,0,0,.5)', borderRadius:3, padding:'1px 4px' }}>{i+1}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <label style={{ display:'block', border:`2px dashed ${border}`, borderRadius:8, padding:10, textAlign:'center', cursor:'pointer', background:'#f8fafc' }}>
                                <span style={{ fontSize:12, color:muted }}>탭하여 추가</span>
                                <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={async e=>{
                                  const files = Array.from(e.target.files)
                                  const newUrls = []
                                  for (const f of files) newUrls.push(await resizeImage(f))
                                  onUpdate({ photos: [...(schedule.photos||[]), ...newUrls] })
                                  e.target.value = ''
                                }}/>
                              </label>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {showDepartModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2000, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:480, padding:24, paddingBottom:36 }}>
            <div style={{ width:36, height:4, background:border, borderRadius:2, margin:'0 auto 18px' }}/>
            <div style={{ fontSize:19, fontWeight:700, color:navy, marginBottom:6 }}>🚚 출발 보고</div>
            <div style={{ fontSize:15, color:muted, marginBottom:18 }}>{schedule.address}</div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8 }}>도착 예상 시간</div>
              <EtaModalInput eta={eta} onChange={v=>{ setEta(v); setSmsPreview(buildSms(v)) }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                💬 현장 담당자 발송 문자
                <span style={{ background:'#dcfce7', color:green, fontSize:12, padding:'2px 8px', borderRadius:4, fontWeight:700 }}>문자앱 연결</span>
              </div>
              <div style={{ background:'#f0fdf4', border:`1px solid #bbf7d0`, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:13, color:'#166534', lineHeight:1.85, whiteSpace:'pre-wrap', fontFamily:'monospace' }}>{smsPreview}</div>
              </div>
              <div style={{ fontSize:13, color:muted, marginTop:6 }}>📱 {schedule.cname} ({schedule.cphone})</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>setDepartModal(false)} outline color={muted} style={{ flex:1, fontSize:15 }}>취소</Btn>
              <Btn onClick={confirmDepart} color={blue} style={{ flex:2, fontSize:16 }}>출발 · 문자앱 열기</Btn>
            </div>
          </div>
        </div>
      )}

      {showWorkModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2000, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:480, padding:24, paddingBottom:36, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ width:36, height:4, background:border, borderRadius:2, margin:'0 auto 18px' }}/>
            <div style={{ fontSize:19, fontWeight:700, color:navy, marginBottom:6 }}>▶ 작업 시작</div>
            <div style={{ fontSize:15, color:muted, marginBottom:20 }}>{schedule.address}</div>

            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:10 }}>예상 물량 (선택)</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {['소량','소량 이상', null].map((v, i) => v === null ? (
                    <div key={i}/>
                  ) : (
                    <button key={v} onClick={()=>setEstWaste(estWaste===v ? '' : v)}
                      style={{ padding:'11px 0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:`1.5px solid ${estWaste===v?amber:border}`, background:estWaste===v?'#fef3c7':'#f8fafc', color:estWaste===v?amber:muted }}>
                      {v}
                    </button>
                  ))}
                </div>
                {['1/6차','1/3차','1/2차','2/3차','1차'].map(qty => (
                  <div key={qty} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    {[qty, `${qty} 이하`, `${qty} 이상`].map((v, i) => {
                      const active = estWaste === v
                      return (
                        <button key={v} onClick={()=>setEstWaste(active ? '' : v)}
                          style={{ padding:'11px 0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:`1.5px solid ${active?amber:border}`, background:active?'#fef3c7':'#f8fafc', color:active?amber:muted }}>
                          {i===0 ? qty : i===1 ? '이하' : '이상'}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
              {estWaste && (
                <div style={{ marginTop:10, fontSize:14, color:amber, fontWeight:600, textAlign:'center', background:'#fffbeb', padding:'9px', borderRadius:8 }}>
                  선택됨: {estWaste}
                </div>
              )}
            </div>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8 }}>예상 작업 시간 (선택)</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:8 }}>
                {['30분','1시간','1시간 30분','2시간','2시간 30분','3시간','3시간 30분','4시간'].map(t=>(
                  <button key={t} onClick={()=>setEstDuration(estDuration===t ? '' : t)}
                    style={{ padding:'11px 0', borderRadius:8, border:`1.5px solid ${estDuration===t?blue:border}`, background:estDuration===t?'#dbeafe':'#f8fafc', color:estDuration===t?blue:muted, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
              <input value={estDuration} onChange={e=>setEstDuration(e.target.value)}
                placeholder="직접 입력 (예: 4시간 30분)" style={{ ...iStyle, fontSize:15 }}/>
            </div>

            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8 }}>현장 사진 (선택)</div>
              {sitePhotos.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:8 }}>
                  {sitePhotos.map((src,i)=>(
                    <div key={i} style={{ position:'relative', aspectRatio:'1' }}>
                      <img src={src} alt={`현장${i+1}`} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:8, border:`1px solid ${border}` }}/>
                      <button onClick={()=>setSitePhotos(prev=>prev.filter((_,j)=>j!==i))}
                        style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.65)', color:'#fff', border:'none', borderRadius:'50%', width:20, height:20, fontSize:11, cursor:'pointer', lineHeight:1 }}>✕</button>
                    </div>
                  ))}
                  <div onClick={()=>sitePhotoRef.current?.click()}
                    style={{ aspectRatio:'1', border:`2px dashed ${border}`, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#f8fafc' }}>
                    <div style={{ fontSize:20 }}>+</div>
                    <div style={{ fontSize:10, color:muted }}>추가</div>
                  </div>
                </div>
              ) : (
                <div onClick={()=>sitePhotoRef.current?.click()}
                  style={{ border:`2px dashed #93c5fd`, borderRadius:10, padding:16, textAlign:'center', cursor:'pointer', background:'#f0f9ff' }}>
                  <div style={{ fontSize:24, marginBottom:4 }}>📷</div>
                  <div style={{ fontSize:13, color:'#1d4ed8', fontWeight:600 }}>현장 사진 촬영 / 추가</div>
                  <div style={{ fontSize:11, color:muted, marginTop:2 }}>탭하여 촬영 또는 갤러리에서 선택</div>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>setWorkModal(false)} outline color={muted} style={{ flex:1, fontSize:15 }}>취소</Btn>
              <Btn onClick={confirmWork} color={amber} style={{ flex:2, fontSize:16 }}>작업 시작</Btn>
            </div>
            <input ref={sitePhotoRef} type="file" accept="image/*" multiple onChange={addSitePhotos} style={{ display:'none' }}/>
          </div>
        </div>
      )}

      {showFinalWasteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2100, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:480, padding:24, paddingBottom:36, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ width:36, height:4, background:border, borderRadius:2, margin:'0 auto 18px' }}/>
            <div style={{ fontSize:19, fontWeight:700, color:navy, marginBottom:6 }}>📦 최종 물량 선택</div>
            <div style={{ fontSize:15, color:muted, marginBottom:18 }}>{schedule.address}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {['소량','소량 이상', null].map((v, i) => v === null ? (
                  <div key={i}/>
                ) : (
                  <button key={v} onClick={()=>setFinalWaste(finalWaste===v?'':v)}
                    style={{ padding:'12px 0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:`1.5px solid ${finalWaste===v?amber:border}`, background:finalWaste===v?'#fef3c7':'#f8fafc', color:finalWaste===v?amber:muted, transition:'all .1s' }}>
                    {v}
                  </button>
                ))}
              </div>
              {['1/6차','1/3차','1/2차','2/3차','1차'].map(qty => (
                <div key={qty} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {[qty, `${qty} 이하`, `${qty} 이상`].map((v, i) => {
                    const active = finalWaste === v
                    return (
                      <button key={v} onClick={()=>setFinalWaste(active?'':v)}
                        style={{ padding:'12px 0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:`1.5px solid ${active?amber:border}`, background:active?'#fef3c7':'#f8fafc', color:active?amber:muted, transition:'all .1s' }}>
                        {i===0 ? qty : i===1 ? '이하' : '이상'}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            <div style={{ background: finalWaste?'#fffbeb':'#f8fafc', border:`1px solid ${finalWaste?'#fde68a':border}`, borderRadius:8, padding:'12px 14px', marginBottom:16, fontSize:15, fontWeight:700, color:finalWaste?amber:muted, textAlign:'center', minHeight:46 }}>
              {finalWaste ? `선택됨: ${finalWaste}` : '선택 안함'}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{ setFinalWaste(''); setFinalWasteModal(false) }}
                style={{ flex:1, padding:'13px 0', borderRadius:8, border:`1px solid ${border}`, background:'#f8fafc', color:muted, fontSize:15, fontWeight:600, cursor:'pointer' }}>
                초기화
              </button>
              <Btn onClick={()=>setFinalWasteModal(false)} color={amber} style={{ flex:2, fontSize:16 }}>확인</Btn>
            </div>
          </div>
        </div>
      )}

      {showResendModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:2000, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:480, padding:24, paddingBottom:36 }}>
            <div style={{ width:36, height:4, background:border, borderRadius:2, margin:'0 auto 18px' }}/>
            <div style={{ fontSize:19, fontWeight:700, color:navy, marginBottom:6 }}>💬 {schedule.sms_sent?'문자 재발송':'문자 발송'}</div>
            <div style={{ fontSize:15, color:muted, marginBottom:18 }}>{schedule.address}</div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:8 }}>도착 예상 시간</div>
              <EtaModalInput eta={eta} onChange={v=>{ setEta(v); setSmsPreview(buildSms(v)) }}/>
            </div>
            <div style={{ background:'#f0fdf4', border:`1px solid #bbf7d0`, borderRadius:10, padding:'12px 14px', marginBottom:20 }}>
              <div style={{ fontSize:13, color:'#166534', lineHeight:1.85, whiteSpace:'pre-wrap', fontFamily:'monospace' }}>{smsPreview}</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={()=>setResendModal(false)} outline color={muted} style={{ flex:1, fontSize:15 }}>취소</Btn>
              <Btn onClick={confirmResend} color={green} style={{ flex:2, fontSize:16 }}>문자앱 열기</Btn>
            </div>
          </div>
        </div>
      )}

      {[
        [showCancelDepart, setShowCancelDepart, cancelDepart, '출발을 취소할까요?',   '출발 시간이 삭제되고 대기 상태로 돌아갑니다.',     '출발 취소', red],
        [showCancelStart,  setShowCancelStart,  cancelStart,  '작업 시작을 취소할까요?', '시작 시간이 삭제되고 이동중 상태로 돌아갑니다.', '시작 취소', red],
        [showCancelEnd,    setShowCancelEnd,    cancelEnd,    '업무 종료를 취소할까요?', '종료 시간이 삭제되고 진행중으로 돌아갑니다.',   '종료 취소', amber],
      ].map(([show, setShow, action, title, desc, label, color]) => show ? (
        <div key={title} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:320, padding:28 }}>
            <div style={{ fontSize:17, fontWeight:700, color:textC, marginBottom:10 }}>{title}</div>
            <div style={{ fontSize:15, color:muted, lineHeight:1.7, marginBottom:22 }}>{desc}</div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={()=>setShow(false)} outline color={muted} style={{ flex:1, fontSize:15 }}>아니요</Btn>
              <Btn onClick={action} color={color} style={{ flex:2, fontSize:15 }}>{label}</Btn>
            </div>
          </div>
        </div>
      ) : null)}

      {lightbox !== null && <Lightbox photos={lbPhotos} index={lightbox} onClose={()=>setLightbox(null)}/>}
    </div>
  )
}
