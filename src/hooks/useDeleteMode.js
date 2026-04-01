import { useState } from 'react'

export function useDeleteMode(sorted, onDelete) {
  const [deleteMode,       setDeleteMode]       = useState(false)
  const [checkedIds,       setCheckedIds]       = useState(new Set())
  const [showDelConfirm,   setDelConfirm]       = useState(false)
  const [confirmSingleDel, setConfirmSingleDel] = useState(null)

  const toggleCheck = (id) => setCheckedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleAll = () => setCheckedIds(prev =>
    prev.size === sorted.length ? new Set() : new Set(sorted.map(s => s.id))
  )
  const exitDeleteMode = () => { setDeleteMode(false); setCheckedIds(new Set()) }

  return {
    deleteMode, setDeleteMode,
    checkedIds, setCheckedIds,
    showDelConfirm, setDelConfirm,
    confirmSingleDel, setConfirmSingleDel,
    toggleCheck, toggleAll, exitDeleteMode,
  }
}
