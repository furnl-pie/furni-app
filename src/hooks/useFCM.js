import { useEffect } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { messaging, db } from '../lib/firebase'

const VAPID_KEY = 'BObvuk9qzRNXDNnMTPVNxCWNw5VDOjKeSS52DfnsL86O0b4XibQKvSByf4sG1r6pcgIKb3c3zdP6HI7YGjJVhRM'

export function useFCM(user, onNotification) {
  useEffect(() => {
    if (!user || !messaging || !('serviceWorker' in navigator)) return

    const init = async () => {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      try {
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
        await navigator.serviceWorker.ready
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg })
        if (token) {
          await setDoc(doc(db, 'fcm_tokens', user.id), {
            token,
            userId: user.id,
            role: user.role,
            updatedAt: new Date(),
          })
        }
      } catch (e) {
        console.error('FCM 토큰 등록 실패:', e)
      }
    }
    init()

    // 앱이 열려있을 때 포그라운드 알림
    const unsub = onMessage(messaging, payload => {
      const title = payload.notification?.title || '배차 알림'
      const body  = payload.notification?.body  || ''
      if (onNotification) onNotification(`${title}: ${body}`)
    })

    return unsub
  }, [user])
}
