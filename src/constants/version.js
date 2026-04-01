// ── 앱 버전 관리 ──────────────────────────────────────────────────
// push 전에 VERSION 업데이트 + CHANGELOG 앞에 추가하면 됩니다
// 형식: v주.부.패치  (기능 추가 → 부 +1, 버그수정 → 패치 +1)

export const VERSION = 'v1.7.0'

export const CHANGELOG = [
  '관리자 설정: 전체 알림 ON/OFF 토글 추가',
  '보안: 비밀번호 SHA-256 해싱 + 자동 마이그레이션',
  '보안: 파일 업로드 MIME 타입 · 20MB 크기 검증',
  '코드 리팩토링: useAdminFilters · useDeleteMode · useAssignMode 훅 분리',
  '일정 복사시 중복 체크 후 덮어쓰기',
  '청구서 모달 한글 입력 기본값 설정',
  '보조기사 시간 다를 때 청구서 1인×2건으로 분리',
]
