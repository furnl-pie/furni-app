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

// onBackgroundMessage 미등록 시 Firebase 동작:
// - 앱 열려있을 때(foreground): 페이지의 onMessage가 처리, 시스템 알림 자동 억제
// - 앱 닫혀있을 때(background): Firebase SW가 notification 필드로 자동 표시
// → onBackgroundMessage 등록 시 Firebase 자동 표시가 억제되어 직접 처리해야 하므로 제거
