// SHA-256 해싱 (Web Crypto API - 서버 불필요)
export async function hashPw(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(pw)))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 해시값인지 확인 (64자 hex)
export function isHashed(pw) {
  return typeof pw === 'string' && pw.length === 64 && /^[0-9a-f]+$/.test(pw)
}
