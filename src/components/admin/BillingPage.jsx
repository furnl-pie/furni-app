import { useState } from 'react'
import { Btn, Card } from '../common/ui'
import { navy, blue, green, amber, border, muted, textC, iStyle, getKSTToday } from '../../constants/styles'
import { userName } from '../../utils/users'

export default function BillingPage({ schedules, onBack }) {
  const thisMonth = getKSTToday().slice(0, 7)
  const [month, setMonth] = useState(thisMonth)

  const billed = schedules
    .filter(s => s.billing_total && s.billing_date && s.billing_date.startsWith(month))
    .sort((a, b) => (b.billing_date || '').localeCompare(a.billing_date || ''))

  const totalAmount = billed.reduce((sum, s) => sum + (s.billing_total || 0), 0)

  const exportCSV = () => {
    const headers = ['날짜', '담당기사', '업체(담당자)', '주소', '폐기물량', '작업인원', '청구금액(만원)']
    const rows = billed.map(s => [
      s.date || s.billing_date || '',
      userName(s.driver_id),
      s.cname || '',
      `"${(s.address || '').replace(/"/g, '""')}"`,
      s.billing_waste || '',
      (s.billing_workers || '') + '인',
      s.billing_total || 0,
    ])
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `청구내역_${month}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Noto Sans KR', sans-serif" }}>

      {/* 헤더 */}
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

      <div style={{ padding: 16, maxWidth: 700, margin: '0 auto' }}>

        {/* 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Card style={{ textAlign: 'center', padding: '12px 6px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: navy }}>{billed.length}</div>
            <div style={{ fontSize: 13, color: muted }}>청구 건수</div>
          </Card>
          <Card style={{ textAlign: 'center', padding: '12px 6px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: green }}>{totalAmount.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: muted }}>합계 (만원)</div>
          </Card>
        </div>

        {billed.length === 0 && (
          <div style={{ textAlign: 'center', padding: 52, color: muted }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14 }}>이 달에 저장된 청구 내역이 없습니다</div>
          </div>
        )}

        {billed.map(s => (
          <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, borderLeft: `4px solid ${green}`, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 13, color: muted }}>{s.billing_date || s.date}</span>
                {s.billing_workers && (
                  <span style={{ marginLeft: 8, fontSize: 12, background: '#dbeafe', color: blue, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                    {s.billing_workers}인
                  </span>
                )}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: green }}>
                {(s.billing_total || 0).toLocaleString()}만원
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 13 }}>
              <div>
                <span style={{ color: muted }}>담당기사 </span>
                <span style={{ fontWeight: 600, color: textC }}>{userName(s.driver_id)}</span>
              </div>
              <div>
                <span style={{ color: muted }}>업체(담당자) </span>
                <span style={{ fontWeight: 600, color: textC }}>{s.cname || '-'}</span>
              </div>
              <div>
                <span style={{ color: muted }}>폐기물량 </span>
                <span style={{ fontWeight: 600, color: amber }}>{s.billing_waste || s.waste || '-'}</span>
              </div>
              <div>
                <span style={{ color: muted }}>작업일 </span>
                <span style={{ fontWeight: 600, color: textC }}>{s.date || '-'}</span>
              </div>
            </div>

            <div style={{ fontSize: 12, color: muted, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📍 {s.address}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
