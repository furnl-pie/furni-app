import { useState } from 'react'

export function useAssignMode(sorted, onUpdate) {
  const [assignMode,    setAssignMode]    = useState(false)
  const [assignChecked, setAssignChecked] = useState(new Set())
  const [assignTarget,  setAssignTarget]  = useState('')

  const toggleAssignCheck = (id) => setAssignChecked(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAssignAll = () => setAssignChecked(prev =>
    prev.size === sorted.length ? new Set() : new Set(sorted.map(s => s.id))
  )
  const exitAssignMode = () => { setAssignMode(false); setAssignChecked(new Set()); setAssignTarget('') }
  const confirmAssign  = () => {
    assignChecked.forEach(id => onUpdate(id, { driver_id: assignTarget || null }))
    exitAssignMode()
  }

  return {
    assignMode, setAssignMode,
    assignChecked, setAssignChecked,
    assignTarget, setAssignTarget,
    toggleAssignCheck, toggleAssignAll,
    exitAssignMode, confirmAssign,
  }
}
