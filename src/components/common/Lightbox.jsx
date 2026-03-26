import { useState, useRef, useEffect } from 'react'
import { downloadAllPhotos } from '../../utils/image'

export default function Lightbox({ photos, index, onClose }) {
  const [cur, setCur] = useState(index)
  const [copied, setCopied] = useState(false)
  const total = photos.length
  const thumbRef = useRef(null)

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

  // 썸네일 스크롤 — 현재 사진이 항상 보이도록
  useEffect(() => {
    if (!thumbRef.current || total <= 1) return
    const el = thumbRef.current.children[cur]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [cur])

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

  const copyAll = async e => {
    e.stopPropagation()
    await navigator.clipboard.writeText(photos.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div onClick={onClose} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.93)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:3000, padding:'16px 16px 0' }}>

      {/* 닫기 */}
      <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:16, width:36, height:36, borderRadius:'50%', cursor:'pointer', zIndex:1 }}>✕</button>

      {/* 좌우 화살표 */}
      {total > 1 && (
        <button onClick={prev} style={{ position:'absolute', left:12, top:'45%', transform:'translateY(-50%)', background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:26, width:46, height:46, borderRadius:'50%', cursor:'pointer' }}>‹</button>
      )}

      {/* 메인 이미지 */}
      <img src={photos[cur]} alt={`사진${cur+1}`} onClick={e=>e.stopPropagation()}
        style={{ maxWidth:'100%', maxHeight:'68vh', borderRadius:10, objectFit:'contain', boxShadow:'0 8px 40px rgba(0,0,0,.6)', flexShrink:0 }}/>

      {total > 1 && (
        <button onClick={next} style={{ position:'absolute', right:12, top:'45%', transform:'translateY(-50%)', background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:26, width:46, height:46, borderRadius:'50%', cursor:'pointer' }}>›</button>
      )}

      {/* 썸네일 스트립 */}
      {total > 1 && (
        <div onClick={e=>e.stopPropagation()}
          style={{ marginTop:12, width:'100%', maxWidth:520, flexShrink:0 }}>
          <div ref={thumbRef}
            style={{ display:'flex', gap:6, overflowX:'auto', padding:'4px 2px', scrollbarWidth:'none' }}>
            {photos.map((p, i) => (
              <img key={i} src={p} alt={`thumb${i+1}`}
                onClick={e=>{ e.stopPropagation(); setCur(i) }}
                style={{
                  width:52, height:52, objectFit:'cover', borderRadius:6, flexShrink:0, cursor:'pointer',
                  border: i===cur ? '2.5px solid #fff' : '2.5px solid transparent',
                  opacity: i===cur ? 1 : 0.5,
                  transition:'opacity .15s, border-color .15s',
                }}/>
            ))}
          </div>
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div onClick={e=>e.stopPropagation()}
        style={{ margin:'10px 0 14px', display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,.55)', padding:'6px 14px', borderRadius:20, flexShrink:0, flexWrap:'wrap', justifyContent:'center' }}>
        <span style={{ color:'rgba(255,255,255,.7)', fontSize:13 }}>{cur+1} / {total}</span>
        <button onClick={download}
          style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          ⬇ 이 사진
        </button>
        {total > 1 && (<>
          <button onClick={downloadAll}
            style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            ⬇ 전체 {total}장
          </button>
          <button onClick={copyAll}
            style={{ background: copied ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.2)', border:'none', color:'#fff', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer', transition:'background .2s' }}>
            {copied ? '✓ 복사됨' : '🔗 전체 URL 복사'}
          </button>
        </>)}
      </div>
    </div>
  )
}
