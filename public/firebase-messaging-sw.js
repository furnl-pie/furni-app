// ⚠️ 아래 firebaseConfig 값을 Firebase Console → 프로젝트 설정 → 내 앱 에서 복사해서 채워주세요
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            aSyB4OXJHmSexQxWJerkfGvLcm6K_RnZaspo,
  authDomain:        furni-app-a118d.firebaseapp.com,
  projectId:         furni-app-a118d,
  storageBucket:     furni-app-a118d.firebasestorage.app,
  messagingSenderId: 864776702066,
  appId:             1:864776702066:web:63187294261576be7c5aeb,
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || '배차 알림'
  const body  = payload.notification?.body  || ''
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  })
})
