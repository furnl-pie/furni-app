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

// ── 사진 전체를 그리드 이미지로 클립보드에 복사 ────────────────────
export async function copyAllPhotosAsImage(photos) {
  if (!photos.length) return false
  try {
    const blobs = await Promise.all(
      photos.map((src, i) => srcToBlob(src, `photo_${i + 1}.jpg`))
    )
    const objUrls = blobs.map(b => URL.createObjectURL(b))
    const imgs = await Promise.all(objUrls.map(url => new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = url
    })))

    const size = 360
    const cols = Math.min(3, imgs.length)
    const rows = Math.ceil(imgs.length / cols)
    const canvas = document.createElement('canvas')
    canvas.width = cols * size
    canvas.height = rows * size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    imgs.forEach((img, i) => {
      const x = (i % cols) * size
      const y = Math.floor(i / cols) * size
      const scale = Math.max(size / img.width, size / img.height)
      const sw = size / scale, sh = size / scale
      const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2
      ctx.drawImage(img, sx, sy, sw, sh, x, y, size, size)
    })
    objUrls.forEach(u => URL.revokeObjectURL(u))

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch (e) {
    console.error(e)
    return false
  }
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
// subFolders: ['기사이름', '현장주소'] 형태로 전달하면 폴더 계층 생성
export async function downloadAllPhotos(photos, prefix = '완료사진', subFolders = []) {
  // File System Access API 지원 시 폴더 선택 후 저장
  if (typeof window.showDirectoryPicker === 'function') {
    let dirHandle
    try {
      dirHandle = await window.showDirectoryPicker()
    } catch {
      return // 사용자가 취소
    }
    // 서브폴더 계층 생성
    for (const name of subFolders) {
      const safeName = name.replace(/[/\\:*?"<>|]/g, '_').slice(0, 50)
      if (safeName) dirHandle = await dirHandle.getDirectoryHandle(safeName, { create: true })
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
