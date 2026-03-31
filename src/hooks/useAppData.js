// src/hooks/useAppData.js
// Firebase Firestore + Cloudinary 이미지 업로드
import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/firebase'
import {
  collection, doc, query, where,
  setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { hashPw } from '../utils/auth'

const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET

// ── base64 → Cloudinary 업로드 후 URL 반환 ──────────────────────
async function uploadToCloudinary(base64DataUrl, folder = 'dispatch') {
  // 이미 URL이면 그대로 반환 (기존 업로드 사진)
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

// 여러 장 배치 업로드 (5장씩 순차 처리)
async function uploadPhotos(base64Array, folder = 'dispatch') {
  const results = []
  const BATCH = 5
  for (let i = 0; i < base64Array.length; i += BATCH) {
    const batch = await Promise.all(base64Array.slice(i, i + BATCH).map(b => uploadToCloudinary(b, folder)))
    results.push(...batch)
  }
  return results
}

// ── 훅 ──────────────────────────────────────────────────────────
export function useAppData() {
  const [users,     setUsers]     = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    let unsubUsers, unsubSchedules

    const init = async () => {
      try {
        unsubUsers = onSnapshot(collection(db, 'users'), snap => {
          setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })))
        }, err => { console.error('users 스냅샷 오류:', err); setError('데이터를 불러오지 못했습니다.') })

        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 7)
        const cutoffStr = cutoff.toISOString().slice(0, 10)
        const upper = new Date()
        upper.setDate(upper.getDate() + 30)
        const upperStr = upper.toISOString().slice(0, 10)

        unsubSchedules = onSnapshot(query(collection(db, 'schedules'), where('date', '>=', cutoffStr), where('date', '<=', upperStr)), snap => {
          setSchedules(snap.docs.map(d => ({ ...d.data(), id: d.id })))
          setLoading(false)
        }, err => { console.error('schedules 스냅샷 오류:', err); setError('데이터를 불러오지 못했습니다.'); setLoading(false) })

      } catch (e) {
        setError(e.message)
        setLoading(false)
      }
    }

    init()
    return () => { unsubUsers?.(); unsubSchedules?.() }
  }, [])

  // ── 로그인 (SHA-256 해싱 + 평문→해시 자동 마이그레이션) ─────────
  const login = useCallback(async (id, pw) => {
    const hashed = await hashPw(pw)
    const user = users.find(u => u.id === id && (u.pw === hashed || u.pw === pw))
    if (!user) return { error: '아이디 또는 비밀번호가 올바르지 않습니다' }
    // 평문으로 일치한 경우 → 해시로 업그레이드 (백그라운드)
    if (user.pw === pw && user.pw !== hashed) {
      updateDoc(doc(db, 'users', user.id), { pw: hashed }).catch(() => {})
    }
    return { user }
  }, [users])

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

  return {
    users, schedules, loading, error,
    login,
    addSchedules, updateSchedule, deleteSchedules,
    addDriver, updateDriver, deleteDriver,
  }
}
