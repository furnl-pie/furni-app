// ── 이미지 리사이즈 → base64 ──────────────────────────────────────
export const resizeImage = (file, maxW = 1200, quality = 0.8) => new Promise((res, rej) => {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    const scale = Math.min(1, maxW / img.width)
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(url)
    res(canvas.toDataURL('image/jpeg', quality))
  }
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('이미지 로드 실패')) }
  img.src = url
})

// 여러 파일 순차 처리 (Promise.all 대신 for-loop → 모바일 OOM 방지)
export const readFilesAsBase64 = async files => {
  const results = []
  for (const f of Array.from(files)) {
    try { results.push(await resizeImage(f)) } catch (e) {}
  }
  return results
}

// ── src → Blob 변환 ────────────────────────────────────────────────
async function srcToBlob(src, filename) {
  if (src.includes('cloudinary.com')) {
    const safePrefix = filename.replace(/\.jpg$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
    const dlUrl = src.replace('/upload/', `/upload/fl_attachment:${safePrefix}/`)
    const res = await fetch(dlUrl)
    return res.blob()
  }
  if (src.startsWith('http')) {
    const res = await fetch(src)
    return res.blob()
  }
  // base64
  const arr = src.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  const u8 = new Uint8Array(bstr.length)
  for (let j = 0; j < bstr.length; j++) u8[j] = bstr.charCodeAt(j)
  return new Blob([u8], { type: mime })
}

// ── 사진 일괄 다운로드 ─────────────────────────────────────────────
export async function downloadAllPhotos(photos, prefix = '완료사진') {
  // File System Access API 지원 시 폴더 선택 후 저장
  if (typeof window.showDirectoryPicker === 'function') {
    let dirHandle
    try {
      dirHandle = await window.showDirectoryPicker()
    } catch {
      return // 사용자가 취소
    }
    for (let i = 0; i < photos.length; i++) {
      const filename = `${prefix}_${String(i + 1).padStart(2, '0')}.jpg`
      try {
        const blob = await srcToBlob(photos[i], filename)
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      } catch (e) {
        window.open(photos[i], '_blank')
      }
    }
    return
  }

  // 폴백: 브라우저 기본 다운로드
  for (let i = 0; i < photos.length; i++) {
    const src = photos[i]
    const filename = `${prefix}_${String(i + 1).padStart(2, '0')}.jpg`
    try {
      const blob = await srcToBlob(src, filename)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      window.open(src, '_blank')
    }
    await new Promise(r => setTimeout(r, 800))
  }
}
