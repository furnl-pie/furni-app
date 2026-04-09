import { useState } from 'react'
import { navy, blue, green, amber, red, border, muted, textC } from '../../constants/styles'

const Section = ({ title, children }) => (
  <div style={{ marginBottom:24 }}>
    <div style={{ fontSize:13, fontWeight:700, color:'#111827', borderBottom:'2px solid #eaecf0', paddingBottom:6, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ display:'inline-block', width:3, height:14, background:'#6366f1', borderRadius:2 }}/>
      {title}
    </div>
    {children}
  </div>
)

const Step = ({ num, color = '#6366f1', children }) => (
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

const Row = ({ label, desc }) => (
  <div style={{ display:'flex', gap:10, padding:'8px 12px', background:'#f8fafc', borderRadius:8, marginBottom:6, fontSize:13 }}>
    <span style={{ fontWeight:600, color:textC, minWidth:90, flexShrink:0 }}>{label}</span>
    <span style={{ color:muted }}>{desc}</span>
  </div>
)

const TABS = ['기본 화면', '일정 등록', '기사 배정', '처리·청구', '채팅·의견·기타']

export default function AdminHelpModal({ onClose }) {
  const [tab, setTab] = useState(0)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:3000, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:520, maxHeight:'88vh', display:'flex', flexDirection:'column' }}>

        {/* 헤더 */}
        <div style={{ padding:'16px 20px 0', borderBottom:`1px solid ${border}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>관리자 사용 설명서</div>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9ca3af' }}>✕</button>
          </div>
          <div style={{ display:'flex', gap:0, overflowX:'auto' }}>
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)}
                style={{ flex:'none', padding:'8px 12px', fontSize:12, fontWeight:600, border:'none', borderBottom:`2.5px solid ${tab===i ? '#6366f1' : 'transparent'}`, color: tab===i ? '#6366f1' : '#9ca3af', background:'none', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 내용 */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px 24px' }}>

          {/* ── 탭 0: 기본 화면 ── */}
          {tab === 0 && (
            <>
              <Section title="📊 상단 통계 카드">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                  {[['전체','해당 날짜 전체 일정 수',navy],['미배치','기사 미배정 건수',red],['진행중','현재 작업 중인 건수',amber],['완료','완료된 건수',green]].map(([l,d,c])=>(
                    <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 6px', textAlign:'center', border:`1.5px solid ${c}22` }}>
                      <div style={{ fontSize:16, fontWeight:700, color:c }}>N</div>
                      <div style={{ fontSize:11, color:muted, marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <Tip warn>⚠️ 미배치 건수가 있으면 붉은 경고 배너가 표시됩니다. 각 일정의 ✏️ 버튼으로 바로 배정하세요.</Tip>
              </Section>

              <Section title="🔍 날짜 · 기사 필터">
                <Row label="날짜 선택기" desc="해당 날짜의 일정만 표시됩니다."/>
                <Row label="전체 버튼" desc="기사 필터 해제 — 모든 기사 일정 표시"/>
                <Row label="기사 이름 버튼" desc="해당 기사 일정만 필터링 (복수 선택 가능)"/>
                <Row label="미배치 버튼" desc="기사 미배정 일정만 표시"/>
                <Tip>기사 버튼은 복수 선택이 가능합니다. 예) A기사 + B기사만 보기</Tip>
              </Section>

              <Section title="≡ 표 / ⊞ 카드 보기 전환">
                <Row label="표 보기" desc="드래그앤드롭으로 순서·기사 변경 가능. 데스크톱 권장."/>
                <Row label="카드 보기" desc="모바일 친화적 레이아웃. 일정 카드 탭으로 상세 진입."/>
              </Section>

              <Section title="📋 일정 상세 (카드 탭)">
                <div style={{ fontSize:13, color:textC, lineHeight:1.9 }}>
                  <div>• 업체명 · 주소 · 시간 · 폐기물량 · 연락처 · 비밀번호 확인</div>
                  <div>• <strong>기사 배정</strong> 변경 (배정 기사 클릭)</div>
                  <div>• <strong>현장 참고 사진</strong> 첨부 · 삭제</div>
                  <div>• <strong>작업 진행 사진</strong> (기사 현장 사진) 확인</div>
                  <div>• <strong>완료 사진</strong> · 특이사항 · 최종 물량 확인</div>
                  <div>• <strong>청구 정보</strong> 입력 (인원·폐기물양·단가·부가세)</div>
                </div>
              </Section>
            </>
          )}

          {/* ── 탭 1: 일정 등록 ── */}
          {tab === 1 && (
            <>
              <Section title="+ 일정 등록 버튼">
                <div style={{ fontSize:13, color:muted, marginBottom:12 }}>세 가지 입력 방식을 지원합니다.</div>
                <div style={{ background:'#f8fafc', border:`1px solid ${border}`, borderRadius:10, overflow:'hidden', marginBottom:16 }}>
                  {[
                    ['📊 엑셀 붙여넣기', '엑셀에서 범위 복사(Ctrl+C) → 붙여넣기(Ctrl+V) → 컬럼 매핑 확인 → 가져오기'],
                    ['💬 카카오톡', '스케줄방 메시지 복사 → 붙여넣기 → 파싱 결과 확인 → 가져오기'],
                    ['✏️ 직접 입력', '행 추가 버튼으로 수동 입력. 날짜 일괄 변경 가능.'],
                  ].map(([k,v],i)=>(
                    <div key={k} style={{ display:'flex', gap:10, padding:'10px 14px', borderBottom:i<2?`1px solid ${border}`:'none', background:i%2===0?'#fff':'#f8fafc' }}>
                      <span style={{ fontWeight:700, color:navy, fontSize:13, minWidth:110, flexShrink:0 }}>{k}</span>
                      <span style={{ fontSize:12, color:muted, lineHeight:1.6 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <Tip>엑셀 컬럼 매핑: 날짜·진입시간·주소·폐기물양·업체명·전화번호·공동비밀번호·세대비밀번호·비고·담당기사명·특이사항 지원</Tip>
                <Tip>카카오톡 형식 — <strong>업체명 → 날짜/시간 → 주소 → 공동/세대 비밀번호 → 폐기물량 → 전화번호</strong> 순서로 자동 파싱</Tip>
              </Section>

              <Section title="중복 일정 처리">
                <div style={{ fontSize:13, color:textC, lineHeight:1.8, marginBottom:10 }}>
                  같은 날짜 + 주소 일정이 이미 존재할 때 선택 화면이 나타납니다.
                </div>
                <Row label="📋 빈 항목 병합" desc="기존 일정의 비어 있는 항목(비밀번호·메모 등)만 새 값으로 채웁니다."/>
                <Row label="⏭ 중복 제외 등록" desc="중복 건은 건너뛰고 신규 건만 등록합니다."/>
                <Tip warn>병합은 기존에 값이 있는 항목은 덮어쓰지 않습니다. 수정이 필요하면 상세 화면에서 직접 변경하세요.</Tip>
              </Section>

              <Section title="일정 복사 · 날짜 이동">
                <div style={{ fontSize:13, color:textC, lineHeight:1.8, marginBottom:8 }}>
                  일정 카드(카드 보기) 또는 행(표 보기)의 <strong>📋 복사/이동</strong> 버튼을 탭합니다.
                </div>
                <Row label="이동" desc="날짜·시간·기사·물량을 변경하고 기존 일정을 수정합니다."/>
                <Row label="복사" desc="새 일정으로 복제합니다. 상태는 '대기'로 초기화됩니다."/>
              </Section>
            </>
          )}

          {/* ── 탭 2: 기사 배정 ── */}
          {tab === 2 && (
            <>
              <Section title="✏️ 개별 배정">
                <Step num="1" color={blue}>일정 카드 또는 행의 <strong>✏️ 버튼</strong> 클릭</Step>
                <Step num="2" color={blue}>기사 선택 후 체크 버튼</Step>
                <Tip>공동 기사(보조)도 동일한 방식으로 배정할 수 있습니다.</Tip>
              </Section>

              <Section title="👥 일괄 배정">
                <Step num="1" color={green}><strong>👥 일괄 배정</strong> 버튼 클릭 → 체크박스 활성화</Step>
                <Step num="2" color={green}>배정할 일정 체크박스 선택 (상단 체크박스로 전체 선택)</Step>
                <Step num="3" color={green}>기사 선택 드롭다운에서 기사 선택</Step>
                <Step num="4" color={green}><strong>✓ N건 배정</strong> 버튼 클릭</Step>
              </Section>

              <Section title="🖱 드래그앤드롭 (표 보기)">
                <div style={{ fontSize:13, color:textC, lineHeight:1.8, marginBottom:10 }}>
                  표 보기에서 행을 드래그해 순서나 담당 기사를 바꿀 수 있습니다.
                </div>
                <Row label="같은 기사 내" desc="행을 위아래로 드래그 → 방문 순서 변경"/>
                <Row label="다른 기사 행에" desc="드롭하면 해당 기사로 재배정됩니다."/>
                <Tip warn>드래그앤드롭은 표 보기에서만 동작합니다. 모바일은 ✏️ 버튼 배정을 사용하세요.</Tip>
              </Section>

              <Section title="🗑 개별·일괄 삭제">
                <Row label="개별 삭제" desc="일정 카드 또는 행의 🗑 버튼 → 확인 팝업 → 삭제"/>
                <Row label="일괄 삭제" desc="🗑 삭제 버튼 → 체크박스 선택 → 🗑 N건 삭제"/>
                <Tip warn>삭제된 일정은 복구할 수 없습니다. 신중하게 선택하세요.</Tip>
              </Section>
            </>
          )}

          {/* ── 탭 3: 처리·청구 ── */}
          {tab === 3 && (
            <>
              <Section title="🚛 처리 현황">
                <div style={{ fontSize:13, color:muted, marginBottom:10 }}>상단 헤더의 <strong>🚛 처리</strong> 버튼으로 진입합니다.</div>
                <Row label="날짜 필터" desc="날짜별 처리 기록 조회. 시간 오름차순 정렬."/>
                <Row label="합계" desc="해당 날짜 처리비용 합계 자동 계산"/>
                <Row label="수정 버튼" desc="날짜·시간·처리장·비용·적재량·차량번호·성상·메모·사진 수정"/>
                <Row label="삭제 버튼" desc="처리 기록 삭제 (확인 팝업 표시)"/>
              </Section>

              <Section title="💰 청구 관리">
                <div style={{ fontSize:13, color:muted, marginBottom:10 }}>상단 헤더의 <strong>💰 청구</strong> 버튼으로 진입합니다.</div>
                <div style={{ fontSize:13, color:textC, lineHeight:1.9 }}>
                  <div>• 날짜 범위 선택 후 청구 내역 조회</div>
                  <div>• 각 일정의 청구 정보(인원·폐기물·단가·부가세) 확인</div>
                  <div>• 청구 합계 자동 계산</div>
                </div>
                <Tip>청구 정보는 일정 상세 화면에서 입력합니다.</Tip>
              </Section>

              <Section title="👤 기사 관리">
                <div style={{ fontSize:13, color:muted, marginBottom:10 }}>상단 헤더의 <strong>👤 기사</strong> 버튼으로 진입합니다.</div>
                <Row label="기사 추가" desc="아이디·이름·비밀번호 입력 후 추가"/>
                <Row label="비밀번호 초기화" desc="기사가 비밀번호를 분실했을 때 관리자가 초기화"/>
                <Row label="기사 삭제" desc="삭제 시 해당 기사의 일정 배정이 해제됩니다."/>
                <Row label="차량번호 등록" desc="기사 정보에서 차량번호 등록 (처리 탭 자동 입력)"/>
              </Section>

              <Section title="⚙️ 설정">
                <Row label="비밀번호 변경" desc="현재 비밀번호 확인 후 새 비밀번호 설정"/>
                <Row label="연체 알림" desc="일정 시작 시간 초과 시 관리자에게 푸시 알림 ON/OFF"/>
              </Section>
            </>
          )}

          {/* ── 탭 4: 채팅·의견·기타 ── */}
          {tab === 4 && (
            <>
              <Section title="💬 기사 채팅">
                <div style={{ fontSize:13, color:textC, lineHeight:1.8, marginBottom:10 }}>
                  일정 카드의 기사 이름 뱃지를 탭하면 해당 기사와 1:1 채팅창이 열립니다.
                </div>
                <Row label="읽지 않은 수" desc="기사 뱃지에 빨간 숫자로 미읽음 메시지 수 표시"/>
                <Row label="오늘 일정" desc="채팅창 상단에 해당 기사의 오늘 일정 목록 표시"/>
                <Row label="읽음 처리" desc="채팅창 열면 자동으로 읽음 처리됩니다."/>
                <Tip>채팅은 기사별 1:1 전용입니다. 여러 기사에게 동시에 보낼 수 없습니다.</Tip>
              </Section>

              <Section title="📬 기사 의견함">
                <div style={{ fontSize:13, color:textC, lineHeight:1.8, marginBottom:10 }}>
                  기사들이 앱에서 보낸 의견을 확인할 수 있습니다.
                </div>
                <Step num="1" color={blue}>상단 헤더의 <strong>📬 의견함</strong> 버튼 클릭</Step>
                <Step num="2" color={blue}>접수된 의견 목록 확인 (최신순)</Step>
                <div style={{ fontSize:13, color:textC, lineHeight:1.8, marginTop:8 }}>
                  <div>• 유형별 색상 구분 (버그/개선/기능/불편/기타)</div>
                  <div>• 이름·연락처·내용·제출 시각 표시</div>
                </div>
                <Tip>기사 외에도 <strong>furni-app-a118d.web.app/feedback</strong> 에서 누구나 의견을 제출할 수 있습니다.</Tip>
              </Section>

              <Section title="❓ 자주 묻는 질문">
                {[
                  ['일정이 안 보여요', '날짜 필터와 기사 필터를 확인하세요. 날짜가 오늘인지, 기사 필터가 전체인지 확인하세요.'],
                  ['기사 앱에 일정이 안 떠요', '일정에 기사 배정이 되어 있는지, 날짜가 맞는지 확인하세요.'],
                  ['중복 등록을 방지하려면', '같은 날짜+주소 일정은 등록 시 자동으로 중복 감지됩니다.'],
                  ['처리 기록을 수정하려면', '🚛 처리 페이지에서 해당 기록의 수정 버튼을 사용하세요.'],
                  ['기사 비밀번호를 잊어버렸어요', '👤 기사 관리에서 해당 기사의 비밀번호를 초기화할 수 있습니다.'],
                ].map(([q, a]) => (
                  <div key={q} style={{ background:'#f8fafc', border:`1px solid ${border}`, borderRadius:8, padding:'10px 12px', marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:blue, marginBottom:4 }}>Q. {q}</div>
                    <div style={{ fontSize:12, color:muted }}>{a}</div>
                  </div>
                ))}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
