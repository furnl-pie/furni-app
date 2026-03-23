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

// webpush.notification 필드가 있으면 Firebase SDK가 자동으로 알림을 표시함
// onBackgroundMessage에서 showNotification을 따로 호출하면 중복 발생 → 여기서는 호출하지 않음
messaging.onBackgroundMessage(() => {})
