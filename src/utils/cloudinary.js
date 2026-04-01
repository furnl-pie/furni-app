const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET

export async function uploadToCloudinary(base64DataUrl, folder = 'dispatch') {
  if (!base64DataUrl.startsWith('data:')) return base64DataUrl
  const formData = new FormData()
  formData.append('file', base64DataUrl)
  formData.append('upload_preset', PRESET)
  formData.append('folder', folder)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) throw new Error('사진 업로드 실패')
  const data = await res.json()
  return data.secure_url
}

export async function uploadPhotos(base64Array, folder = 'dispatch') {
  const results = []
  const BATCH = 5
  for (let i = 0; i < base64Array.length; i += BATCH) {
    const batch = await Promise.all(
      base64Array.slice(i, i + BATCH).map(b => uploadToCloudinary(b, folder))
    )
    results.push(...batch)
  }
  return results
}
