import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD

// 서버에서 서명 1회 발급 (배치 전체에서 재사용)
async function getSignature(folder) {
  const fn = httpsCallable(functions, 'getCloudinarySignature')
  const { data } = await fn({ folder })
  return data
}

// 단건 업로드 (서명 재사용)
async function uploadOne(base64DataUrl, folder, sig) {
  if (!base64DataUrl.startsWith('data:')) return base64DataUrl
  const formData = new FormData()
  formData.append('file',      base64DataUrl)
  formData.append('folder',    folder)
  formData.append('overwrite', 'false')
  formData.append('timestamp', String(sig.timestamp))
  formData.append('signature', sig.signature)
  formData.append('api_key',   sig.apiKey)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) throw new Error('사진 업로드 실패')
  const data = await res.json()
  return data.secure_url
}

// 단건 외부 노출용 (기존 호환)
export async function uploadToCloudinary(base64DataUrl, folder = 'dispatch') {
  if (!base64DataUrl.startsWith('data:')) return base64DataUrl
  const sig = await getSignature(folder)
  return uploadOne(base64DataUrl, folder, sig)
}

// 다건 배치 업로드 — 서명은 1회만 요청
export async function uploadPhotos(base64Array, folder = 'dispatch') {
  if (!base64Array.length) return []
  const sig = await getSignature(folder)
  const results = []
  const BATCH = 5
  for (let i = 0; i < base64Array.length; i += BATCH) {
    const batch = await Promise.all(
      base64Array.slice(i, i + BATCH).map(b => uploadOne(b, folder, sig))
    )
    results.push(...batch)
  }
  return results
}
