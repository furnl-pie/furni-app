import { useState } from 'react'
import { Card, Btn } from '../common/ui'
import { navy, blue, green, amber, red, border, muted, textC, getKSTToday, getDriverSortKey, driverChip } from '../../constants/styles'
import { userName, getUsers } from '../../utils/users'

const iStyle = {
  padding:'8px 10px', border:`1px solid ${border}`, borderRadius:7, fontSize:13,
  outline:'none', background:'#fafafa', boxSizing:'border-box', width:'100%',
}

export default function BillingPage({ schedules, onUpdate, onBack }) {
  const today = getKSTToday()
  // mode: 'today' | 'range'
  const [mode, setMode] = useState('today')
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [editBilling, setEditBilling]   = useState(null)
  const [editForm,    setEditForm]      = useState({})
  const [confirmDel,  setConfirmDel]    = useState(null)

  const drivers = getUsers().filter(u => u.role === 'driver')

  // 필터링
  const billed = schedules.filter(s => {
    if (!s.billing_total || !s.billing_date) return false
    const d = s.date || s.billing_date || ''
    if (mode === 'today') return d === today
    return d >= fromDate && d <= toDate
  })

  const totalAmount = billed.reduce((sum, s) => sum + (s.billing_total || 0), 0)

  const workDuration = s => {
    if (!s.start_time || !s.end_time) return '-'
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const diff = toMin(s.end_time) - toMin(s.start_time)
    if (diff <= 0) return '-'
    const h = Math.floor(diff / 60), m = diff % 60
    return h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`
  }

  const fmtAmount = val => {
    if (!val) return '-'
    return (Math.round(val * 10000)).toLocaleString() + '원'
  }

  const carNum = driverId => getUsers().find(u => u.id === driverId)?.car_num || ''

  // 당일 모드: 기사별 그룹
  const groupedByDriver = billed.reduce((acc, s) => {
    const key = s.driver_id || '__none__'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})
  Object.values(groupedByDriver).forEach(rows => rows.sort((a, b) => (a.date || '').localeCompare(b.date || '')))
  const driverKeys = Object.keys(groupedByDriver).sort((a, b) => {
    const dA = drivers.find(d => d.id === a)
    const dB = drivers.find(d => d.id === b)
    return getDriverSortKey(dA || { name: a }) - getDriverSortKey(dB || { name: b })
  })

  // 기간 모드: 일별(대그룹) → 기사별(소그룹)
  const groupedByDate = billed.reduce((acc, s) => {
    const d = s.date || s.billing_date || ''
    if (!acc[d]) acc[d] = {}
    const key = s.driver_id || '__none__'
    if (!acc[d][key]) acc[d][key] = []
    acc[d][key].push(s)
    return acc
  }, {})
  const dateKeys = Object.keys(groupedByDate).sort()

  const exportCSV = () => {
    const headers = ['날짜', '담당기사', '차량번호', '업체(담당자)', '폐기물량', '', '청구금액(원)', '주소']
    const emptyRow = Array(8).fill('')
    const fmtCar  = num => num ? `="${num}"` : ''  // leading-zero 보존용 Excel 수식
    const makeRow = s => [
      s.date || s.billing_date || '',
      userName(s.driver_id),
      fmtCar(carNum(s.driver_id)),
      s.cname || '',
      s.billing_waste || '',
      '',
      s.billing_total ? Math.round(s.billing_total * 10000) : 0,
      `"${(s.address || '').replace(/"/g, '""')}"`,
    ]

    let rows = []
    if (mode === 'today') {
      driverKeys.forEach((key, i) => {
        if (i > 0) { rows.push(emptyRow, emptyRow) }
        groupedByDriver[key].forEach(s => rows.push(makeRow(s)))
      })
    } else {
      dateKeys.forEach(d => {
        const driverMap = groupedByDate[d]
        const sortedDrivers = Object.keys(driverMap).sort((a, b) => {
          const dA = drivers.find(x => x.id === a)
          const dB = drivers.find(x => x.id === b)
          return getDriverSortKey(dA || { name: a }) - getDriverSortKey(dB || { name: b })
        })
        sortedDrivers.forEach((key, i) => {
          if (i > 0) { rows.push(emptyRow, emptyRow) }
          driverMap[key].forEach(s => rows.push(makeRow(s)))
        })
      })
    }

    const label = mode === 'today' ? today : `${fromDate}_${toDate}`
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `청구내역_${label}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const openEdit = s => {
    setEditBilling(s)
    setEditForm({
      billing_date:    s.billing_date    || s.date || '',
      billing_workers: s.billing_workers || '1',
      billing_waste:   s.billing_waste   || s.waste || '',
      billing_amount:  s.billing_amount  ? String(s.billing_amount)  : '',
      billing_unit:    s.billing_unit    ? String(s.billing_unit)    : '',
      billing_total:   s.billing_total   ? String(s.billing_total)   : '',
    })
  }

  const setF = (k, v) => setEditForm(p => {
    const next = { ...p, [k]: v }
    const a = parseFloat(next.billing_amount) || 0
    const u = parseFloat(next.billing_unit)   || 0
    if (k === 'billing_amount' || k === 'billing_unit') {
      next.billing_total = (a + u) > 0 ? String(Math.round((a + u) * 1.1 * 10) / 10) : ''
    }
    return next
  })

  const saveEdit = () => {
    onUpdate(editBilling.id, {
      billing_date:    editForm.billing_date,
      billing_workers: editForm.billing_workers,
      billing_waste:   editForm.billing_waste,
      billing_amount:  parseFloat(editForm.billing_amount) || null,
      billing_unit:    parseFloat(editForm.billing_unit)   || null,
      billing_total:   parseFloat(editForm.billing_total)  || null,
    })
    setEditBilling(null)
  }

  const deleteBilling = id => {
    onUpdate(id, {
      billing_date: null, billing_workers: null, billing_waste: null,
      billing_amount: null, billing_unit: null, billing_total: null,
    })
    setConfirmDel(null)
  }

  const th = extra => ({
    padding: '8px 12px', background: '#f9fafb', fontSize: 11, fontWeight: 700,
    color: '#9ca3af', borderBottom: `1px solid #f3f4f6`, whiteSpace: 'nowrap',
    textTransform: 'uppercase', letterSpacing: '.5px',
    textAlign: 'center', ...extra,
  })
  const td = extra => ({
    padding: '9px 12px', fontSize: 13, color: textC,
    borderBottom: `1px solid ${border}`, verticalAlign: 'middle', ...extra,
  })

  // 공통 테이블 행 렌더 (기사별 소그룹)
  const renderDriverGroup = (driverKey, rows, showDriverHeader = true) => {
    const subtotal = rows.reduce((sum, s) => sum + (s.billing_total || 0), 0)
    const cn = carNum(driverKey)
    const chip = driverChip(driverKey, drivers)
    return [
      showDriverHeader && (
        <tr key={`driver-${driverKey}-${rows[0]?.id}`} style={{ background: chip ? chip.bg : '#f8fafc' }}>
          <td colSpan={6} style={{ padding: '7px 14px', fontSize: 13, fontWeight: 700, color: chip ? chip.color : navy, borderBottom: `1px solid ${border}`, borderTop: `1px solid ${chip ? chip.border : border}` }}>
            {userName(driverKey)}
            {cn && <span style={{ marginLeft: 8, fontSize: 11, fontFamily: 'monospace', color: muted, fontWeight: 400 }}>{cn}</span>}
            <span style={{ marginLeft: 10, fontSize: 12, color: muted, fontWeight: 400 }}>{rows.length}건</span>
          </td>
          <td style={{ padding: '7px 14px', fontSize: 13, fontWeight: 700, color: chip ? chip.color : green, textAlign: 'right', borderBottom: `1px solid ${border}`, borderTop: `1px solid ${chip ? chip.border : border}`, whiteSpace: 'nowrap' }}>
            {fmtAmount(subtotal)}
          </td>
        </tr>
      ),
      ...rows.map((s, i) => (
        <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
          <td style={td({ textAlign: 'center', fontFamily: 'monospace', fontSize: 12 })}>{s.date || s.billing_date}</td>
          <td style={td()}>{s.cname || '-'}</td>
          <td style={td({ fontSize: 12, color: muted, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{s.address}</td>
          <td style={td({ textAlign: 'center', fontWeight: 600, color: amber })}>{s.billing_waste || s.waste || '-'}</td>
          <td style={td({ textAlign: 'center', fontSize: 12, color: muted })}>{workDuration(s)}</td>
          <td style={td({ textAlign: 'right', fontWeight: 600, color: textC, whiteSpace: 'nowrap' })}>{fmtAmount(s.billing_total)}</td>
          <td style={td({ textAlign: 'center', whiteSpace: 'nowrap' })}>
            <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
              <button onClick={() => openEdit(s)}
                style={{ background:'#f8fafc', border:`1px solid ${border}`, borderRadius:6, padding:'3px 9px', fontSize:12, color:textC, cursor:'pointer', fontWeight:600 }}>
                수정
              </button>
              <button onClick={() => setConfirmDel(s.id)}
                style={{ background:'#fef2f2', border:`1px solid #fca5a5`, borderRadius:6, padding:'3px 9px', fontSize:12, color:red, cursor:'pointer', fontWeight:600 }}>
                삭제
              </button>
            </div>
          </td>
        </tr>
      ))
    ]
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: "'Noto Sans KR', sans-serif" }}>

      <div style={{ background: '#fff', borderBottom: '1px solid #eaecf0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onBack}
              style={{ width: 34, height: 34, border: '1px solid #eaecf0', background: '#f9fafb', borderRadius: 8, cursor: 'pointer', fontSize: 16, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>청구 내역</span>
          </div>
        </div>

        {/* 모드 선택 + 날짜 필터 */}
        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* 오늘 / 기간 토글 */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2, gap: 2 }}>
            <button
              onClick={() => setMode('today')}
              style={{ padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: mode === 'today' ? '#fff' : 'transparent',
                color: mode === 'today' ? navy : muted,
                boxShadow: mode === 'today' ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              }}>
              오늘
            </button>
            <button
              onClick={() => setMode('range')}
              style={{ padding: '6px 16px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: mode === 'range' ? '#fff' : 'transparent',
                color: mode === 'range' ? navy : muted,
                boxShadow: mode === 'range' ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              }}>
              기간
            </button>
          </div>

          {mode === 'today' && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', background: '#f9fafb', border: '1.5px solid #eaecf0', borderRadius: 8, padding: '6px 14px' }}>
              {today}
            </span>
          )}

          {mode === 'range' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #eaecf0', background: '#f9fafb', color: '#111827', fontSize: 13, fontWeight: 600, outline: 'none' }} />
              <span style={{ fontSize: 13, color: muted, fontWeight: 600 }}>~</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #eaecf0', background: '#f9fafb', color: '#111827', fontSize: 13, fontWeight: 600, outline: 'none' }} />
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Card style={{ textAlign: 'center', padding: '12px 6px', borderTop: '3px solid #6366f1' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#6366f1', lineHeight: 1.1 }}>{billed.length}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 3, fontWeight: 600, letterSpacing: '.3px' }}>청구 건수</div>
          </Card>
          <Card style={{ textAlign: 'center', padding: '12px 6px', borderTop: '3px solid #10b981' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>{fmtAmount(totalAmount)}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 3, fontWeight: 600, letterSpacing: '.3px' }}>합계</div>
          </Card>
        </div>

        {billed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 52, color: muted }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14 }}>
              {mode === 'today' ? '오늘 저장된 청구 내역이 없습니다' : '선택한 기간에 저장된 청구 내역이 없습니다'}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={th()}>날짜</th>
                  <th style={th({ textAlign: 'left' })}>업체(담당자)</th>
                  <th style={th({ textAlign: 'left' })}>주소</th>
                  <th style={th()}>폐기물량</th>
                  <th style={th()}>작업시간</th>
                  <th style={th({ textAlign: 'right' })}>청구금액</th>
                  <th style={th()}></th>
                </tr>
              </thead>
              <tbody>
                {/* 당일 모드: 기사별 그룹 */}
                {mode === 'today' && driverKeys.map(key => {
                  const rows = groupedByDriver[key]
                  return renderDriverGroup(key, rows, true)
                })}

                {/* 기간 모드: 일별(대그룹) → 기사별(소그룹) */}
                {mode === 'range' && dateKeys.map(d => {
                  const driverMap = groupedByDate[d]
                  const sortedDriverKeys = Object.keys(driverMap).sort((a, b) => {
                    const dA = drivers.find(x => x.id === a)
                    const dB = drivers.find(x => x.id === b)
                    return getDriverSortKey(dA || { name: a }) - getDriverSortKey(dB || { name: b })
                  })
                  const dayTotal = Object.values(driverMap).flat().reduce((sum, s) => sum + (s.billing_total || 0), 0)
                  const dayCount = Object.values(driverMap).flat().length
                  return [
                    // 날짜 대그룹 헤더
                    <tr key={`date-${d}`} style={{ background: '#eef2ff' }}>
                      <td colSpan={6} style={{ padding: '9px 14px', fontSize: 14, fontWeight: 800, color: '#4f46e5', borderBottom: `1px solid #c7d2fe`, borderTop: `2px solid #6366f1` }}>
                        {d}
                        <span style={{ marginLeft: 10, fontSize: 12, color: '#6366f1', fontWeight: 500 }}>{dayCount}건</span>
                      </td>
                      <td style={{ padding: '9px 14px', fontSize: 14, fontWeight: 800, color: '#4f46e5', textAlign: 'right', borderBottom: `1px solid #c7d2fe`, borderTop: `2px solid #6366f1`, whiteSpace: 'nowrap' }}>
                        {fmtAmount(dayTotal)}
                      </td>
                    </tr>,
                    // 기사 소그룹
                    ...sortedDriverKeys.flatMap(key => renderDriverGroup(key, driverMap[key], true))
                  ]
                })}

                {/* 전체 합계 */}
                <tr style={{ background: '#f0fdf4' }}>
                  <td colSpan={6} style={td({ textAlign: 'right', fontWeight: 700, color: muted, borderBottom: 'none', borderTop: `2px solid ${border}` })}>전체 합계</td>
                  <td style={td({ textAlign: 'right', fontWeight: 700, color: green, fontSize: 15, borderBottom: 'none', borderTop: `2px solid ${border}`, whiteSpace: 'nowrap' })}>
                    {fmtAmount(totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {editBilling && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:400, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:15, color:navy }}>청구 정보 수정</div>
              <button onClick={()=>setEditBilling(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
            </div>
            <div style={{ padding:18 }}>
              <div style={{ fontSize:13, color:muted, marginBottom:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{editBilling.address}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <div style={{ fontSize:11, color:muted, marginBottom:4 }}>청구 날짜</div>
                    <input type="date" value={editForm.billing_date} onChange={e=>setF('billing_date',e.target.value)} style={iStyle}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:muted, marginBottom:4 }}>작업인원</div>
                    <select value={editForm.billing_workers} onChange={e=>setF('billing_workers',e.target.value)} style={iStyle}>
                      {['1','2','3','4'].map(n=><option key={n} value={n}>{n}인</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>폐기물량</div>
                  <input value={editForm.billing_waste} onChange={e=>setF('billing_waste',e.target.value)} placeholder="예: 2톤" style={iStyle}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <div style={{ fontSize:11, color:muted, marginBottom:4 }}>단가 (만원)</div>
                    <input type="number" value={editForm.billing_amount} onChange={e=>setF('billing_amount',e.target.value)} placeholder="0" style={iStyle}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:muted, marginBottom:4 }}>상차비 (만원)</div>
                    <input type="number" value={editForm.billing_unit} onChange={e=>setF('billing_unit',e.target.value)} placeholder="0" style={iStyle}/>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>청구금액 (만원, VAT 포함 자동계산)</div>
                  <input type="number" value={editForm.billing_total} onChange={e=>setF('billing_total',e.target.value)} placeholder="0" style={{ ...iStyle, fontWeight:700, color:navy }}/>
                  {editForm.billing_total && (
                    <div style={{ fontSize:12, color:green, marginTop:4 }}>= {(Math.round(parseFloat(editForm.billing_total)*10000)).toLocaleString()}원</div>
                  )}
                </div>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  <Btn onClick={()=>setEditBilling(null)} outline style={{ flex:1, padding:'10px 0' }}>취소</Btn>
                  <Btn onClick={saveEdit} style={{ flex:2, padding:'10px 0' }}>저장</Btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {confirmDel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1010, padding:16, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, maxWidth:320, width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🗑️</div>
            <div style={{ fontWeight:700, fontSize:15, color:navy, marginBottom:8 }}>청구 정보 삭제</div>
            <div style={{ fontSize:13, color:muted, marginBottom:20 }}>청구 정보만 삭제됩니다.<br/>일정은 유지됩니다.</div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={()=>setConfirmDel(null)} outline style={{ flex:1, padding:'10px 0' }}>취소</Btn>
              <Btn onClick={()=>deleteBilling(confirmDel)} style={{ flex:1, padding:'10px 0', background:red, borderColor:red }}>삭제</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
