import { useState, useRef, useEffect } from 'react'
import useWindowWidth from '../../utils/useWindowWidth'
import { downloadAllPhotos } from '../../utils/image'

export default function Lightbox({ photos, index, onClose }) {
  const [cur, setCur] = useState(index)
  const total = photos.length
  const thumbRef = useRef(null)
  const isPC = useWindowWidth() >= 1024

  // PC 드래그 상태
  const [pos, setPos] = useState(null) // null = 화면 중앙, {x,y} = 드래그 후 좌표
  const containerRef = useRef(null)
  const dragging = useRef(false)

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

  // 새 창으로 열기 (팝업 유지하며 이미지만 교체)
  const popupRef = useRef(null)

  const openInNewWindow = e => {
    e.stopPropagation()
    const src = photos[cur]
    if (popupRef.current && !popupRef.current.closed) {
      // 이미 열려있으면 이미지만 교체
      const img = popupRef.current.document.getElementById('popimg')
      if (img) img.src = src
      popupRef.current.focus()
    } else {
      // 새 팝업 열기
      const pw = popupRef.current = window.open('', 'photo_popup', 'width=900,height=700,resizable=yes,scrollbars=no')
      pw.document.write(`<!DOCTYPE html><html><head><title>사진 미리보기</title>
        <style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;}
        img{max-width:100%;max-height:100vh;object-fit:contain;}</style></head>
        <body><img id="popimg" src="${src}"/></body></html>`)
      pw.document.close()
    }
  }

  // cur 바뀔 때 팝업이 열려있으면 이미지 자동 교체
  useEffect(() => {
    if (!popupRef.current || popupRef.current.closed) return
    const img = popupRef.current.document.getElementById('popimg')
    if (img) img.src = photos[cur]
  }, [cur])

  // PC 드래그 핸들
  const onDragHandleMouseDown = e => {
    if (!isPC) return
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const origX = rect.left
    const origY = rect.top
    dragging.current = true

    const onMove = e => {
      if (!dragging.current) return
      setPos({ x: origX + (e.clientX - startX), y: origY + (e.clientY - startY) })
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── PC: 드래그 가능한 플로팅 패널 ──────────────────────────────────────
  if (isPC) {
    const panelPos = pos
      ? { left: pos.x, top: pos.y, transform: 'none' }
      : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

    return (
      <>
        {/* 배경 (클릭 시 닫기) */}
        <div onClick={onClose}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:3999 }} />

        {/* 플로팅 패널 */}
        <div ref={containerRef}
          style={{
            ...panelPos,
            position:'fixed',
            zIndex:4000,
            background:'#1c1c1e',
            borderRadius:14,
            boxShadow:'0 24px 72px rgba(0,0,0,.85)',
            display:'flex',
            flexDirection:'column',
            width:'min(860px, 88vw)',
            maxHeight:'92vh',
            overflow:'hidden',
            userSelect:'none',
          }}>

          {/* 드래그 핸들 / 상단 바 */}
          <div onMouseDown={onDragHandleMouseDown}
            style={{
              padding:'9px 14px',
              display:'flex',
              alignItems:'center',
              justifyContent:'space-between',
              cursor:'grab',
              background:'rgba(255,255,255,.06)',
              borderBottom:'1px solid rgba(255,255,255,.09)',
              flexShrink:0,
            }}>
            <span style={{ color:'rgba(255,255,255,.45)', fontSize:12, letterSpacing:1 }}>
              ⠿ &nbsp;사진 미리보기 &nbsp;{cur+1} / {total}
            </span>
            <button onClick={onClose}
              style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff', fontSize:13, width:28, height:28, borderRadius:'50%', cursor:'pointer', lineHeight:1 }}>
              ✕
            </button>
          </div>

          {/* 이미지 영역 */}
          <div style={{ position:'relative', flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'14px 52px', minHeight:0 }}>
            <img src={photos[cur]} alt={`사진${cur+1}`}
              style={{ maxWidth:'100%', maxHeight:'62vh', borderRadius:8, objectFit:'contain', boxShadow:'0 4px 24px rgba(0,0,0,.5)' }} />

            {total > 1 && (
              <button onClick={prev}
                style={{ position:'absolute', left:8, background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:24, width:38, height:38, borderRadius:'50%', cursor:'pointer' }}>
                ‹
              </button>
            )}
            {total > 1 && (
              <button onClick={next}
                style={{ position:'absolute', right:8, background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:24, width:38, height:38, borderRadius:'50%', cursor:'pointer' }}>
                ›
              </button>
            )}
          </div>

          {/* 썸네일 (2행) */}
          {total > 1 && (
            <div style={{ padding:'0 12px', flexShrink:0 }}>
              <div ref={thumbRef}
                style={{ display:'grid', gridTemplateRows:'52px 52px', gridAutoFlow:'column', gridAutoColumns:52, gap:6, overflowX:'auto', padding:'4px 2px', scrollbarWidth:'none' }}>
                {photos.map((p, i) => (
                  <img key={i} src={p} alt={`thumb${i+1}`}
                    onClick={e=>{ e.stopPropagation(); setCur(i) }}
                    style={{
                      width:52, height:52, objectFit:'cover', borderRadius:6, cursor:'pointer',
                      border: i===cur ? '2.5px solid #fff' : '2.5px solid transparent',
                      opacity: i===cur ? 1 : 0.5,
                      transition:'opacity .15s, border-color .15s',
                    }}/>
                ))}
              </div>
            </div>
          )}

          {/* 하단 버튼 */}
          <div style={{ padding:'8px 14px 12px', display:'flex', alignItems:'center', gap:8, justifyContent:'center', flexShrink:0 }}>
            <button onClick={openInNewWindow}
              style={{ background:'rgba(99,179,237,.25)', border:'none', color:'#90cdf4', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              ↗ 새 창
            </button>
            <button onClick={download}
              style={{ background:'rgba(255,255,255,.18)', border:'none', color:'#fff', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              ⬇ 이 사진
            </button>
            {total > 1 && (
              <button onClick={downloadAll}
                style={{ background:'rgba(255,255,255,.18)', border:'none', color:'#fff', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                ⬇ 전체 {total}장
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── 모바일: 기존 전체화면 ────────────────────────────────────────────────
  return (
    <div onClick={onClose} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.93)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:4000, padding:'16px 16px 0' }}>

      <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:16, width:36, height:36, borderRadius:'50%', cursor:'pointer', zIndex:1 }}>✕</button>

      {total > 1 && (
        <button onClick={prev} style={{ position:'absolute', left:12, top:'45%', transform:'translateY(-50%)', background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:26, width:46, height:46, borderRadius:'50%', cursor:'pointer' }}>‹</button>
      )}

      <img src={photos[cur]} alt={`사진${cur+1}`} onClick={e=>e.stopPropagation()}
        style={{ maxWidth:'100%', maxHeight:'68vh', borderRadius:10, objectFit:'contain', boxShadow:'0 8px 40px rgba(0,0,0,.6)', flexShrink:0 }}/>

      {total > 1 && (
        <button onClick={next} style={{ position:'absolute', right:12, top:'45%', transform:'translateY(-50%)', background:'rgba(255,255,255,.18)', border:'none', color:'#fff', fontSize:26, width:46, height:46, borderRadius:'50%', cursor:'pointer' }}>›</button>
      )}

      {total > 1 && (
        <div onClick={e=>e.stopPropagation()} style={{ marginTop:12, width:'100%', maxWidth:520, flexShrink:0 }}>
          <div ref={thumbRef} style={{ display:'grid', gridTemplateRows:'48px 48px', gridAutoFlow:'column', gridAutoColumns:48, gap:5, overflowX:'auto', padding:'4px 2px', scrollbarWidth:'none' }}>
            {photos.map((p, i) => (
              <img key={i} src={p} alt={`thumb${i+1}`}
                onClick={e=>{ e.stopPropagation(); setCur(i) }}
                style={{ width:48, height:48, objectFit:'cover', borderRadius:6, cursor:'pointer', border: i===cur ? '2.5px solid #fff' : '2.5px solid transparent', opacity: i===cur ? 1 : 0.5, transition:'opacity .15s, border-color .15s' }}/>
            ))}
          </div>
        </div>
      )}

      <div onClick={e=>e.stopPropagation()}
        style={{ margin:'10px 0 14px', display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,.55)', padding:'6px 14px', borderRadius:20, flexShrink:0, flexWrap:'wrap', justifyContent:'center' }}>
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
