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
      const snap = await db.collection('fcm_tokens').doc(userId).get()
      if (!snap.exists) return
      const token = snap.data().token
      if (!token) return
      await msg.send({
        token,
        data: { title, body },
      }).catch(e => logger.error('FCM 전송 실패:', e))
    }

    const sendToAdmins = async (title, body) => {
      const snaps = await db.collection('fcm_tokens').where('role', '==', 'admin').get()
      const tokens = snaps.docs.map(d => d.data().token).filter(Boolean)
      if (!tokens.length) return
      await msg.sendEachForMulticast({
        tokens,
        data: { title, body },
      }).catch(e => logger.error('FCM multicast 실패:', e))
    }

    // 전체 알림 비활성화 시 스킵
    const notifSettings = await db.collection('settings').doc('notifications').get()
    if (notifSettings.exists && notifSettings.data().globalEnabled === false) return

    // 일정 삭제 또는 기사 배정 취소 → 기사에게 알림
    if (!after || (!after.driver_id && before?.driver_id)) {
      const place = before?.cname || before?.address || ''
      await sendTo(before.driver_id, '일정이 취소되었습니다', `${before?.date || ''} ${place}`.trim())
      return
    }

    // 기사 새로 배정 → 해당 기사에게 알림
    if (after.driver_id && after.driver_id !== before?.driver_id) {
      const date  = after.date || ''
      const place = after.cname || after.address || ''
      await sendTo(after.driver_id, '새 일정이 배정되었습니다', `${date} ${place}`.trim())
      return
    }

    // 일정 내용 변경 → 해당 기사에게 알림 (숫자 비교 포함)
    const WATCHED = ['date', 'time', 'address', 'cname', 'waste', 'order']
    const changedKeys = before && after.driver_id
      ? WATCHED.filter(k => String(before[k] ?? '') !== String(after[k] ?? ''))
      : []
    const contentChanged = changedKeys.length > 0
    const isOrderOnly = contentChanged && changedKeys.every(k => k === 'order')

    if (contentChanged) {
      if (isOrderOnly) {
        // 순서만 변경된 경우: 60초 내 같은 기사에게 중복 발송 방지
        const debounceRef = db.collection('fcm_debounce').doc(`order_${after.driver_id}`)
        const debounceDoc = await debounceRef.get()
        const lastSent = debounceDoc.exists ? debounceDoc.data().sentAt?.toDate() : null
        const now = new Date()
        if (!lastSent || (now - lastSent) >= 60000) {
          await debounceRef.set({ sentAt: now })
          await sendTo(after.driver_id, '일정 순서가 변경되었습니다', `${after.date || ''} 일정`.trim())
        }
      } else {
        const date  = after.date || ''
        const time  = after.time ? ` ${after.time}` : ''
        const place = after.cname || after.address || ''
        await sendTo(after.driver_id, '일정이 변경되었습니다', `${date}${time} ${place}`.trim())
      }
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

    // 알림 설정 확인 (전체 알림 또는 미출발 알림 비활성화 시 스킵)
    const settingsDoc = await db.collection('settings').doc('notifications').get()
    if (settingsDoc.exists) {
      const s = settingsDoc.data()
      if (s.globalEnabled === false || s.overdueEnabled === false) return
    }

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
        data: {
          title: '⚠️ 출발 미보고',
          body: `${s.time} ${driverName} - ${place}`,
        },
      }).catch(() => null)
    }
  })
