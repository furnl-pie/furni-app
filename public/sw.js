const CACHE_NAME = 'furni-v1'
const OFFLINE_URLS = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  // 이전 캐시 삭제
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  // Firebase, Cloudinary, API 요청은 항상 네트워크 우선
  const url = e.request.url
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('cloudinary') ||
      url.includes('googleapis')) {
    return
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // HTML/JS/CSS는 캐시에 저장
        if (e.request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
  )
})
