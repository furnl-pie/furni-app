import { useState } from 'react'
import { Card } from '../common/ui'
import { navy, green, amber, border, muted, textC, getKSTToday } from '../../constants/styles'
import { userName, getUsers } from '../../utils/users'

export default function BillingPage({ schedules, onBack }) {
  const thisMonth = getKSTToday().slice(0, 7)
  const [month, setMonth] = useState(thisMonth)

  const billed = schedules
    .filter(s => s.billing_total && s.billing_date && s.billing_date.startsWith(month))
    .sort((a, b) => (a.billing_date || '').localeCompare(b.billing_date || ''))

  const totalAmount = billed.reduce((sum, s) => sum + (s.billing_total || 0), 0)

  // 총 작업시간만 표시 (예: 2시간30분)
  const workDuration = s => {
    if (!s.start_time || !s.end_time) return '-'
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const diff = toMin(s.end_time) - toMin(s.start_time)
    if (diff <= 0) return '-'
    const h = Math.floor(diff / 60), m = diff % 60
    return h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`
  }

  // 만원 단위 → 원 단위로 변환하여 표시 (29.7 → 297,000원)
  const fmtAmount = val => {
    if (!val) return '-'
    return (Math.round(val * 10000)).toLocaleString() + '원'
  }

  const carNum = driverId => getUsers().find(u => u.id === driverId)?.car_num || ''

  const exportCSV = () => {
    const headers = ['날짜', '담당기사', '차량번호', '업체(담당자)', '폐기물량', '청구금액(원)', '주소']
    const rows = billed.map(s => [
      s.date || s.billing_date || '',
      userName(s.driver_id),
      carNum(s.driver_id),
      s.cname || '',
      s.billing_waste || '',
      s.billing_total ? Math.round(s.billing_total * 10000) : 0,
      `"${(s.address || '').replace(/"/g, '""')}"`,
    ])
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `청구내역_${month}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const th = extra => ({
    padding: '10px 12px', background: '#f8fafc', fontSize: 12, fontWeight: 700,
    color: muted, borderBottom: `2px solid ${border}`, whiteSpace: 'nowrap',
    textAlign: 'center', ...extra,
  })
  const td = extra => ({
    padding: '10px 12px', fontSize: 13, color: textC,
    borderBottom: `1px solid ${border}`, verticalAlign: 'middle', ...extra,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Noto Sans KR', sans-serif" }}>

      <div style={{ background: navy, color: '#fff', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={onBack}
            style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}>
            ← 뒤로
          </button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>💰 청구 내역</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', WebkitTextFillColor: '#fff', fontSize: 16, colorScheme: 'dark' }} />
          <button onClick={exportCSV}
            style={{ background: green, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ⬇ 엑셀 저장
          </button>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Card style={{ textAlign: 'center', padding: '12px 6px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: navy }}>{billed.length}</div>
            <div style={{ fontSize: 13, color: muted }}>청구 건수</div>
          </Card>
          <Card style={{ textAlign: 'center', padding: '12px 6px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: green }}>{fmtAmount(totalAmount)}</div>
            <div style={{ fontSize: 13, color: muted }}>합계</div>
          </Card>
        </div>

        {billed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 52, color: muted }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14 }}>이 달에 저장된 청구 내역이 없습니다</div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={th()}>날짜</th>
                  <th style={th()}>담당기사</th>
                  <th style={th({ textAlign: 'left' })}>업체(담당자)</th>
                  <th style={th({ textAlign: 'left' })}>주소</th>
                  <th style={th()}>폐기물량</th>
                  <th style={th()}>작업시간</th>
                  <th style={th({ textAlign: 'right' })}>청구금액</th>
                </tr>
              </thead>
              <tbody>
                {billed.map((s, i) => (
                  <tr key={s.id} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={td({ textAlign: 'center', fontFamily: 'monospace', fontSize: 12 })}>{s.date || s.billing_date}</td>
                    <td style={td({ textAlign: 'center' })}>
                      <div style={{ fontWeight: 600 }}>{userName(s.driver_id)}</div>
                      {carNum(s.driver_id) && <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{carNum(s.driver_id)}</div>}
                    </td>
                    <td style={td()}>{s.cname || '-'}</td>
                    <td style={td({ fontSize: 12, color: muted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{s.address}</td>
                    <td style={td({ textAlign: 'center', fontWeight: 600, color: amber })}>{s.billing_waste || s.waste || '-'}</td>
                    <td style={td({ textAlign: 'center', fontSize: 12, color: muted })}>{workDuration(s)}</td>
                    <td style={td({ textAlign: 'right', fontWeight: 700, color: green, whiteSpace: 'nowrap' })}>
                      {fmtAmount(s.billing_total)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f0fdf4' }}>
                  <td colSpan={6} style={td({ textAlign: 'right', fontWeight: 700, color: muted, borderBottom: 'none' })}>합계</td>
                  <td style={td({ textAlign: 'right', fontWeight: 700, color: green, fontSize: 15, borderBottom: 'none', whiteSpace: 'nowrap' })}>
                    {fmtAmount(totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
