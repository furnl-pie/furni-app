// SHA-256 내부 헬퍼
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 랜덤 salt 생성 (32자 hex)
function generateSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

// 비밀번호 해싱 → "salt:hash" 형태 반환
export async function hashPw(pw) {
  const salt = generateSalt()
  const hash = await sha256(salt + String(pw))
  return `${salt}:${hash}`
}

// 입력 pw와 저장된 pw(salt:hash 또는 구형) 비교
export async function verifyPw(pw, storedPw) {
  if (!storedPw) return false
  if (storedPw.includes(':')) {
    // 신형: salt:hash
    const [salt, hash] = storedPw.split(':')
    const computed = await sha256(salt + String(pw))
    return computed === hash
  }
  // 구형: 솔트 없는 SHA-256 또는 평문 (마이그레이션 대상)
  const oldHash = await sha256(String(pw))
  return oldHash === storedPw || storedPw === String(pw)
}

// 해시 형식인지 확인 (신형 salt:hash 또는 구형 64자 hex)
export function isHashed(pw) {
  if (!pw || typeof pw !== 'string') return false
  if (pw.includes(':')) return pw.split(':').length === 2
  return pw.length === 64 && /^[0-9a-f]+$/.test(pw)
}
