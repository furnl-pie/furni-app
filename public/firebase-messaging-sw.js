self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', e => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))))

// ⚠️ 아래 firebaseConfig 값을 Firebase Console → 프로젝트 설정 → 내 앱 에서 복사해서 채워주세요
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            'AIzaSyB4OXJHmSexQxWJerkfGvLcm6K_RnZaspo',
  authDomain:        'furni-app-a118d.firebaseapp.com',
  projectId:         'furni-app-a118d',
  storageBucket:     'furni-app-a118d.firebasestorage.app',
  messagingSenderId: '864776702066',
  appId:             '1:864776702066:web:63187294261576be7c5aeb',
})

const messaging = firebase.messaging()

const APP_URL = 'https://furni-app-silk.vercel.app/'

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.startsWith(APP_URL))
      if (existing) return existing.focus()
      return self.clients.openWindow(APP_URL)
    })
  )
})

const ICON  = 'https://furni-app-silk.vercel.app/icon-192.png'
const BADGE = 'https://furni-app-silk.vercel.app/icon-badge.png'

// data-only 메시지: Chrome 자동표시 없음 → onBackgroundMessage가 유일한 표시 경로
// 앱이 포그라운드면 onMessage(useFCM.js)가 처리, 여기는 백그라운드/종료 시에만 실행
messaging.onBackgroundMessage(payload => {
  const title = payload.data?.title || '배차 알림'
  const body  = payload.data?.body  || ''
  self.registration.showNotification(title, {
    body,
    icon: ICON,
    badge: BADGE,
  })
})
