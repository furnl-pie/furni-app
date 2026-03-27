import { useState } from 'react'
import { Btn } from '../common/ui'
import { getUsers } from '../../utils/users'
import { navy, blue, green, amber, red, border, muted, textC, iStyle } from '../../constants/styles'

export default function DriverMgrModal({ drivers, schedules, onAdd, onUpdate, onDelete, onClose }) {
  const [adding, setAdding]       = useState(false)
  const [editId, setEditId]       = useState(null)
  const [delId,  setDelId]        = useState(null)
  const [form, setForm]           = useState({ loginId:'', name:'', phone:'', pw:'', car_num:'' })
  const [editForm, setEditForm]   = useState({})
  const [idErr, setIdErr]         = useState('')
  const setF  = (k,v) => { setForm(p=>({...p,[k]:v})); if(k==='loginId') setIdErr('') }
  const setEF = (k,v) => setEditForm(p=>({...p,[k]:v}))

  const submitAdd = () => {
    if (!form.loginId||!form.name||!form.phone||!form.pw) return alert('아이디·이름·연락처·비밀번호를 모두 입력하세요')
    if (!/^[a-z0-9_\uAC00-\uD7A3\u3130-\u318F]+$/.test(form.loginId)) { setIdErr('한글·영문·숫자·_만 사용 가능합니다 (공백 불가)'); return }
    if (getUsers().some(u=>u.id===form.loginId)) { setIdErr('이미 사용 중인 아이디입니다'); return }
    onAdd({ id: form.loginId, name:form.name, phone:form.phone, pw:form.pw, car_num:form.car_num, role:'driver', driverOrder: Date.now() })
    setForm({ loginId:'', name:'', phone:'', pw:'', car_num:'' }); setAdding(false)
  }
  const startEdit = d => { setEditId(d.id); setEditForm({ loginId:d.id, name:d.name, phone:d.phone, pw:d.pw, car_num:d.car_num||'' }) }
  const submitEdit = () => { onUpdate(editId, { name:editForm.name, phone:editForm.phone, pw:editForm.pw, car_num:editForm.car_num }); setEditId(null) }

  const scheduleCount = id => schedules.filter(s=>s.driver_id===id).length

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        <div style={{ padding:'16px 20px', borderBottom:'1px solid #eaecf0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#111827' }}>👤 기사 계정 관리</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9ca3af' }}>✕</button>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:20 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
            {drivers.map((d, i)=>(
              <div key={d.id} style={{ background:'#f8fafc', borderRadius:10, border:`1px solid ${border}`, overflow:'hidden' }}>
                {editId===d.id ? (
                  <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ background:'#f1f5f9', borderRadius:7, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:muted }}>아이디 (변경 불가)</span>
                      <span style={{ fontSize:13, fontWeight:700, color:navy, fontFamily:'monospace' }}>{d.id}</span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div>
                        <div style={{ fontSize:11, color:muted, marginBottom:4 }}>이름</div>
                        <input value={editForm.name} onChange={e=>setEF('name',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
                      </div>
                      <div>
                        <div style={{ fontSize:11, color:muted, marginBottom:4 }}>연락처</div>
                        <input value={editForm.phone} onChange={e=>setEF('phone',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div>
                        <div style={{ fontSize:11, color:muted, marginBottom:4 }}>비밀번호</div>
                        <input value={editForm.pw} onChange={e=>setEF('pw',e.target.value)} style={{ ...iStyle, fontSize:13 }}/>
                      </div>
                      <div>
                        <div style={{ fontSize:11, color:muted, marginBottom:4 }}>차량번호</div>
                        <input value={editForm.car_num||''} onChange={e=>setEF('car_num',e.target.value)} placeholder="예: 12가3456" style={{ ...iStyle, fontSize:13 }}/>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <Btn onClick={()=>setEditId(null)} outline color={muted} style={{ flex:1, padding:'8px 0', fontSize:13 }}>취소</Btn>
                      <Btn onClick={submitEdit} color={blue} style={{ flex:2, padding:'8px 0', fontSize:13 }}>저장</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
                      <button
                        disabled={i===0}
                        onClick={()=>{
                          const prev = drivers[i-1]
                          onUpdate(d.id,    { driverOrder: (i-1) * 100 })
                          onUpdate(prev.id, { driverOrder: i * 100 })
                        }}
                        style={{ background:'none', border:`1px solid ${border}`, borderRadius:4, width:22, height:22, fontSize:11, cursor:i===0?'default':'pointer', color:i===0?'#ccc':muted, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        ▲
                      </button>
                      <button
                        disabled={i===drivers.length-1}
                        onClick={()=>{
                          const next = drivers[i+1]
                          onUpdate(d.id,    { driverOrder: (i+1) * 100 })
                          onUpdate(next.id, { driverOrder: i * 100 })
                        }}
                        style={{ background:'none', border:`1px solid ${border}`, borderRadius:4, width:22, height:22, fontSize:11, cursor:i===drivers.length-1?'default':'pointer', color:i===drivers.length-1?'#ccc':muted, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        ▼
                      </button>
                    </div>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <div style={{ width:38, height:38, borderRadius:'50%', background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:blue }}>
                        {d.name.slice(0,1)}
                      </div>
                      {d.online && <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:'#22c55e', border:'2px solid #fff' }}/>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:textC }}>{d.name}</div>
                      <div style={{ fontSize:12, color:muted, marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'monospace', background:'#f1f5f9', padding:'1px 6px', borderRadius:4, color:navy }}>ID: {d.id}</span>
                        <span>{d.phone}</span>
                        {d.car_num && <span style={{ fontFamily:'monospace', background:'#fefce8', padding:'1px 6px', borderRadius:4, color:amber }}>{d.car_num}</span>}
                        <span style={{ color:green }}>일정 {scheduleCount(d.id)}건</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>startEdit(d)}
                        style={{ background:'none', border:`1px solid ${border}`, borderRadius:6, padding:'5px 10px', fontSize:12, color:muted, cursor:'pointer' }}>
                        ✏️ 수정
                      </button>
                      <button onClick={()=>setDelId(d.id)}
                        style={{ background:'#fef2f2', border:`1px solid #fecaca`, borderRadius:6, padding:'5px 10px', fontSize:12, color:red, cursor:'pointer' }}>
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {drivers.length===0 && (
              <div style={{ textAlign:'center', padding:24, color:muted, fontSize:13 }}>등록된 기사가 없습니다</div>
            )}
          </div>

          {adding ? (
            <div style={{ background:'#f0f9ff', border:`1px solid #bae6fd`, borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:blue, marginBottom:14 }}>+ 새 기사 등록</div>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:muted, marginBottom:4 }}>로그인 아이디 * <span style={{ color:'#94a3b8' }}>(한글·영문·숫자·_ 가능, 공백 불가)</span></div>
                <input value={form.loginId} onChange={e=>setF('loginId', e.target.value.replace(/\s/g,''))}
                  placeholder="예: 김기사 또는 kim01" style={{ ...iStyle, fontFamily:'monospace', borderColor: idErr?red:undefined }}/>
                {idErr && <div style={{ fontSize:11, color:red, marginTop:4 }}>⚠ {idErr}</div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>이름 *</div>
                  <input value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="홍길동" style={iStyle}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>연락처 *</div>
                  <input value={form.phone} onChange={e=>setF('phone',e.target.value)} placeholder="010-0000-0000" style={iStyle}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>비밀번호 (로그인용) *</div>
                  <input value={form.pw} onChange={e=>setF('pw',e.target.value)} placeholder="숫자 4자리 권장" style={iStyle}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:muted, marginBottom:4 }}>차량번호</div>
                  <input value={form.car_num} onChange={e=>setF('car_num',e.target.value)} placeholder="예: 12가3456" style={iStyle}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Btn onClick={()=>{ setAdding(false); setForm({loginId:'',name:'',phone:'',pw:''}); setIdErr('') }} outline color={muted} style={{ flex:1, padding:'9px 0' }}>취소</Btn>
                <Btn onClick={submitAdd} style={{ flex:2, padding:'9px 0' }}>등록</Btn>
              </div>
            </div>
          ) : (
            <button onClick={()=>setAdding(true)}
              style={{ width:'100%', padding:'12px 0', border:`2px dashed ${blue}`, borderRadius:10, background:'none', color:blue, fontSize:14, fontWeight:600, cursor:'pointer' }}>
              + 기사 추가
            </button>
          )}
        </div>
      </div>

      {delId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:320, padding:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:textC, marginBottom:8 }}>기사를 삭제할까요?</div>
            <div style={{ fontSize:13, color:muted, lineHeight:1.7, marginBottom:6 }}>
              <b>{drivers.find(d=>d.id===delId)?.name}</b> 기사 계정이 삭제됩니다.
            </div>
            {scheduleCount(delId) > 0 && (
              <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:8, padding:'8px 12px', marginBottom:14, fontSize:12, color:amber }}>
                ⚠ 배정된 일정 {scheduleCount(delId)}건이 미배치로 변경됩니다.
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={()=>setDelId(null)} outline color={muted} style={{ flex:1 }}>취소</Btn>
              <Btn onClick={()=>{ onDelete(delId); setDelId(null) }} color={red} style={{ flex:2 }}>삭제</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
