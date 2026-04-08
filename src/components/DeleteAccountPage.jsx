import { useState } from 'react'

export default function DeleteAccountPage({ onSubmit }) {
  const [form, setForm]   = useState({ userId: '', name: '', phone: '', reason: '' })
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [errMsg, setErrMsg] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setErrMsg('이름과 연락처는 필수 입력 항목입니다.')
      return
    }
    setErrMsg('')
    setStatus('loading')
    try {
      await onSubmit({
        userId: form.userId.trim(),
        name:   form.name.trim(),
        phone:  form.phone.trim(),
        reason: form.reason.trim(),
      })
      setStatus('done')
    } catch (e) {
      setErrMsg('요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      setStatus('idle')
    }
  }

  const inp = {
    width: '100%', padding: '11px 14px', fontSize: 14,
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    background: '#f9fafb', color: '#111827', outline: 'none',
    boxSizing: 'border-box', fontFamily: "inherit",
  }

  if (status === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Noto Sans KR', sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#166534', marginBottom: 10 }}>요청이 접수되었습니다</div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
            계정 삭제 요청이 접수되었습니다.<br/>
            관리자 확인 후 처리될 예정입니다.<br/>
            <span style={{ fontWeight: 600, color: '#374151' }}>처리 완료 시 별도로 안내드리지 않으며,<br/>7일 이내에 삭제가 진행됩니다.</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fef2f2 0%,#f9fafb 60%,#fef9ee 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,.08)', border: '1px solid #f3f4f6' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>계정 삭제 요청</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 6, lineHeight: 1.6 }}>
            계정 및 관련 데이터 삭제를 요청합니다.<br/>
            관리자 확인 후 7일 이내 처리됩니다.
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>아이디 (선택)</div>
          <input value={form.userId} onChange={set('userId')} placeholder="앱 로그인 아이디"
            style={inp} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
            이름 <span style={{ color: '#ef4444' }}>*</span>
          </div>
          <input value={form.name} onChange={set('name')} placeholder="실명 입력"
            style={inp} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
            연락처 <span style={{ color: '#ef4444' }}>*</span>
          </div>
          <input value={form.phone} onChange={set('phone')} placeholder="010-0000-0000"
            style={inp} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>삭제 사유 (선택)</div>
          <textarea value={form.reason} onChange={set('reason')} placeholder="삭제 사유를 입력해 주세요"
            rows={3}
            style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
        </div>

        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
          ⚠️ 삭제 요청 시 계정, 일정 내역 등 모든 관련 데이터가 영구 삭제되며 복구가 불가능합니다.
        </div>

        {errMsg && (
          <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
            {errMsg}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={status === 'loading'}
          style={{ width: '100%', padding: '13px 0', borderRadius: 11, border: 'none', background: status === 'loading' ? '#9ca3af' : '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {status === 'loading' ? '처리 중...' : '계정 삭제 요청'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#9ca3af' }}>
          <a href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>← 앱으로 돌아가기</a>
        </div>
      </div>
    </div>
  )
}
