import { useState } from 'react'
import { navy, blue, green, amber, border, muted, textC } from '../../constants/styles'

const Section = ({ title, children }) => (
  <div style={{ marginBottom:24 }}>
    <div style={{ fontSize:14, fontWeight:700, color:navy, borderBottom:`2px solid ${navy}`, paddingBottom:6, marginBottom:12 }}>
      {title}
    </div>
    {children}
  </div>
)

const Step = ({ num, color = blue, children }) => (
  <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
    <div style={{ width:22, height:22, borderRadius:'50%', background:color, color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
      {num}
    </div>
    <div style={{ fontSize:13, color:textC, lineHeight:1.6 }}>{children}</div>
  </div>
)

const Tip = ({ warn, children }) => (
  <div style={{ background: warn ? '#fef3c7' : '#eff6ff', borderLeft:`3px solid ${warn ? amber : blue}`, borderRadius:'0 8px 8px 0', padding:'8px 12px', margin:'8px 0', fontSize:12, color: warn ? '#92400e' : '#1e40af', lineHeight:1.6 }}>
    {children}
  </div>
)

const StatusBadge = ({ status }) => {
  const cfg = {
    '대기':   { bg:'#f1f5f9', color:'#64748b' },
    '이동중': { bg:'#dbeafe', color:'#1d4ed8' },
    '진행중': { bg:'#fef3c7', color:'#92400e' },
    '완료':   { bg:'#dcfce7', color:'#14532d' },
  }[status] || { bg:'#f1f5f9', color:'#64748b' }
  return (
    <span style={{ background:cfg.bg, color:cfg.color, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
      {status}
    </span>
  )
}

const TABS = ['기본 사용법', '업무 보고', '처리 탭', '알림/기타']

export default function HelpModal({ onClose }) {
  const [tab, setTab] = useState(0)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:3000, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:480, maxHeight:'88vh', display:'flex', flexDirection:'column' }}>

        {/* 헤더 */}
        <div style={{ padding:'16px 20px 0', borderBottom:`1px solid ${border}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:16, fontWeight:700, color:navy }}>사용 설명서</div>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
          </div>
          <div style={{ display:'flex', gap:0, overflowX:'auto' }}>
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                style={{ flex:'none', padding:'8px 14px', fontSize:12, fontWeight:600, border:'none', borderBottom:`2.5px solid ${tab===i ? blue : 'transparent'}`, color: tab===i ? blue : muted, background:'none', cursor:'pointer', whiteSpace:'nowrap' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 내용 */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px 24px' }}>

          {/* ── 탭 0: 기본 사용법 ── */}
          {tab === 0 && (
            <>
              <Section title="📱 화면 구성">
                <div style={{ fontSize:13, color:textC, lineHeight:1.8 }}>
                  <div style={{ marginBottom:6 }}><strong>상단 헤더</strong> — 이름, ⚙ 설정 (차량번호·비밀번호·알림), 로그아웃</div>
                  <div style={{ marginBottom:6 }}><strong>날짜 선택기</strong> — 일정 탭에서만 표시, 날짜별 일정 조회</div>
                  <div style={{ marginBottom:6 }}><strong>탭 바</strong> — 📋 일정 / 🚛 처리 전환</div>
                </div>
              </Section>

              <Section title="📋 일정 목록">
                <div style={{ fontSize:13, color:muted, marginBottom:10 }}>상단 날짜 선택기로 날짜를 바꾸면 해당 날짜 일정만 보입니다.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                  {[
                    ['대기', '아직 출발 전', border],
                    ['이동중', '현장으로 이동 중', blue],
                    ['진행중', '현장 작업 중', amber],
                    ['완료', '작업 완료', green],
                  ].map(([s, desc, c]) => (
                    <div key={s} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#f8fafc', borderRadius:8, borderLeft:`3px solid ${c}` }}>
                      <StatusBadge status={s}/>
                      <span style={{ fontSize:13, color:textC }}>{desc}</span>
                    </div>
                  ))}
                </div>
                <Tip>일정 카드를 탭하면 상세 화면으로 이동합니다.</Tip>
              </Section>

              <Section title="📍 일정 상세 — 현장 정보">
                <div style={{ fontSize:13, color:textC, lineHeight:1.9 }}>
                  <div>• <strong>주소 복사</strong> 버튼 → 클립보드에 복사 (네이버지도 등에 붙여넣기)</div>
                  <div>• <strong>전화 버튼</strong> → 담당자에게 바로 전화 연결</div>
                  <div>• <strong>공동/세대 비밀번호</strong> → 있는 경우에만 표시</div>
                  <div>• <strong>현장 참고 사진</strong> → 관리자가 첨부한 사진, 탭하면 확대</div>
                </div>
              </Section>
            </>
          )}

          {/* ── 탭 1: 업무 보고 ── */}
          {tab === 1 && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:16, fontSize:12, color:muted }}>
                {['대기','→','① 출발','→','② 작업시작','→','③ 완료'].map((s,i) => (
                  <span key={i} style={ s==='→' ? { color:'#cbd5e1' } : { background:'#eff6ff', color:blue, borderRadius:6, padding:'3px 8px', fontWeight:600 }}>
                    {s}
                  </span>
                ))}
              </div>

              <Section title="① 출발 보고">
                <Step num="1" color={blue}><strong>🚚 출발</strong> 버튼 탭</Step>
                <Step num="2" color={blue}>도착 예상 시간 확인 (기본값: 30분 후 반올림)</Step>
                <Step num="3" color={blue}><strong>출발 확인</strong> → 상태: 이동중, 문자앱 열림 → 내용 확인 후 전송</Step>
                <Tip>📋 <strong>출발 보고 복사</strong> 버튼으로 카카오톡 보고 양식을 복사할 수 있습니다.</Tip>
                <Tip>💬 문자 발송 후 <strong>재발송</strong>으로 ETA를 수정해 재발송 가능합니다.</Tip>
                <Tip warn>잘못 눌렀다면 <strong>출발 취소</strong> 버튼으로 대기 상태로 되돌릴 수 있습니다.</Tip>
              </Section>

              <Section title="② 작업 시작 보고">
                <Step num="1" color={green}>현장 도착 후 <strong>도착 · 작업시작</strong> 버튼 탭</Step>
                <Step num="2" color={green}>(선택) 예상 물량 · 예상 작업시간 입력</Step>
                <Step num="3" color={green}>(선택) 현장 사진 첨부</Step>
                <Step num="4" color={green}><strong>작업시작</strong> → 상태: 진행중, 시작 시간 기록</Step>
              </Section>

              <Section title="③ 작업 완료 보고">
                <Step num="1" color={amber}><strong>완료 사진</strong> 찍어 첨부</Step>
                <Step num="2" color={amber}><strong>특이사항</strong> 입력 (선택)</Step>
                <Step num="3" color={amber}><strong>최종 물량</strong> 입력</Step>
                <Step num="4" color={amber}><strong>작업완료</strong> → 상태: 완료, 종료 시간 기록</Step>
                <Tip>📋 <strong>작업 보고 복사</strong>로 작업보고서를 카카오톡에 붙여넣기 할 수 있습니다.</Tip>
                <Tip warn>완료 후에도 <strong>수정</strong> 버튼으로 사진·특이사항·물량을 변경할 수 있습니다.</Tip>
              </Section>
            </>
          )}

          {/* ── 탭 2: 처리 탭 ── */}
          {tab === 2 && (
            <>
              <Section title="🚛 처리비 보고">
                <div style={{ fontSize:13, color:muted, marginBottom:12 }}>하단 탭에서 <strong>🚛 처리</strong>를 탭해 이동합니다.</div>
                <div style={{ background:'#f8fafc', borderRadius:10, overflow:'hidden', border:`1px solid ${border}` }}>
                  {[
                    ['날짜', '오늘 날짜 자동 입력'],
                    ['처리시간', '직접 입력'],
                    ['처리장', 'HK (기본) / 강서천일 / 기타(직접입력)'],
                    ['처리비용', '납부한 금액'],
                    ['적재량', '처리한 물량'],
                    ['차량번호', '등록된 번호 자동 입력'],
                    ['상성', '혼합(기본) / 목재 / 왈가닥 / 기타'],
                    ['특이사항', '선택 입력'],
                    ['사진', '영수증 등 첨부 (선택)'],
                  ].map(([k, v], i) => (
                    <div key={k} style={{ display:'flex', gap:10, padding:'8px 12px', borderBottom: i < 8 ? `1px solid ${border}` : 'none', background: i%2===0 ? '#fff' : '#f8fafc' }}>
                      <span style={{ fontWeight:600, color:textC, fontSize:13, minWidth:72 }}>{k}</span>
                      <span style={{ fontSize:12, color:muted }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:12 }}>
                  <Step num="1" color={navy}>항목 입력 후 (선택) 사진 첨부</Step>
                  <Step num="2" color={navy}><strong>보고 제출</strong> 버튼 탭</Step>
                </div>
              </Section>

              <Section title="📅 내 처리 기록 조회">
                <div style={{ fontSize:13, color:textC, lineHeight:1.8 }}>
                  보고 양식 아래에 날짜별 내 처리 기록이 표시됩니다.<br/>
                  날짜 선택기로 과거 기록도 조회할 수 있습니다.
                </div>
              </Section>
            </>
          )}

          {/* ── 탭 3: 알림/기타 ── */}
          {tab === 3 && (
            <>
              <Section title="🔔 알림 종류">
                {[
                  ['새 일정 배정', '관리자가 일정을 배정했을 때'],
                  ['일정 변경', '날짜·시간·주소 등이 바뀌었을 때'],
                  ['일정 취소', '일정이 취소됐을 때'],
                  ['순서 변경', '방문 순서가 바뀌었을 때 (60초 단위)'],
                ].map(([t, d]) => (
                  <div key={t} style={{ display:'flex', gap:10, padding:'8px 12px', background:'#f8fafc', borderRadius:8, marginBottom:6, fontSize:13 }}>
                    <span style={{ fontWeight:600, color:textC, minWidth:80 }}>{t}</span>
                    <span style={{ color:muted }}>{d}</span>
                  </div>
                ))}
                <Tip warn>알림이 오지 않으면 스마트폰 설정 → 브라우저 앱 → 알림 권한을 허용으로 바꿔주세요.</Tip>
              </Section>

              <Section title="⚙ 설정">
                <Step num="1">상단 헤더 <strong>⚙ 설정</strong> 버튼 탭</Step>
                <div style={{ fontSize:13, color:textC, lineHeight:1.8, marginBottom:8 }}>
                  <div>• <strong>차량번호</strong> — 입력 후 저장 버튼 탭 (처리 탭에 자동 입력)</div>
                  <div>• <strong>비밀번호 변경</strong> — 현재 비밀번호 → 새 비밀번호(4자 이상) → 변경</div>
                  <div>• <strong>알림 설정</strong> — 푸시 알림 허용/차단 상태 확인 및 허용</div>
                </div>
                <Tip warn>비밀번호를 잊어버린 경우 관리자에게 초기화를 요청하세요.</Tip>
              </Section>

              <Section title="🚪 로그아웃">
                <div style={{ fontSize:13, color:textC, lineHeight:1.9 }}>
                  <div>• 헤더의 <strong>로그아웃</strong> 버튼 탭 → 즉시 로그아웃</div>
                  <div>• 스마트폰 <strong>뒤로가기</strong> → 로그아웃 확인 팝업</div>
                </div>
              </Section>

              <Section title="❓ 자주 묻는 질문">
                {[
                  ['일정이 안 보여요', '상단 날짜가 오늘로 되어 있는지 확인하세요.'],
                  ['출발을 잘못 눌렀어요', '일정 상세에서 출발 취소 버튼으로 되돌릴 수 있습니다.'],
                  ['완료 후 사진 추가?', '완료 상태에서 수정 버튼을 눌러 사진을 추가할 수 있습니다.'],
                  ['처리비 잘못 제출했어요', '처리 탭의 해당 기록에서 직접 삭제할 수 있습니다.'],
                ].map(([q, a]) => (
                  <div key={q} style={{ background:'#f8fafc', border:`1px solid ${border}`, borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:blue, marginBottom:4 }}>Q. {q}</div>
                    <div style={{ fontSize:12, color:muted }}>{a}</div>
                  </div>
                ))}
              </Section>

              <div style={{ textAlign:'center', marginTop:8 }}>
                <a href="/driver-help.html" target="_blank"
                  style={{ display:'inline-block', background:navy, color:'#fff', borderRadius:8, padding:'10px 24px', fontSize:13, fontWeight:600, textDecoration:'none' }}>
                  🖨 PDF 버전 보기
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
