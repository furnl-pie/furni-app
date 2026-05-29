// src/hooks/useAppData.js
import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/firebase'
import {
  collection, doc, query, where,
  setDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, writeBatch, getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { hashPw, verifyPw } from '../utils/auth'

// ── 로그인 시도 횟수 제한 ─────────────────────────────────────────
const MAX_ATTEMPTS   = 5
const LOCK_MS        = 15 * 60 * 1000  // 15분

function getRateEntry(id) {
  try {
    const raw = localStorage.getItem(`_la_${id}`)
    return raw ? JSON.parse(raw) : { count: 0, lockUntil: 0 }
  } catch { return { count: 0, lockUntil: 0 } }
}
function setRateEntry(id, entry) {
  try { localStorage.setItem(`_la_${id}`, JSON.stringify(entry)) } catch {}
}
function checkRateLimit(id) {
  const { count, lockUntil } = getRateEntry(id)
  if (lockUntil > Date.now()) {
    const remaining = Math.ceil((lockUntil - Date.now()) / 60000)
    return { locked: true, remaining }
  }
  if (lockUntil > 0) setRateEntry(id, { count: 0, lockUntil: 0 }) // 만료된 잠금 해제
  return { locked: false }
}
function recordFail(id) {
  const entry = getRateEntry(id)
  const count = (entry.lockUntil > 0 && entry.lockUntil <= Date.now()) ? 1 : entry.count + 1
  const lockUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0
  setRateEntry(id, { count, lockUntil })
}
function resetRate(id) {
  try { localStorage.removeItem(`_la_${id}`) } catch {}
}
import { uploadPhotos } from '../utils/cloudinary'

// ── 훅 ──────────────────────────────────────────────────────────
export function useAppData() {
  const [users,     setUsers]     = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // 초기 로드 범위 및 추가 조회한 날짜 추적
  const rangeRef       = useRef({ min: '', max: '' })
  const fetchedDates   = useRef(new Set())
  const usersLoadedRef = useRef(false)

  useEffect(() => {
    let unsubUsers, unsubSchedules

    const init = async () => {
      try {
        unsubUsers = onSnapshot(collection(db, 'users'), snap => {
          setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })))
          usersLoadedRef.current = true
          setLoading(false)
        }, err => { console.error('users 스냅샷 오류:', err); setError('데이터를 불러오지 못했습니다.'); setLoading(false) })

        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 7)
        const cutoffStr = cutoff.toISOString().slice(0, 10)
        const upper = new Date()
        upper.setDate(upper.getDate() + 30)
        const upperStr = upper.toISOString().slice(0, 10)
        rangeRef.current = { min: cutoffStr, max: upperStr }

        unsubSchedules = onSnapshot(query(collection(db, 'schedules'), where('date', '>=', cutoffStr), where('date', '<=', upperStr)), snap => {
          const rangeDocs = snap.docs.map(d => ({ ...d.data(), id: d.id }))
          // 범위 밖에서 추가 조회한 날짜 데이터는 보존
          setSchedules(prev => {
            const extras = prev.filter(s => s.date < cutoffStr || s.date > upperStr)
            return [...rangeDocs, ...extras]
          })
          if (usersLoadedRef.current) setLoading(false)
        }, err => { console.error('schedules 스냅샷 오류:', err); setError('데이터를 불러오지 못했습니다.'); setLoading(false) })

        // 네트워크 불안정 시 무한로딩 방지 (8초 후 강제 해제)
        setTimeout(() => {
          if (!usersLoadedRef.current) {
            setError('Firebase 연결 상태를 확인해주세요. 데이터를 불러오는 중 문제가 발생했습니다.')
          }
          setLoading(false)
        }, 8000)

      } catch (e) {
        setError(e.message)
        setLoading(false)
      }
    }

    init()
    return () => { unsubUsers?.(); unsubSchedules?.() }
  }, [])

  // ── 범위 밖 날짜 단건 조회 ────────────────────────────────────────
  const ensureDate = useCallback(async (dateStr) => {
    if (!dateStr) return
    const { min, max } = rangeRef.current
    if (min && max && dateStr >= min && dateStr <= max) return // 이미 실시간 구독 범위 내
    if (fetchedDates.current.has(dateStr)) return              // 이미 조회함
    fetchedDates.current.add(dateStr)
    try {
      const snap = await getDocs(query(collection(db, 'schedules'), where('date', '==', dateStr)))
      const newDocs = snap.docs.map(d => ({ ...d.data(), id: d.id }))
      setSchedules(prev => [...prev.filter(s => s.date !== dateStr), ...newDocs])
    } catch (e) {
      fetchedDates.current.delete(dateStr) // 실패 시 재시도 가능하도록
      console.error('날짜 조회 실패:', e)
    }
  }, [])

  // ── 로그인 (salt+SHA-256, 구형 자동 마이그레이션, 횟수 제한) ─────
  const login = useCallback(async (id, pw) => {
    const rateCheck = checkRateLimit(id)
    if (rateCheck.locked) {
      return { error: `로그인 시도 횟수 초과. ${rateCheck.remaining}분 후 다시 시도하세요.` }
    }

    const user = users.find(u => u.id === id)
    if (!user) {
      recordFail(id)
      return { error: '아이디 또는 비밀번호가 올바르지 않습니다' }
    }

    const match = await verifyPw(pw, user.pw)
    if (!match) {
      recordFail(id)
      return { error: '아이디 또는 비밀번호가 올바르지 않습니다' }
    }

    // 구형 해시(솔트 없음 또는 평문) → 신형 salt:hash 로 업그레이드 (백그라운드)
    if (!user.pw.includes(':')) {
      hashPw(pw).then(newHash =>
        updateDoc(doc(db, 'users', user.id), { pw: newHash }).catch(() => {})
      )
    }

    // 세션 토큰 생성 (30일) → sessions 컬렉션에 저장
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000
    setDoc(doc(db, 'sessions', user.id), { token, expiry }).catch(() => {})

    resetRate(id)
    return { user, sessionToken: token }
  }, [users])

  // ── 토큰으로 자동 로그인 ───────────────────────────────────────────
  const loginWithToken = useCallback(async (userId, token) => {
    if (!token || !userId) return { error: '세션 없음' }
    const user = users.find(u => u.id === userId)
    if (!user) return { error: '세션이 만료되었습니다. 다시 로그인해 주세요.' }
    try {
      const snap = await getDoc(doc(db, 'sessions', userId))
      if (!snap.exists()) return { error: '세션이 만료되었습니다. 다시 로그인해 주세요.' }
      const { token: savedToken, expiry } = snap.data()
      if (savedToken !== token) return { error: '세션이 만료되었습니다. 다시 로그인해 주세요.' }
      if (!expiry || expiry < Date.now()) return { error: '세션이 만료되었습니다. 다시 로그인해 주세요.' }
    } catch {
      return { error: '세션 확인에 실패했습니다. 다시 로그인해 주세요.' }
    }
    return { user }
  }, [users])

  // ── 세션 삭제 (로그아웃 시) ───────────────────────────────────────
  const clearSession = useCallback(async (userId) => {
    // sessions 컬렉션에서 삭제 + 구형 users 문서에 남은 필드도 정리
    deleteDoc(doc(db, 'sessions', userId)).catch(() => {})
    updateDoc(doc(db, 'users', userId), { sessionToken: null, sessionExpiry: null }).catch(() => {})
  }, [])

  // ── 일정 추가 ─────────────────────────────────────────────────
  const addSchedules = useCallback(async (list) => {
    const batch = writeBatch(db)
    const photoJobs = [] // 나중에 업로드할 사진 작업

    list.forEach(s => {
      const id  = 's' + Date.now() + Math.random().toString(36).slice(2)
      const ref = doc(db, 'schedules', id)
      // schedule_photos에 base64가 있으면 일단 빈 배열로 저장하고 나중에 업로드
      const hasBase64Photos = s.schedule_photos?.some(p => p?.startsWith('data:'))
      batch.set(ref, {
        photos: [], schedule_photos: [], driver_note: '',
        status: '대기', sms_sent: false,
        depart_time: null, start_time: null, end_time: null,
        eta: null, est_waste: '', est_duration: '', final_waste: '',
        createdAt: serverTimestamp(),
        ...s, id,
        schedule_photos: hasBase64Photos ? [] : (s.schedule_photos || []),
      })
      if (hasBase64Photos) {
        photoJobs.push({ id, date: s.date, photos: s.schedule_photos })
      }
    })
    await batch.commit()

    // 참고사진 Cloudinary 업로드 (폴더 업로드 시)
    for (const job of photoJobs) {
      const folder = `dispatch/${job.date}/${job.id}`
      const urls = await uploadPhotos(job.photos, folder)
      await updateDoc(doc(db, 'schedules', job.id), {
        schedule_photos: urls,
        updatedAt: serverTimestamp(),
      })
    }
  }, [])

  // ── 일정 수정 (사진은 Cloudinary 업로드 후 URL 저장) ──────────
  const updateSchedule = useCallback(async (id, patch) => {
    // 롤백용 이전 상태 저장
    const prevSchedules = schedules

    // 낙관적 업데이트 (UI 즉시 반영)
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

    try {
      let finalPatch = { ...patch }

      // 폴더 경로: dispatch/날짜/일정ID
      const getFolder = () => {
        const schedule = schedules.find(s => s.id === id)
        const date = schedule?.date || new Date().toISOString().slice(0, 10)
        return `dispatch/${date}/${id}`
      }

      // 완료 사진에 base64가 있으면 Cloudinary 업로드
      if (patch.photos?.some(p => p.startsWith('data:'))) {
        finalPatch.photos = await uploadPhotos(patch.photos, getFolder())
        setSchedules(prev => prev.map(s =>
          s.id === id ? { ...s, photos: finalPatch.photos } : s
        ))
      }

      // 일정 사진(관리자 첨부)도 동일하게 처리
      if (patch.schedule_photos?.some(p => p.startsWith('data:'))) {
        finalPatch.schedule_photos = await uploadPhotos(patch.schedule_photos, getFolder())
        setSchedules(prev => prev.map(s =>
          s.id === id ? { ...s, schedule_photos: finalPatch.schedule_photos } : s
        ))
      }

      // 작업 시작 현장 사진도 동일하게 처리
      if (patch.work_photos?.some(p => p.startsWith('data:'))) {
        finalPatch.work_photos = await uploadPhotos(patch.work_photos, getFolder())
        setSchedules(prev => prev.map(s =>
          s.id === id ? { ...s, work_photos: finalPatch.work_photos } : s
        ))
      }

      await updateDoc(doc(db, 'schedules', id), {
        ...finalPatch,
        updatedAt: serverTimestamp(),
      })
    } catch (e) {
      // 실패 시 UI 롤백
      setSchedules(prevSchedules)
      console.error('일정 저장 실패:', e)
      setError('저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }, [schedules])

  // ── 일정 삭제 ─────────────────────────────────────────────────
  const deleteSchedules = useCallback(async (ids) => {
    const batch = writeBatch(db)
    ids.forEach(id => batch.delete(doc(db, 'schedules', id)))
    await batch.commit()
  }, [])

  // ── 기사 추가 ─────────────────────────────────────────────────
  const addDriver = useCallback(async (d) => {
    if (users.some(u => u.id === d.id)) return { error: '이미 사용 중인 아이디입니다' }
    try {
      const pw = await hashPw(d.pw)
      await setDoc(doc(db, 'users', d.id), { role: 'driver', ...d, pw })
      return {}
    } catch (e) {
      console.error('기사 추가 실패:', e)
      return { error: '기사 추가에 실패했습니다.' }
    }
  }, [users])

  // ── 기사 수정 ─────────────────────────────────────────────────
  const updateDriver = useCallback(async (id, patch) => {
    const finalPatch = { ...patch }
    if (patch.pw) finalPatch.pw = await hashPw(patch.pw)
    await updateDoc(doc(db, 'users', id), finalPatch)
  }, [])

  // ── 기사 삭제 ─────────────────────────────────────────────────
  const deleteDriver = useCallback(async (id) => {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'users', id))
    schedules
      .filter(s => s.driver_id === id)
      .forEach(s => batch.update(doc(db, 'schedules', s.id), { driver_id: null }))
    await batch.commit()
  }, [schedules])

  // ── 계정 삭제 요청 ───────────────────────────────────────────────
  const requestAccountDeletion = useCallback(async ({ userId, name, phone, reason }) => {
    const { addDoc, collection: col } = await import('firebase/firestore')
    await addDoc(col(db, 'deletion_requests'), {
      userId: userId || '',
      name: name || '',
      phone: phone || '',
      reason: reason || '',
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  }, [])

  // ── 의견 접수 ─────────────────────────────────────────────────
  const submitFeedback = useCallback(async ({ name, phone, category, content }) => {
    const { addDoc, collection: col } = await import('firebase/firestore')
    await addDoc(col(db, 'feedbacks'), {
      name:     name || '',
      phone:    phone || '',
      category: category || '',
      content:  content || '',
      createdAt: serverTimestamp(),
    })
  }, [])

  return {
    users, schedules, loading, error,
    login, loginWithToken, clearSession,
    addSchedules, updateSchedule, deleteSchedules,
    addDriver, updateDriver, deleteDriver,
    requestAccountDeletion,
    submitFeedback,
    ensureDate,
  }
}
