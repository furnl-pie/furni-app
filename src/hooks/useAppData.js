// src/hooks/useAppData.js
// Firebase Firestore 연동 버전
import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/firebase'
import {
  collection, doc,
  getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, query, orderBy,
  serverTimestamp,
} from 'firebase/firestore'

export function useAppData() {
  const [users,     setUsers]     = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── 초기 로드 + 실시간 구독 ───────────────────────────────
  useEffect(() => {
    let unsubUsers, unsubSchedules

    const init = async () => {
      try {
        // users: 실시간 구독
        unsubUsers = onSnapshot(collection(db, 'users'), snap => {
          setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })))
        }, err => setError(err.message))

        // schedules: 실시간 구독 (날짜순 정렬)
       const q = collection(db, 'schedules')
        unsubSchedules = onSnapshot(q, snap => {
          setSchedules(snap.docs.map(d => ({ ...d.data(), id: d.id })))
          setLoading(false)
        }, err => { setError(err.message); setLoading(false) })

      } catch (e) {
        setError(e.message)
        setLoading(false)
      }
    }

    init()
    return () => {
      unsubUsers?.()
      unsubSchedules?.()
    }
  }, [])

  // ── 로그인 ────────────────────────────────────────────────
  const login = useCallback((id, pw) => {
    const user = users.find(u => u.id === id && u.pw === pw)
    if (!user) return { error: '아이디 또는 비밀번호가 올바르지 않습니다' }
    return { user }
  }, [users])

  // ── 일정 추가 (배치 쓰기) ────────────────────────────────
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
        ...s,
        id,
      })
    })
    await batch.commit()
    // Realtime이 자동으로 state 갱신
  }, [])

  // ── 일정 수정 ─────────────────────────────────────────────
  const updateSchedule = useCallback(async (id, patch) => {
    // 낙관적 업데이트
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    try {
      await updateDoc(doc(db, 'schedules', id), { ...patch, updatedAt: serverTimestamp() })
    } catch (e) {
      setError('저장 실패: ' + e.message)
    }
  }, [])

  // ── 일정 삭제 (배치) ─────────────────────────────────────
  const deleteSchedules = useCallback(async (ids) => {
    const batch = writeBatch(db)
    ids.forEach(id => batch.delete(doc(db, 'schedules', id)))
    await batch.commit()
  }, [])

  // ── 기사 추가 ─────────────────────────────────────────────
  const addDriver = useCallback(async (d) => {
    if (users.some(u => u.id === d.id)) return { error: '이미 사용 중인 아이디입니다' }
    try {
      await setDoc(doc(db, 'users', d.id), { role: 'driver', ...d })
      return {}
    } catch (e) {
      return { error: e.message }
    }
  }, [users])

  // ── 기사 수정 ─────────────────────────────────────────────
  const updateDriver = useCallback(async (id, patch) => {
    await updateDoc(doc(db, 'users', id), patch)
  }, [])

  // ── 기사 삭제 ─────────────────────────────────────────────
  const deleteDriver = useCallback(async (id) => {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'users', id))
    // 해당 기사 배정 일정 → 미배치
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
