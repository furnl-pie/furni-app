const { region, pubsub } = require('firebase-functions/v1')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')

initializeApp()

exports.onScheduleChange = region('us-central1')
  .runWith({ maxInstances: 10 })
  .firestore.document('schedules/{scheduleId}')
  .onWrite(async (change) => {
    const before = change.before.exists ? change.before.data() : null
    const after  = change.after.exists  ? change.after.data()  : null
    if (!after) return

    const db  = getFirestore()
    const msg = getMessaging()

    const logger = require('firebase-functions/logger')

    const sendTo = async (userId, title, body) => {
      logger.info('sendTo', { userId, title })
      const snap = await db.collection('fcm_tokens').doc(userId).get()
      if (!snap.exists) { logger.warn('토큰 없음:', userId); return }
      const token = snap.data().token
      if (!token) { logger.warn('토큰 값 없음:', userId); return }
      const result = await msg.send({ token, notification: { title, body, imageUrl: 'https://furni-app-silk.vercel.app/icon-512.png' }, webpush: { notification: { icon: 'https://furni-app-silk.vercel.app/icon-192.png' } } }).catch(e => { logger.error('FCM 전송 실패:', e); return null })
      logger.info('FCM 전송 결과:', result)
    }

    const sendToAdmins = async (title, body) => {
      logger.info('sendToAdmins', { title })
      const snaps = await db.collection('fcm_tokens').where('role', '==', 'admin').get()
      const tokens = snaps.docs.map(d => d.data().token).filter(Boolean)
      logger.info('관리자 토큰 수:', tokens.length)
      if (!tokens.length) return
      await msg.sendEachForMulticast({ tokens, notification: { title, body }, webpush: { notification: { icon: 'https://furni-app-silk.vercel.app/icon-192.png' } } }).catch(e => logger.error('FCM multicast 실패:', e))
    }

    logger.info('변경 감지', { driver_id: after.driver_id, status: after.status, before_driver: before?.driver_id })

    // 기사 새로 배정 → 해당 기사에게 알림
    if (after.driver_id && after.driver_id !== before?.driver_id) {
      const date  = after.date || ''
      const place = after.cname || after.address || ''
      await sendTo(after.driver_id, '새 일정이 배정되었습니다', `${date} ${place}`.trim())
      return
    }

    // 기사 배정된 상태에서 일정 내용 변경 → 해당 기사에게 알림
    const WATCHED = ['date', 'time', 'address', 'cname', 'waste', 'order']
    const contentChanged = before && after.driver_id &&
      WATCHED.some(k => (before[k] || '') !== (after[k] || ''))
    logger.info('내용 변경 여부:', contentChanged)
    if (contentChanged) {
      const date  = after.date || ''
      const time  = after.time ? ` ${after.time}` : ''
      const place = after.cname || after.address || ''
      await sendTo(after.driver_id, '일정이 변경되었습니다', `${date}${time} ${place}`.trim())
    }

    // 상태 변경 → 관리자에게 알림
    if (after.status && after.status !== before?.status) {
      const userSnap = await db.collection('users').doc(after.driver_id || '').get()
      const driverName = userSnap.exists ? userSnap.data().name : '기사'
      const place = after.cname || after.address || ''

      if (after.status === '이동중') {
        await sendToAdmins('기사 출발', `${driverName} - ${place}`)
      } else if (after.status === '완료') {
        await sendToAdmins('작업 완료', `${driverName} - ${place}`)
      }
    }
  })

// 30분마다 출발 미보고 일정 체크 → 관리자 알림
exports.checkOverdue = pubsub
  .schedule('every 30 minutes')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    const db  = getFirestore()
    const msg = getMessaging()

    // 현재 KST 시각
    const now     = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const today   = now.toISOString().slice(0, 10)
    const nowTime = now.toISOString().slice(11, 16) // HH:MM

    // 오늘 날짜 + 대기 상태 일정 조회
    const snap = await db.collection('schedules')
      .where('date', '==', today)
      .where('status', '==', '대기')
      .get()

    // 배정된 기사 있고 예약 시간이 지난 건만 필터
    const overdue = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(s => s.driver_id && s.time && s.time < nowTime)

    if (!overdue.length) return

    // 관리자 FCM 토큰
    const tokenSnaps = await db.collection('fcm_tokens').where('role', '==', 'admin').get()
    const tokens = tokenSnaps.docs.map(d => d.data().token).filter(Boolean)
    if (!tokens.length) return

    for (const s of overdue) {
      const driverSnap = await db.collection('users').doc(s.driver_id).get()
      const driverName = driverSnap.exists ? driverSnap.data().name : '기사'
      const place = s.cname || s.address || ''

      await msg.sendEachForMulticast({
        tokens,
        notification: {
          title: '⚠️ 출발 미보고',
          body: `${s.time} ${driverName} - ${place}`,
        },
      }).catch(() => null)
    }
  })
