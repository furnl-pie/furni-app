import { useState, useRef, useEffect } from 'react'
import { downloadAllPhotos } from '../../utils/image'

export default function Lightbox({ photos, index, onClose }) {
  const [cur, setCur] = useState(index)
  const total = photos.length
  const prev = e => { e.stopPropagation(); setCur(i => (i - 1 + total) % total) }
  const next = e => { e.stopPropagation(); setCur(i => (i + 1) % total) }
  const touchX = useRef(null)
  const onTouchStart = e => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = e => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 40) dx < 0 ? setCur(i => (i + 1) % total) : setCur(i => (i - 1 + total) % total)
    touchX.current = null
  }

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  setCur(i => (i - 1 + total) % total)
      if (e.key === 'ArrowRight') setCur(i => (i + 1) % total)
    }
    window.addEventListener('keydown', onKey)
    window.history.pushState({ lightbox: true }, '')
    const onPop = () => onClose()
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  const download = e => {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = photos[cur]
    a.download = `완료사진_${String(cur+1).padStart(2,'0')}.jpg`
    a.click()
  }
  const downloadAll = e => { e.stopPropagation(); downloadAllPhotos(photos, '완료사진') }

  return (
    <div onClick={onClose} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.93)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:16 }}>
      {total > 1 && (
        <button onClick={prev} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:26, width:46, height:46, borderRadius:'50%', cursor:'pointer' }}>‹</button>
      )}
      <img src={photos[cur]} alt={`사진${cur+1}`} onClick={e=>e.stopPropagation()}
        style={{ maxWidth:'100%', maxHeight:'82vh', borderRadius:10, objectFit:'contain', boxShadow:'0 8px 40px rgba(0,0,0,.6)' }}/>
      {total > 1 && (
        <button onClick={next} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:26, width:46, height:46, borderRadius:'50%', cursor:'pointer' }}>›</button>
      )}
      <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:16, width:36, height:36, borderRadius:'50%', cursor:'pointer' }}>✕</button>

      <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:10, background:'rgba(0,0,0,.55)', padding:'6px 14px', borderRadius:20 }}>
        <span style={{ color:'rgba(255,255,255,.7)', fontSize:13 }}>{cur+1} / {total}</span>
        <button onClick={download}
          style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          ⬇ 이 사진
        </button>
        {total > 1 && (
          <button onClick={downloadAll}
            style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            ⬇ 전체 {total}장
          </button>
        )}
      </div>
    </div>
  )
}
