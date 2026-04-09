import { useState } from 'react'

export default function FeedbackPage({ onSubmit }) {
  const [form, setForm] = useState({ name: '', phone: '', category: '', content: '' })
  const [status, setStatus] = useState('idle') // idle | loading | done
  const [errMsg, setErrMsg] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.content.trim()) {
      setErrMsg('의견 내용을 입력해 주세요.')
      return
    }
    setErrMsg('')
    setStatus('loading')
    try {
      await onSubmit({
        name:     form.name.trim(),
        phone:    form.phone.trim(),
        category: form.category,
        content:  form.content.trim(),
      })
      setStatus('done')
    } catch {
      setErrMsg('제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      setStatus('idle')
    }
  }

  const inp = {
    width: '100%', padding: '11px 14px', fontSize: 14,
    border: '1.5px solid #e5e7eb', borderRadius: 10,
    background: '#f9fafb', color: '#111827', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  if (status === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Noto Sans KR', sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', marginBottom: 10 }}>감사합니다!</div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.8 }}>
            소중한 의견이 접수되었습니다.<br/>
            검토 후 앱 개선에 반영하겠습니다.
          </div>
          <button onClick={() => { setForm({ name:'', phone:'', category:'', content:'' }); setStatus('idle') }}
            style={{ marginTop: 24, padding: '10px 28px', borderRadius: 10, border: 'none', background: '#1B3A5C', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            추가 의견 보내기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#eff6ff 0%,#f9fafb 60%,#ecfdf5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,.08)', border: '1px solid #f3f4f6' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>의견 보내기</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 6, lineHeight: 1.6 }}>
            불편한 점, 개선 아이디어, 버그 신고 등<br/>
            무엇이든 편하게 남겨주세요.
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>유형</div>
          <select value={form.category} onChange={set('category')}
            style={{ ...inp }}>
            <option value="">선택 안 함</option>
            <option value="bug">🐛 버그 신고</option>
            <option value="improvement">💡 개선 제안</option>
            <option value="feature">✨ 기능 요청</option>
            <option value="complaint">😤 불편 사항</option>
            <option value="etc">📝 기타</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
            의견 내용 <span style={{ color: '#ef4444' }}>*</span>
          </div>
          <textarea value={form.content} onChange={set('content')}
            placeholder="자세히 적어주실수록 빠르게 반영됩니다."
            rows={5}
            style={{ ...inp, resize: 'vertical', lineHeight: 1.7 }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>이름 (선택)</div>
          <input value={form.name} onChange={set('name')} placeholder="홍길동"
            style={inp} />
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>연락처 (선택)</div>
          <input value={form.phone} onChange={set('phone')} placeholder="답변 원하시면 입력해 주세요"
            style={inp} />
        </div>

        {errMsg && (
          <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
            {errMsg}
          </div>
        )}

        <button onClick={handleSubmit} disabled={status === 'loading'}
          style={{ width: '100%', padding: '13px 0', borderRadius: 11, border: 'none', background: status === 'loading' ? '#9ca3af' : '#1B3A5C', color: '#fff', fontSize: 15, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {status === 'loading' ? '제출 중...' : '의견 보내기'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#9ca3af' }}>
          <a href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>← 앱으로 돌아가기</a>
        </div>
      </div>
    </div>
  )
}
