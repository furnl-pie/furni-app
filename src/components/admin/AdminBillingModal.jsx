import { useState, useRef } from 'react'
import Lightbox from '../common/Lightbox'
import { Btn } from '../common/ui'
import { navy, blue, green, amber, red, border, muted, textC, iStyle, getKSTToday } from '../../constants/styles'

export default function AdminBillingModal({ schedule, onClose, onUpdate, users }) {
  const completePhotos = schedule.photos || []
  const allWorkPhotos  = [...(schedule.work_photos || []), ...completePhotos]

  const [billingForm, setBillingForm] = useState({
    workers: schedule.billing_workers || (schedule.co_driver_id ? '2' : '1'),
    waste:   schedule.billing_waste   || schedule.final_waste || schedule.waste || '',
    amount:  schedule.billing_amount  ? String(schedule.billing_amount) : '',
    unit:    schedule.billing_unit    ? String(schedule.billing_unit)   : '',
    unit2:   schedule.billing_unit2   ? String(schedule.billing_unit2)  : '',
    total:   schedule.billing_total   ? String(schedule.billing_total)  : '',
  })
  const [billCopied, setBillCopied] = useState(false)
  const [imgCopied,  setImgCopied]  = useState(false)
  const [billSaved,  setBillSaved]  = useState(false)
  const [photoIdx,   setPhotoIdx]   = useState(null)
  const billUnitRef = useRef()

  const setBF = (k, v) => setBillingForm(p => {
    const next = { ...p, [k]: v }
    const a  = parseFloat(next.amount) || 0
    const u  = parseFloat(next.unit)   || 0
    const u2 = parseFloat(next.unit2)  || 0
    next.total = (a + u + u2) > 0 ? String(Math.round((a + u + u2) * 1.1 * 10) / 10) : ''
    return next
  })

  const toMin = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const fmtDiff = (s, e) => {
    const d = toMin(e) - toMin(s)
    if (d <= 0) return ''
    const hh = Math.floor(d / 60), mm = d % 60
    return hh > 0 ? (mm > 0 ? `${hh}시간 ${mm}분` : `${hh}시간`) : `${mm}분`
  }

  const diff     = toMin(schedule.end_time) - toMin(schedule.start_time)
  const h        = Math.floor(diff / 60), m = diff % 60
  const duration = diff > 0 ? (h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`) : ''
  const workTime = (schedule.start_time && schedule.end_time && duration)
    ? `${schedule.start_time} ~ ${schedule.end_time} (${duration})`
    : duration

  const hasCoDriver  = !!schedule.co_driver_id && !!schedule.co_start_time && !!schedule.co_end_time
  const sameTime     = hasCoDriver && schedule.co_start_time === schedule.start_time && schedule.co_end_time === schedule.end_time
  const diffTime     = hasCoDriver && !sameTime
  const coDuration   = hasCoDriver ? fmtDiff(schedule.co_start_time, schedule.co_end_time) : ''
  const coDriverName = hasCoDriver ? (users.find(u => u.id === schedule.co_driver_id)?.name || '') : ''

  const companyName = (schedule.cname || '').replace(/\(.*?\)/g, '').trim()
  const wasteAmt    = billingForm.waste

  const buildText = () => {
    const unitLine = diffTime
      ? `1인 *${duration} > ${billingForm.unit}만원\n1인 *${coDuration} > ${billingForm.unit2}만원`
      : `${billingForm.workers}인 *${duration} > ${billingForm.unit}만원`
    return `[FN퍼니 작업보고]
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
${unitLine}
${billingForm.total}만원 (부가세 포함)
*청구내역이나 업무관련 의견 편하게 말씀해주세요 적극 재검토 하겠습니다^^
기업 351-112230-01-015 주식회사 퍼니환경개발`
  }

  const copy = () => {
    navigator.clipboard.writeText(buildText()).then(() => {
      setBillCopied(true)
      setTimeout(() => setBillCopied(false), 2000)
    })
  }

  const saveBilling = () => {
    const total = parseFloat(billingForm.total)
    if (!total || total <= 0) { alert('청구금액(합계)을 입력해주세요.'); return }
    onUpdate({
      billing_workers: billingForm.workers,
      billing_waste:   billingForm.waste,
      billing_amount:  parseFloat(billingForm.amount) || 0,
      billing_unit:    parseFloat(billingForm.unit)   || 0,
      billing_unit2:   parseFloat(billingForm.unit2)  || 0,
      billing_total:   total,
      billing_date:    getKSTToday(),
    })
    setBillSaved(true)
    setTimeout(() => setBillSaved(false), 2000)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div lang="ko" style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:440, maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
          <div style={{ fontSize:17, fontWeight:700, color:navy }}>{schedule.billing_total ? '💰 청구서 수정' : '💰 청구서 작성'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
        </div>

        <div style={{ padding:'16px 20px' }}>
          {allWorkPhotos.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:600, color:muted, marginBottom:8 }}>전체 작업사진</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
                {allWorkPhotos.map((p, i) => (
                  <img key={i} src={p} onClick={() => setPhotoIdx(i)}
                    style={{ width:'100%', aspectRatio:'1', objectFit:'cover', borderRadius:6, cursor:'pointer' }}/>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>작업인원</div>
              <div style={{ display:'flex', gap:8 }}>
                {['1','2','3','4'].map(n => (
                  <button key={n} onClick={() => setBF('workers', n)}
                    style={{ flex:1, padding:'10px 0', borderRadius:8, border:`1.5px solid ${billingForm.workers===n?navy:border}`, background:billingForm.workers===n?navy:'#f8fafc', color:billingForm.workers===n?'#fff':muted, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    {n}인
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>폐기물 양</div>
                <input lang="ko" value={billingForm.waste} onChange={e => setBillingForm(p => ({ ...p, waste: e.target.value }))}
                  placeholder="예) 1톤" style={{ ...iStyle, fontSize:15, fontWeight:700, width:'100%' }}/>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>폐기물 청구금액</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <input type="number" value={billingForm.amount} onChange={e => setBF('amount', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') billUnitRef.current?.focus() }}
                    placeholder="금액" style={{ ...iStyle, fontSize:15, fontWeight:700, textAlign:'right', flex:1 }}/>
                  <span style={{ fontSize:14, color:muted, whiteSpace:'nowrap' }}>만원</span>
                </div>
              </div>
            </div>

            {diffTime ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontSize:13, fontWeight:600, color:blue, background:'#eff6ff', borderRadius:7, padding:'6px 10px' }}>
                  ⏱ 메인: {schedule.start_time}~{schedule.end_time} ({duration}) &nbsp;|&nbsp; 보조({coDriverName}): {schedule.co_start_time}~{schedule.co_end_time} ({coDuration})
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:muted, marginBottom:4 }}>1인 금액 ({duration})</div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <input ref={billUnitRef} type="number" value={billingForm.unit} onChange={e => setBF('unit', e.target.value)}
                        placeholder="금액" style={{ ...iStyle, fontSize:14, fontWeight:700, textAlign:'right', flex:1 }}/>
                      <span style={{ fontSize:13, color:muted }}>만원</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:muted, marginBottom:4 }}>1인 금액 ({coDuration})</div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <input type="number" value={billingForm.unit2} onChange={e => setBF('unit2', e.target.value)}
                        placeholder="금액" style={{ ...iStyle, fontSize:14, fontWeight:700, textAlign:'right', flex:1 }}/>
                      <span style={{ fontSize:13, color:muted }}>만원</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>
                  {billingForm.workers}인 금액
                  {sameTime && <span style={{ fontWeight:400, fontSize:12, color:green, marginLeft:6 }}>2인 동일시간 ({duration})</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input ref={billUnitRef} type="number" value={billingForm.unit} onChange={e => setBF('unit', e.target.value)}
                    placeholder="금액 입력" style={{ ...iStyle, fontSize:15, fontWeight:700, textAlign:'right', flex:1 }}/>
                  <span style={{ fontSize:16, color:muted, whiteSpace:'nowrap' }}>만원</span>
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize:14, fontWeight:600, color:muted, marginBottom:6 }}>합계 (부가세 포함)
                <span style={{ fontWeight:400, color:'#94a3b8', marginLeft:6 }}>자동 계산됨</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="number" value={billingForm.total}
                  onChange={e => setBillingForm(p => ({ ...p, total: e.target.value }))}
                  placeholder="자동 합산" style={{ ...iStyle, fontSize:14, fontWeight:700, textAlign:'right', flex:1, borderColor: billingForm.total ? navy : undefined }}/>
                <span style={{ fontSize:16, color:muted, whiteSpace:'nowrap' }}>만원</span>
              </div>
            </div>
          </div>

          <div style={{ background:'#eff6ff', border:`1px solid #bfdbfe`, borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:14, fontFamily:'monospace', lineHeight:2 }}>
            <div style={{ fontSize:14, fontWeight:700, color:navy, marginBottom:2 }}>&lt;청구금액&gt;</div>
            <div style={{ color:textC }}>{wasteAmt || '__'} &gt; {billingForm.amount || '__'}만원</div>
            {diffTime ? (<>
              <div style={{ color:textC }}>1인 *{duration || '__'} &gt; {billingForm.unit || '__'}만원</div>
              <div style={{ color:textC }}>1인 *{coDuration || '__'} &gt; {billingForm.unit2 || '__'}만원</div>
            </>) : (
              <div style={{ color:textC }}>{billingForm.workers}인 *{duration || '__'} &gt; {billingForm.unit || '__'}만원</div>
            )}
            <div style={{ color:textC, fontWeight:700 }}>{billingForm.total || '__'}만원 (부가세 포함)</div>
            <div style={{ color:muted, fontSize:13, marginTop:4, lineHeight:1.7 }}>*청구내역이나 업무관련 의견 편하게 말씀해주세요 적극 재검토 하겠습니다^^</div>
            <div style={{ color:navy, fontSize:13, fontWeight:600 }}>기업 351-112230-01-015 주식회사 퍼니환경개발</div>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <Btn onClick={onClose} outline color={muted} style={{ flex:1, fontSize:14 }}>닫기</Btn>
            <Btn onClick={copy} color={billCopied ? green : navy} outline style={{ flex:2, fontSize:14 }}>
              {billCopied ? '✓ 복사됨!' : '📋 복사'}
            </Btn>
          </div>
          <Btn onClick={saveBilling} color={billSaved ? green : navy} style={{ width:'100%', fontSize:15, fontWeight:700 }}>
            {billSaved ? '✓ 저장됨!' : '💾 청구 내역 저장'}
          </Btn>
        </div>
      </div>

      {photoIdx !== null && (
        <Lightbox photos={allWorkPhotos} index={photoIdx} onClose={() => setPhotoIdx(null)}/>
      )}
    </div>
  )
}
