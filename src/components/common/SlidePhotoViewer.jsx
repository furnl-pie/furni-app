import { useState } from 'react'
import { border } from '../../constants/styles'

export default function SlidePhotoViewer({ photos, onOpen }) {
  const [cur, setCur] = useState(0)
  const total = photos.length
  if (total === 0) return null

  const prev = e => { e.stopPropagation(); setCur(i => (i - 1 + total) % total) }
  const next = e => { e.stopPropagation(); setCur(i => (i + 1) % total) }

  return (
    <div style={{ position:'relative', width:'100%', borderRadius:10, overflow:'hidden', background:'#000', aspectRatio:'4/3' }}>
      <img
        src={photos[cur]} alt={`사진${cur+1}`}
        onClick={() => onOpen && onOpen(cur)}
        style={{ width:'100%', height:'100%', objectFit:'contain', cursor: onOpen ? 'pointer' : 'default', display:'block' }}
      />
      {total > 1 && (
        <button onClick={prev} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', color:'#fff', fontSize:32, width:48, height:48, borderRadius:'50%', cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
      )}
      {total > 1 && (
        <button onClick={next} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.55)', border:'none', color:'#fff', fontSize:32, width:48, height:48, borderRadius:'50%', cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
      )}
      <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,.55)', color:'#fff', fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:12, whiteSpace:'nowrap' }}>
        {cur + 1} / {total}
      </div>
      {total > 1 && total <= 8 && (
        <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5, marginTop:0 }}>
          {photos.map((_,i) => (
            <div key={i} onClick={e=>{ e.stopPropagation(); setCur(i) }}
              style={{ width: i===cur?14:7, height:7, borderRadius:4, background: i===cur?'#fff':'rgba(255,255,255,.45)', cursor:'pointer', transition:'all .2s' }}/>
          ))}
        </div>
      )}
    </div>
  )
}
