import { useState, useEffect, useMemo } from 'react'
import { today, getDriverSortKey } from '../constants/styles'

export function useAdminFilters(schedules, drivers) {
  const [filterDriver,   setFD]              = useState(new Set())
  const [filterStatus,   setFStatus]         = useState('')
  const [filterDate,     setFDate]           = useState(today)
  const [driverDropOpen, setDriverDropOpen]  = useState(false)

  useEffect(() => {
    if (!driverDropOpen) return
    const handler = (e) => { if (!e.target.closest('[data-driver-drop]')) setDriverDropOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [driverDropOpen])

  const toggleDriverFilter = (val) => {
    setFD(prev => {
      const next = new Set(prev)
      if (next.has(val)) next.delete(val)
      else next.add(val)
      return next
    })
  }

  const driverOrder = (id) => {
    const i = drivers.findIndex(d => d.id === id)
    return i >= 0 ? i : 999
  }

  const baseFiltered = useMemo(() => schedules.filter(s => {
    if (filterDriver.size > 0) {
      const unassignedSelected = filterDriver.has('unassigned')
      if (!s.driver_id && !unassignedSelected) return false
      if (s.driver_id && !filterDriver.has(s.driver_id) && !filterDriver.has('all')) return false
    }
    if (filterDate && s.date !== filterDate) return false
    return true
  }), [schedules, filterDriver, filterDate])

  const filtered = useMemo(() => baseFiltered.filter(s => {
    if (filterStatus === '대기')     return s.status === '대기' && !s.billing_total
    if (filterStatus === '이동중')   return s.status === '이동중'
    if (filterStatus === '작업중')   return s.status === '진행중'
    if (filterStatus === '작업완료') return s.status === '완료' && !s.billing_total
    if (filterStatus === '청구완료') return !!s.billing_total
    return true
  }), [baseFiltered, filterStatus])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const dd = driverOrder(a.driver_id) - driverOrder(b.driver_id)
    if (dd !== 0) return dd
    const dateA = a.date || '', dateB = b.date || ''
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    const oA = a.order ?? 9999, oB = b.order ?? 9999
    if (oA !== oB) return oA - oB
    return (a.time || '').localeCompare(b.time || '')
  }), [filtered, drivers])

  const stats = {
    total:    baseFiltered.length,
    waiting:  baseFiltered.filter(s => s.status === '대기' && !s.billing_total).length,
    moving:   baseFiltered.filter(s => s.status === '이동중').length,
    working:  baseFiltered.filter(s => s.status === '진행중').length,
    workDone: baseFiltered.filter(s => s.status === '완료' && !s.billing_total).length,
    billed:   baseFiltered.filter(s => !!s.billing_total).length,
  }

  return {
    filterDriver, setFD,
    filterStatus, setFStatus,
    filterDate,   setFDate,
    driverDropOpen, setDriverDropOpen,
    toggleDriverFilter,
    baseFiltered, filtered, sorted,
    stats,
  }
}
