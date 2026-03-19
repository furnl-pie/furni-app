// src/hooks/useAppData.js
// Firebase Firestore + Cloudinary 이미지 업로드
import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/firebase'
import {
  collection, doc,
  setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch,
  serverTimestamp,
} from 'firebase/firestore'

const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET

// ── base64 → Cloudinary 업로드 후 URL 반환 ──────────────────────
async function uploadToCloudinary(base64DataUrl) {
  // 이미 URL이면 그대로 반환 (기존 업로드 사진)
  if (!base64DataUrl.startsWith('data:')) return base64DataUrl

  const formData = new FormData()
  formData.append('file', base64DataUrl)
  formData.append('upload_preset', PRESET)
  formData.append('folder', 'dispatch')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) throw new Error('사진 업로드 실패')
  const data = await res.json()
  return data.secure_url
}

// 여러 장 병렬 업로드
async function uploadPhotos(base64Array) {
  return Promise.all(base64Array.map(uploadToCloudinary))
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
        }, err => setError(err.message))

        unsubSchedules = onSnapshot(collection(db, 'schedules'), snap => {
          setSchedules(snap.docs.map(d => ({ ...d.data(), id: d.id })))
          setLoading(false)
        }, err => { setError(err.message); setLoading(false) })

      } catch (e) {
        setError(e.message)
        setLoading(false)
      }
    }

    init()
    return () => { unsubUsers?.(); unsubSchedules?.() }
  }, [])

  // ── 로그인 ────────────────────────────────────────────────────
  const login = useCallback((id, pw) => {
    const user = users.find(u => u.id === id && u.pw === pw)
    if (!user) return { error: '아이디 또는 비밀번호가 올바르지 않습니다' }
    return { user }
  }, [users])

  // ── 일정 추가 ─────────────────────────────────────────────────
  const addSchedules = useCallback(async (list) => {
    const batch = writeBatch(db)
    list.forEach(s => {
      const id  = 's' + Date.now() + Math.random().toString(36).slice(2)
      const ref = doc(db, 'schedules', id)
      batch.set(ref, {
        photos: [], schedule_photos: [], driver_note: '',
        status: '대기', sms_sent: false,
        depart_time: null, start_time: null, end_time: null,
        eta: null, est_waste: '', est_duration: '', final_waste: '',
        createdAt: serverTimestamp(),
        ...s, id,
      })
    })
    await batch.commit()
  }, [])

  // ── 일정 수정 (사진은 Cloudinary 업로드 후 URL 저장) ──────────
  const updateSchedule = useCallback(async (id, patch) => {
    // 낙관적 업데이트 (UI 즉시 반영)
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

    try {
      let finalPatch = { ...patch }

      // 완료 사진에 base64가 있으면 Cloudinary 업로드
      if (patch.photos?.some(p => p.startsWith('data:'))) {
        finalPatch.photos = await uploadPhotos(patch.photos)
        setSchedules(prev => prev.map(s =>
          s.id === id ? { ...s, photos: finalPatch.photos } : s
        ))
      }

      // 일정 사진(관리자 첨부)도 동일하게 처리
      if (patch.schedule_photos?.some(p => p.startsWith('data:'))) {
        finalPatch.schedule_photos = await uploadPhotos(patch.schedule_photos)
        setSchedules(prev => prev.map(s =>
          s.id === id ? { ...s, schedule_photos: finalPatch.schedule_photos } : s
        ))
      }

      // 작업 시작 현장 사진도 동일하게 처리
      if (patch.work_photos?.some(p => p.startsWith('data:'))) {
        finalPatch.work_photos = await uploadPhotos(patch.work_photos)
        setSchedules(prev => prev.map(s =>
          s.id === id ? { ...s, work_photos: finalPatch.work_photos } : s
        ))
      }

      await updateDoc(doc(db, 'schedules', id), {
        ...finalPatch,
        updatedAt: serverTimestamp(),
      })
    } catch (e) {
      setError('저장 실패: ' + e.message)
    }
  }, [])

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
      await setDoc(doc(db, 'users', d.id), { role: 'driver', ...d })
      return {}
    } catch (e) {
      return { error: e.message }
    }
  }, [users])

  // ── 기사 수정 ─────────────────────────────────────────────────
  const updateDriver = useCallback(async (id, patch) => {
    await updateDoc(doc(db, 'users', id), patch)
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
