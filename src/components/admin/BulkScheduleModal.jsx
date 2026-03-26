import { useState, useRef } from 'react'
import { Btn } from '../common/ui'
import { parseKoreanTime, parseDate, detectColMap, parseKakaoChat, newRow } from '../../utils/parsing'
import { navy, blue, green, amber, red, border, muted, textC, DRIVER_COLORS } from '../../constants/styles'
import { resizeImage } from '../../utils/image'

export default function BulkScheduleModal({ drivers, schedules = [], onAddMany, onUpdate, onClose }) {
  const [step, setStep]       = useState(1)
  const [inputMode, setInputMode] = useState('paste') // 'paste' | 'kakao' | 'manual' | 'folder'
  const [rows, setRows]       = useState([newRow()])
  const [assigns, setAssigns] = useState({})
  const [coAssigns, setCoAssigns] = useState({})
  const [dupeConflict, setDupeConflict] = useState(null) // { dupes, newOnes }

  // ── 폴더 업로드 상태 ────────────────────────────────────────────
  const [folderRows,    setFolderRows]    = useState([])
  const [folderMsg,     setFolderMsg]     = useState('')
  const [folderLoading, setFolderLoading] = useState(false)
  const [folderStats,   setFolderStats]   = useState(null)
  const [isDragOver,    setIsDragOver]    = useState(false)
  const folderInputRef = useRef(null)

  const [pasteRaw, setPasteRaw]   = useState('')
  const [parsed, setParsed]       = useState(null)
  const [colMap, setColMap]       = useState({})
  const [parseMsg, setParseMsg]   = useState('')

  const [kakaoRaw,  setKakaoRaw]  = useState('')
  const [kakaoRows, setKakaoRows] = useState([])
  const [kakaoMsg,  setKakaoMsg]  = useState('')

  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const todayStr = today.toISOString().slice(0, 10)

  const handlePasteInput = e => {
    const text = e.clipboardData ? e.clipboardData.getData('text') : e.target.value
    setPasteRaw(text)
    processPasteText(text)
    if (e.clipboardData) e.preventDefault()
  }

  const processPasteText = text => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
    if (!lines.length) return
    const grid = lines.map(l => l.split('\t'))
    const firstRow = grid[0]
    const detected = detectColMap(firstRow)
    const looksLikeHeader = Object.keys(detected).length >= 2
    const headers = looksLikeHeader ? firstRow : firstRow.map((_,i)=>`열${i+1}`)
    const data    = looksLikeHeader ? grid.slice(1) : grid

    const cm = looksLikeHeader ? detected : (() => {
      const auto = {}
      const fields = ['date','time','address','waste','cname','cphone','memo']
      firstRow.forEach((_,i) => { if (i < fields.length) auto[fields[i]] = i })
      return auto
    })()
    setParsed({ headers, data, looksLikeHeader })
    setColMap(cm)
    setParseMsg(looksLikeHeader
      ? `✅ ${data.length}행 감지 · 헤더 자동 인식 · 컬럼 매핑 확인 후 가져오기`
      : `⚠️ ${data.length}행 감지 · 헤더 미인식 → 열 순서(날짜/시간/주소/폐기물양/업체명/연락처/메모)로 자동 배정`)
  }

  // ── 폴더 파일 처리 ──────────────────────────────────────────────
  const collectFilesFromEntry = (entry, pathPrefix) => new Promise(resolve => {
    if (!entry) return resolve([])
    if (entry.isFile) {
      entry.getFile(
        file => resolve([{ file, relativePath: pathPrefix + file.name }]),
        () => resolve([])
      )
    } else if (entry.isDirectory) {
      const reader = entry.createReader()
      let all = []
      const read = () => {
        reader.readEntries(
          async entries => {
            if (!entries.length) return resolve(all)
            try {
              const nested = await Promise.all(
                entries.map(e => collectFilesFromEntry(e, pathPrefix + entry.name + '/'))
              )
              all = all.concat(nested.flat())
            } catch { /* 무시 */ }
            read()
          },
          () => resolve(all)
        )
      }
      read()
    } else {
      resolve([])
    }
  })

  const processFolderFiles = async (filesWithPaths) => {
    setFolderLoading(true)
    setFolderMsg('')
    setFolderRows([])
    setFolderStats(null)

    try {
      const isImg = n => /\.(jpg|jpeg|png|gif|webp|heic|bmp)$/i.test(n)
      const isTxt = n => n.toLowerCase().endsWith('.txt')

      // 서브폴더별로 그룹화 (relativePath: "root/sub/file.ext" or "root/file.ext")
      const groups = {}
      for (const { file, relativePath } of filesWithPaths) {
        const parts = relativePath.split('/')
        const subfolder = parts.length >= 3 ? parts[1] : '__root__'
        if (!groups[subfolder]) groups[subfolder] = { txts: [], imgs: [] }
        if (isTxt(file.name)) groups[subfolder].txts.push(file)
        else if (isImg(file.name)) groups[subfolder].imgs.push(file)
      }

      const readText = file => new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target.result)
        reader.readAsText(file, 'utf-8')
      })

      // 루트 이미지 (모든 일정에 공유)
      const rootPhotos = []
      for (const imgFile of (groups['__root__']?.imgs || [])) {
        try { rootPhotos.push(await resizeImage(imgFile)) } catch {}
      }

      let allRows = []
      let totalTxts = 0, totalImgs = rootPhotos.length

      // 각 그룹(서브폴더) 처리
      for (const [groupName, { txts, imgs }] of Object.entries(groups)) {
        const groupRows = []
        for (const txtFile of txts) {
          const text = await readText(txtFile)
          const parsed = parseKakaoChat(text)
          groupRows.push(...parsed)
          totalTxts++
        }

        const groupPhotos = []
        if (groupName !== '__root__') {
          for (const imgFile of imgs) {
            try { groupPhotos.push(await resizeImage(imgFile)); totalImgs++ } catch {}
          }
        }

        allRows.push(...groupRows.map(r => ({ ...r, _groupPhotos: groupPhotos })))
      }

      if (!allRows.length) {
        setFolderMsg('⚠️ txt 파일에서 일정을 찾을 수 없습니다. 카카오톡 형식인지 확인해주세요.')
        setFolderLoading(false)
        return
      }

      // 루트 이미지를 모든 일정에 추가
      const finalRows = allRows.map(r => ({
        ...r,
        _photos: [...(r._groupPhotos || []), ...rootPhotos],
      }))

      setFolderRows(finalRows)
      setFolderStats({ schedules: finalRows.length, txts: totalTxts, imgs: totalImgs, shared: rootPhotos.length })
      setFolderMsg(`✅ ${finalRows.length}건 파싱 완료`)
    } catch (e) {
      setFolderMsg('⚠️ 오류: ' + e.message)
    }
    setFolderLoading(false)
  }

  const handleFolderInput = async e => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const filesWithPaths = files.map(f => ({ file: f, relativePath: f.webkitRelativePath || f.name }))
    await processFolderFiles(filesWithPaths)
    e.target.value = ''
  }

  const handleFolderDrop = async e => {
    e.preventDefault()
    setIsDragOver(false)
    const entries = Array.from(e.dataTransfer.items)
      .map(item => item.webkitGetAsEntry?.())
      .filter(Boolean)
    if (!entries.length) return
    setFolderLoading(true)
    const nested = await Promise.all(entries.map(entry => collectFilesFromEntry(entry, '')))
    const all = nested.flat()
    if (all.length) await processFolderFiles(all)
    else { setFolderLoading(false); setFolderMsg('⚠️ 파일을 읽을 수 없습니다. 폴더를 직접 드래그해주세요.') }
  }

  const applyFolder = () => {
    if (!folderRows.length) return
    const autoAssign = {}, autoCoAssign = {}
    folderRows.forEach(r => {
      if (r.driver_hint) {
        const parts = r.driver_hint.split(/[,，]/)
        const main = findDriver(parts[0])
        if (main) autoAssign[r._id] = main.id
        if (parts[1]) { const co = findDriver(parts[1]); if (co) autoCoAssign[r._id] = co.id }
      }
    })
    setRows(folderRows)
    setAssigns(autoAssign)
    setCoAssigns(autoCoAssign)
    setFolderMsg('')
    setStep(2)
  }

  const handleKakaoParse = (text) => {
    if (!text.trim()) return
    const result = parseKakaoChat(text)
    setKakaoRows(result)
    setKakaoMsg(result.length > 0
      ? `✅ ${result.length}건 파싱 완료 · 확인 후 가져오기`
      : '⚠️ 인식된 일정이 없습니다. 형식을 확인해주세요.')
  }

  const applyKakao = () => {
    if (!kakaoRows.length) return
    const autoAssign = {}
    const autoCoAssign = {}
    kakaoRows.forEach(r => {
      if (r.driver_hint) {
        const parts = r.driver_hint.split(/[,，]/)
        const main = findDriver(parts[0])
        if (main) autoAssign[r._id] = main.id
        if (parts[1]) {
          const co = findDriver(parts[1])
          if (co) autoCoAssign[r._id] = co.id
        }
      }
    })
    setRows(kakaoRows)
    setAssigns(autoAssign)
    setCoAssigns(autoCoAssign)
    setKakaoMsg('')
    setStep(2)
  }

  const colMapRef = useRef(colMap)
  colMapRef.current = colMap
  const parsedRef = useRef(parsed)
  parsedRef.current = parsed

  const applyParse = () => {
    const p = parsedRef.current
    const cm = colMapRef.current
    if (!p) return
    const { data } = p
    const get = (row, field) => {
      const i = cm[field]
      if (i === undefined || i === null || i === '') return ''
      const idx = Number(i)
      return (idx < row.length) ? (row[idx] ?? '').toString().trim() : ''
    }
    const imported = data
      .filter(row => row.some(c => (c ?? '').toString().trim()))
      .map(row => ({
        _id:         Math.random().toString(36).slice(2),
        date:        parseDate(get(row,'date')),
        time:        parseKoreanTime(get(row,'time')) || get(row,'time') || '',
        address:     get(row,'address'),
        waste:       get(row,'waste'),
        cname:       get(row,'cname'),
        cphone:      get(row,'cphone'),
        door_pw:     get(row,'door_pw'),
        unit_pw:     get(row,'unit_pw'),
        memo:        get(row,'memo'),
        driver_hint: get(row,'driver_hint'),
        driver_note: get(row,'driver_note'),
      }))
    if (!imported.length) { alert('가져올 데이터가 없습니다. 컬럼 매핑을 확인해주세요.'); return }
    setRows(imported)
    setInputMode('manual')
    setParseMsg('')
  }

  const setRow = (_id, k, v) => setRows(prev => prev.map(r => r._id===_id ? {...r,[k]:v} : r))
  const addRow = () => setRows(prev => [...prev, newRow()])
  const delRow = _id => setRows(prev => prev.filter(r => r._id!==_id))
  const copyRow = _id => {
    const src = rows.find(r=>r._id===_id)
    setRows(prev => {
      const idx = prev.findIndex(r=>r._id===_id)
      const copy = {...src, _id:Math.random().toString(36).slice(2)}
      const next = [...prev]; next.splice(idx+1,0,copy); return next
    })
  }

  const findDriver = hint => drivers.find(d => d.name.includes(hint.trim()) || hint.trim().includes(d.name))

  const goStep2 = () => {
    const bad = rows.filter(r => !r.address)
    if (bad.length) return alert(`${bad.length}개 일정에 주소가 비어 있습니다.`)
    const autoAssign = {}
    const autoCoAssign = {}
    rows.forEach(r => {
      if (r.driver_hint) {
        const parts = r.driver_hint.split(/[,，]/)
        const main = findDriver(parts[0])
        if (main) autoAssign[r._id] = main.id
        if (parts[1]) {
          const co = findDriver(parts[1])
          if (co) autoCoAssign[r._id] = co.id
        }
      }
    })
    setAssigns(autoAssign)
    setCoAssigns(autoCoAssign)
    setStep(2)
  }

  const setAssign = (_id, v) => setAssigns(prev=>({...prev,[_id]:v}))
  const assignAll = dId => { const map={}; rows.forEach(r=>{ map[r._id]=dId }); setAssigns(map) }

  const buildList = () => rows.map((r, i) => {
    // eslint-disable-next-line no-unused-vars
    const { _photos, _groupPhotos, ...rest } = r
    return {
      ...rest,
      order:          i,
      driver_id:      assigns[r._id] || null,
      co_driver_id:   coAssigns[r._id] || null,
      driver_note:    r.driver_note || '',
      status:'대기', start_time:null, end_time:null,
      eta:null, sms_sent:false, photos:[],
      schedule_photos: _photos || [],
    }
  })

  const submit = () => {
    const list = buildList()
    const dupes = list.filter(r =>
      schedules.some(s => s.date === r.date && s.address === r.address)
    )
    if (dupes.length) {
      setDupeConflict({ dupes, newOnes: list.filter(r => !dupes.includes(r)) })
      return
    }
    onAddMany(list)
  }

  const MERGE_FIELDS = ['door_pw','unit_pw','memo','driver_note','cphone','cname','waste','time','driver_id','co_driver_id']

  const handleDupeAction = (action) => {
    const { dupes, newOnes } = dupeConflict
    setDupeConflict(null)
    if (action === 'merge') {
      dupes.forEach(nr => {
        const existing = schedules.find(s => s.date === nr.date && s.address === nr.address)
        if (!existing || !onUpdate) return
        const patch = {}
        MERGE_FIELDS.forEach(f => { if (!existing[f] && nr[f]) patch[f] = nr[f] })
        if (Object.keys(patch).length) onUpdate(existing.id, patch)
      })
      if (newOnes.length) onAddMany(newOnes)
      else onClose()
    } else if (action === 'skip') {
      if (newOnes.length) onAddMany(newOnes)
      else onClose()
    }
  }

  const is = {
    padding:'6px 8px', border:`1px solid ${border}`, borderRadius:6, fontSize:12,
    outline:'none', background:'#fafafa', boxSizing:'border-box', width:'100%',
  }

  const driverMap = {}
  drivers.forEach((d,i) => { driverMap[d.id] = { ...DRIVER_COLORS[i % DRIVER_COLORS.length], name:d.name } })

  const assignedCount = rows.filter(r=>assigns[r._id]).length
  const colOptions = parsed?.headers.map((h,i)=>({ label:`[${i+1}열] ${h}`, value:i })) || []

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ position:'relative', background:'#fff', borderRadius:16, width:'100%', maxWidth: step===1 ? 960 : 700, maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

        {dupeConflict && (
          <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,.97)', zIndex:20, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:16, padding:24 }}>
            <div style={{ maxWidth:440, width:'100%' }}>
              <div style={{ fontSize:16, fontWeight:700, color:navy, marginBottom:10 }}>⚠️ 중복 일정 {dupeConflict.dupes.length}건 발견</div>
              <div style={{ background:'#fef9ec', border:`1px solid #fde68a`, borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#92400e', lineHeight:1.8, maxHeight:160, overflowY:'auto' }}>
                {dupeConflict.dupes.map(r=><div key={r._id}>• {r.date} {r.address}</div>)}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button onClick={()=>handleDupeAction('merge')}
                  style={{ padding:'12px 16px', background:blue, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left' }}>
                  📋 빈 항목만 채워 기존 일정 업데이트{dupeConflict.newOnes.length>0?` + 신규 ${dupeConflict.newOnes.length}건 등록`:''}
                </button>
                {dupeConflict.newOnes.length > 0 && (
                  <button onClick={()=>handleDupeAction('skip')}
                    style={{ padding:'12px 16px', background:'#f8fafc', color:textC, border:`1px solid ${border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left' }}>
                    ⏭ 중복 제외하고 신규 {dupeConflict.newOnes.length}건만 등록
                  </button>
                )}
                <button onClick={()=>setDupeConflict(null)}
                  style={{ padding:'10px 16px', background:'none', color:muted, border:'none', fontSize:13, cursor:'pointer' }}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:16, fontWeight:700, color:navy }}>
              {step===1 ? '📋 일정 입력' : '🚚 기사 배치'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
              {[['1','일정 입력'],['2','기사 배치']].map(([n,l],i)=>(
                <div key={n} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {i>0 && <div style={{ width:20, height:1, background:step>i?blue:border }}/>}
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:step>=i+1?blue:'#e2e8f0', color:step>=i+1?'#fff':muted, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{n}</div>
                    <span style={{ color:step>=i+1?blue:muted, fontWeight:step===i+1?600:400 }}>{l}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:muted }}>✕</button>
        </div>

        {step===1 && (
          <>
            <div style={{ display:'flex', borderBottom:`1px solid ${border}`, flexShrink:0, overflowX:'auto' }}>
              {[['paste','📊 엑셀 붙여넣기'],['kakao','💬 카카오톡'],['folder','📁 폴더 업로드'],['manual','✏️ 직접 입력']].map(([m,l])=>(
                <button key={m} onClick={()=>setInputMode(m)}
                  style={{ padding:'10px 18px', fontSize:13, fontWeight:600, border:'none', borderBottom:`2.5px solid ${inputMode===m?blue:'transparent'}`, color:inputMode===m?blue:muted, background:'none', cursor:'pointer', whiteSpace:'nowrap' }}>
                  {l}
                </button>
              ))}
            </div>

            {inputMode==='kakao' && (
              <div style={{ flex:1, overflowY:'auto', padding:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:textC, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                  💬 카카오톡 일정 메시지 붙여넣기
                  <span style={{ fontSize:11, color:muted, fontWeight:400 }}>스케줄방 메시지를 복사해서 붙여넣으세요</span>
                </div>

                <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#166534', lineHeight:1.8 }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>인식 형식 예시</div>
                  <div style={{ fontFamily:'monospace', fontSize:11, whiteSpace:'pre', background:'#fff', borderRadius:6, padding:'8px 10px', border:`1px solid #bbf7d0` }}>{`디자인도트(김혜진)
3월18일 (수) 오전9~10시
성북구 보문파크뷰자이 101동 1105호
공동 : 1105 동 0510
세대 : 0510*
열베, 동선 보양제거
1/3차 이하
010 2745 5077`}</div>
                  <div style={{ marginTop:6, fontSize:11 }}>여러 건은 <b>빈 줄</b>로 구분 · 각 블록 마지막 줄이 전화번호여야 합니다</div>
                </div>

                <textarea
                  autoFocus
                  placeholder={"카카오톡 메시지를 여기에 붙여넣으세요 (Ctrl+V)\n여러 건 동시 입력 가능 — 빈 줄로 구분"}
                  value={kakaoRaw}
                  onPaste={e => {
                    const text = e.clipboardData.getData('text')
                    setKakaoRaw(text)
                    handleKakaoParse(text)
                    e.preventDefault()
                  }}
                  onChange={e => { setKakaoRaw(e.target.value); handleKakaoParse(e.target.value) }}
                  style={{ width:'100%', height:180, padding:14, border:`2px solid ${border}`, borderRadius:10, fontSize:13, lineHeight:1.7, resize:'vertical', outline:'none', boxSizing:'border-box', background:'#f8fafc', color:textC, fontFamily:'monospace' }}
                />

                {kakaoMsg && (
                  <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background: kakaoRows.length>0?'#f0fdf4':'#fef2f2', border:`1px solid ${kakaoRows.length>0?'#86efac':'#fca5a5'}`, fontSize:13, color: kakaoRows.length>0?'#166534':red, fontWeight:500 }}>
                    {kakaoMsg}
                  </div>
                )}

                {kakaoRows.length > 0 && (
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:8 }}>파싱 결과 미리보기</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:260, overflowY:'auto' }}>
                      {kakaoRows.map((r,i)=>(
                        <div key={r._id} style={{ background:'#fff', border:`1px solid ${border}`, borderRadius:8, padding:'10px 12px', fontSize:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontWeight:700, color:navy }}>{i+1}. {r.cname}</span>
                            <span style={{ fontFamily:'monospace', color:blue, fontWeight:600 }}>{r.date} {r.time}</span>
                          </div>
                          <div style={{ color:textC, marginBottom:2 }}>{r.address}</div>
                          <div style={{ color:muted, display:'flex', gap:12 }}>
                            {r.waste && <span>폐기물: {r.waste}</span>}
                            <span>{r.cphone}</span>
                          </div>
                          {r.memo && <div style={{ color:muted, fontSize:11, marginTop:2 }}>메모: {r.memo}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {inputMode==='folder' && (
              <div style={{ flex:1, overflowY:'auto', padding:20 }}>
                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  multiple
                  style={{ display:'none' }}
                  onChange={handleFolderInput}
                />

                {/* 드래그&드롭 + 클릭 영역 */}
                <div
                  onClick={() => folderInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleFolderDrop}
                  style={{
                    border: `2px dashed ${isDragOver ? blue : border}`,
                    borderRadius: 12,
                    padding: '32px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragOver ? '#eff6ff' : '#fafafa',
                    marginBottom: 16,
                    transition: 'all .15s',
                  }}>
                  {folderLoading ? (
                    <div style={{ color: blue, fontSize: 14 }}>⏳ 파일 처리 중...</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: textC, marginBottom: 4 }}>폴더를 여기에 드래그하거나 클릭해서 선택</div>
                      <div style={{ fontSize: 12, color: muted }}>txt 파일 → 일정 파싱 · 이미지 파일 → 참고사진 자동 연결</div>
                    </>
                  )}
                </div>

                {/* 사용 안내 */}
                <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#166534', lineHeight:1.8 }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>폴더 구조 예시</div>
                  <div style={{ fontFamily:'monospace', fontSize:11, whiteSpace:'pre', background:'#fff', borderRadius:6, padding:'8px 10px', border:`1px solid #bbf7d0` }}>{`업로드폴더/
├── 일정.txt          → 일정 파싱 (카카오톡 형식)
├── 공유사진.jpg       → 모든 일정 참고사진 (루트 이미지)
├── 업체A/
│   ├── 안내.txt      → 업체A 일정 파싱
│   └── 현장.jpg      → 업체A 일정 참고사진
└── 업체B/
    └── 현장.jpg      → 업체B 일정 참고사진`}</div>
                  <div style={{ marginTop:6, fontSize:11 }}>• 루트 이미지 → 모든 일정 공유 참고사진&nbsp;&nbsp;• 서브폴더 이미지 → 해당 폴더 일정에만 연결</div>
                </div>

                {/* 파싱 결과 메시지 */}
                {folderMsg && (
                  <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8, background:folderRows.length>0?'#f0fdf4':'#fef2f2', border:`1px solid ${folderRows.length>0?'#86efac':'#fca5a5'}`, fontSize:13, color:folderRows.length>0?'#166534':red, fontWeight:500 }}>
                    {folderMsg}
                  </div>
                )}

                {/* 통계 */}
                {folderStats && (
                  <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                    {[
                      [`📄 txt 파일`, `${folderStats.txts}개`],
                      [`🖼️ 이미지`, `${folderStats.imgs}장`],
                      ...(folderStats.shared > 0 ? [[`🔗 공유 사진`, `${folderStats.shared}장`]] : []),
                      [`📋 파싱된 일정`, `${folderStats.schedules}건`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background:'#fff', border:`1px solid ${border}`, borderRadius:8, padding:'6px 14px', fontSize:12 }}>
                        <span style={{ color:muted }}>{label}: </span>
                        <span style={{ fontWeight:700, color:navy }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 파싱 결과 미리보기 */}
                {folderRows.length > 0 && (
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:muted, marginBottom:8 }}>파싱 결과 미리보기</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
                      {folderRows.map((r, i) => (
                        <div key={r._id} style={{ background:'#fff', border:`1px solid ${border}`, borderRadius:8, padding:'10px 12px', fontSize:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, flexWrap:'wrap', gap:4 }}>
                            <span style={{ fontWeight:700, color:navy }}>{i+1}. {r.cname}</span>
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              {r._photos?.length > 0 && (
                                <span style={{ background:'#eff6ff', color:blue, borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
                                  🖼️ {r._photos.length}장
                                </span>
                              )}
                              <span style={{ fontFamily:'monospace', color:blue, fontWeight:600 }}>{r.date} {r.time}</span>
                            </div>
                          </div>
                          <div style={{ color:textC, marginBottom:2 }}>{r.address}</div>
                          <div style={{ color:muted, display:'flex', gap:12 }}>
                            {r.waste && <span>폐기물: {r.waste}</span>}
                            <span>{r.cphone}</span>
                          </div>
                          {r.memo && <div style={{ color:muted, fontSize:11, marginTop:2 }}>메모: {r.memo}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {inputMode==='paste' && (
              <div style={{ flex:1, overflowY:'auto', padding:20 }}>
                {!parsed && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:textC, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                      📊 엑셀 데이터 붙여넣기
                      <span style={{ fontSize:11, color:muted, fontWeight:400 }}>엑셀에서 복사(Ctrl+C) 후 아래 영역에 붙여넣기(Ctrl+V)</span>
                    </div>
                    <textarea
                      autoFocus
                      placeholder={"여기를 클릭하고 Ctrl+V 로 엑셀 데이터를 붙여넣으세요.\n\n헤더 행 포함 여부 자동 감지\n지원 컬럼: 날짜 · 업체명 · 주소 · 진입시간 · 전화번호 · 폐기물양 · 비고 · 담당자 · 특이사항"}
                      onPaste={handlePasteInput}
                      onChange={e => { if(e.target.value) { setPasteRaw(e.target.value); processPasteText(e.target.value) } }}
                      value={pasteRaw}
                      style={{ width:'100%', height:180, padding:14, border:`2px solid ${border}`, borderRadius:10, fontSize:13, lineHeight:1.6, resize:'vertical', outline:'none', boxSizing:'border-box', fontFamily:'monospace', background:'#f8fafc', color:textC }}
                    />
                    <div style={{ fontSize:12, color:muted, marginTop:6 }}>탭 구분 텍스트를 자동으로 파싱합니다</div>
                  </div>
                )}

                {parsed && (
                  <>
                    <div style={{ background:'#f0fdf4', border:`1px solid #86efac`, borderRadius:10, padding:'10px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:16 }}>✅</span>
                      <span style={{ fontSize:13, color:'#166534', fontWeight:500 }}>{parseMsg}</span>
                      <button onClick={()=>{ setParsed(null); setPasteRaw(''); setColMap({}) }}
                        style={{ marginLeft:'auto', background:'none', border:'none', color:muted, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
                        다시 붙여넣기
                      </button>
                    </div>

                    <div style={{ background:'#fff', border:`1px solid ${border}`, borderRadius:10, padding:16, marginBottom:16 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:navy, marginBottom:12 }}>컬럼 매핑 확인</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                        {[
                          ['date','날짜 *'],['time','진입시간 *'],['address','주소 *'],
                          ['waste','폐기물양 *'],['cname','업체명/담당자 *'],['cphone','전화번호 *'],
                          ['door_pw','공동 비밀번호'],['unit_pw','세대 비밀번호'],['memo','비고'],
                          ['driver_hint','담당 기사명'],['driver_note','특이사항'],
                        ].map(([field, label])=>(
                          <div key={field}>
                            <div style={{ fontSize:11, fontWeight:600, color:muted, marginBottom:4 }}>{label}</div>
                            <select value={colMap[field]??''} onChange={e=>setColMap(p=>({...p,[field]:e.target.value===''?undefined:Number(e.target.value)}))}
                              style={{ ...is, fontSize:12, background: colMap[field]!==undefined?'#eff6ff':'#f8fafc', color: colMap[field]!==undefined?blue:muted }}>
                              <option value="">— 매핑 안함 —</option>
                              {colOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ border:`1px solid ${border}`, borderRadius:10, overflow:'hidden', marginBottom:16 }}>
                      <div style={{ background:'#f8fafc', padding:'8px 14px', fontSize:12, fontWeight:600, color:muted, borderBottom:`1px solid ${border}` }}>
                        미리보기 (최대 5행)
                      </div>
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                          <thead>
                            <tr style={{ background:'#f8fafc' }}>
                              {parsed.headers.map((h,i)=>(
                                <th key={i} style={{ padding:'6px 8px', textAlign:'left', color: Object.values(colMap).includes(i)?blue:muted, fontWeight:600, whiteSpace:'nowrap', borderBottom:`1px solid ${border}` }}>
                                  {h || `열${i+1}`}
                                  {Object.values(colMap).includes(i) && <span style={{ fontSize:9, marginLeft:4, color:blue }}>✓</span>}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsed.data.slice(0,5).map((row,i)=>(
                              <tr key={i} style={{ borderBottom:`1px solid ${border}` }}>
                                {row.map((cell,j)=>(
                                  <td key={j} style={{ padding:'5px 8px', color: Object.values(colMap).includes(j)?textC:muted, background: Object.values(colMap).includes(j)?'#f0f9ff':'#fff', whiteSpace:'nowrap', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis' }}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <Btn onClick={applyParse} style={{ width:'100%', padding:12, fontSize:14 }}>
                      ✓ {parsed.data.length}건 가져오기
                    </Btn>
                  </>
                )}
              </div>
            )}

            {inputMode==='manual' && (
              <div style={{ overflowY:'auto', flex:1 }}>
                <div style={{ padding:'8px 12px', background:'#eff6ff', borderBottom:`1px solid #bfdbfe`, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, fontWeight:600, color:blue, whiteSpace:'nowrap' }}>📅 날짜 일괄 변경</span>
                  <input type="date"
                    defaultValue={todayStr}
                    id="bulkDateInput"
                    style={{ ...is, width:'auto', fontSize:12, borderColor:'#93c5fd' }}
                  />
                  <button
                    onClick={()=>{
                      const val = document.getElementById('bulkDateInput')?.value
                      if (val) setRows(prev => prev.map(r => ({...r, date:val})))
                    }}
                    style={{ background:blue, color:'#fff', border:'none', borderRadius:7, padding:'5px 14px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                    전체 적용
                  </button>
                  <span style={{ fontSize:11, color:'#3b82f6', opacity:.7 }}>모든 행의 날짜를 한번에 바꿉니다</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:820 }}>
                    <thead>
                      <tr style={{ background:'#f8fafc', borderBottom:`1px solid ${border}`, position:'sticky', top:0, zIndex:1 }}>
                        <th style={{ padding:'10px 10px', textAlign:'center', color:muted, fontWeight:600, width:36 }}>#</th>
                        {[['날짜 *',90],['시간 *',76],['주소 *',200],['폐기물량 *',80],['업체/담당자 *',90],['연락처 *',110],['공동PW',90],['세대PW',90],['메모',110],['특이사항',110]].map(([h,w])=>(
                          <th key={h} style={{ padding:'10px 8px', textAlign:'left', color:muted, fontWeight:600, minWidth:w, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                        <th style={{ padding:'10px 8px', width:60 }}/>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r,i)=>(
                        <tr key={r._id} style={{ borderBottom:`1px solid ${border}` }}>
                          <td style={{ padding:'8px 10px', textAlign:'center', color:muted, fontSize:11 }}>{i+1}</td>
                          <td style={{ padding:'6px 6px' }}><input type="date" value={r.date} onChange={e=>setRow(r._id,'date',e.target.value)} style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input type="time" value={r.time} onChange={e=>setRow(r._id,'time',e.target.value)} style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.address} onChange={e=>setRow(r._id,'address',e.target.value)} placeholder="현장 주소" style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.waste}   onChange={e=>setRow(r._id,'waste',e.target.value)}   placeholder="2톤"    style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.cname}  onChange={e=>setRow(r._id,'cname',e.target.value)}  placeholder="이름"   style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.cphone} onChange={e=>setRow(r._id,'cphone',e.target.value)} placeholder="010-0000-0000" style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.door_pw||''} onChange={e=>setRow(r._id,'door_pw',e.target.value)} placeholder="공동 비밀번호" style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.unit_pw||''} onChange={e=>setRow(r._id,'unit_pw',e.target.value)} placeholder="세대 비밀번호" style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.memo}   onChange={e=>setRow(r._id,'memo',e.target.value)}   placeholder="비고" style={is}/></td>
                          <td style={{ padding:'6px 6px' }}><input value={r.driver_note||''} onChange={e=>setRow(r._id,'driver_note',e.target.value)} placeholder="특이사항" style={is}/></td>
                          <td style={{ padding:'6px 8px' }}>
                            <div style={{ display:'flex', gap:4 }}>
                              <button onClick={()=>copyRow(r._id)} title="복사" style={{ background:'#f1f5f9', border:'none', borderRadius:5, padding:'5px 7px', cursor:'pointer', fontSize:12, color:muted }}>⧉</button>
                              {rows.length>1 && <button onClick={()=>delRow(r._id)} title="삭제" style={{ background:'#fef2f2', border:'none', borderRadius:5, padding:'5px 7px', cursor:'pointer', fontSize:12, color:red }}>✕</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ padding:'12px 20px', borderTop:`1px solid ${border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              {inputMode==='manual'
                ? <button onClick={addRow} style={{ background:'none', border:`1.5px dashed ${blue}`, color:blue, borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>+ 행 추가</button>
                : <div/>
              }
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {inputMode==='manual' && <span style={{ fontSize:13, color:muted }}>총 {rows.length}건</span>}
                {inputMode==='kakao'  && kakaoRows.length>0 && <span style={{ fontSize:13, color:muted }}>{kakaoRows.length}건 파싱됨</span>}
                {inputMode==='folder' && folderRows.length>0 && <span style={{ fontSize:13, color:muted }}>{folderRows.length}건 파싱됨</span>}
                <Btn onClick={onClose} outline color={muted} style={{ padding:'9px 16px' }}>취소</Btn>
                {inputMode==='kakao' ? (
                  <Btn onClick={applyKakao} disabled={kakaoRows.length===0} style={{ padding:'9px 20px' }}>
                    가져오기 ({kakaoRows.length}건) →
                  </Btn>
                ) : inputMode==='folder' ? (
                  <Btn onClick={applyFolder} disabled={folderRows.length===0||folderLoading} style={{ padding:'9px 20px' }}>
                    {folderLoading ? '처리 중...' : `가져오기 (${folderRows.length}건) →`}
                  </Btn>
                ) : (
                  <Btn onClick={goStep2} disabled={inputMode==='paste'&&!parsed&&rows.length===1&&!rows[0].address} style={{ padding:'9px 20px' }}>
                    다음: 기사 배치 →
                  </Btn>
                )}
              </div>
            </div>
          </>
        )}

        {step===2 && (
          <>
            <div style={{ padding:'12px 20px', borderBottom:`1px solid ${border}`, background:'#f8fafc', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, fontWeight:600, color:muted }}>전체 일괄 배치:</span>
                {drivers.map(d=>(
                  <button key={d.id} onClick={()=>assignAll(d.id)}
                    style={{ padding:'5px 14px', borderRadius:20, border:'none', background:driverMap[d.id]?.bg, color:driverMap[d.id]?.color, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {d.name}
                  </button>
                ))}
                <button onClick={()=>assignAll('')}
                  style={{ padding:'5px 14px', borderRadius:20, border:`1px dashed ${border}`, background:'#fff', color:muted, fontSize:12, cursor:'pointer' }}>전체 해제</button>
              </div>
            </div>

            <div style={{ overflowY:'auto', flex:1, padding:'12px 20px' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {rows.map((r)=>{
                  const assigned = assigns[r._id]
                  const dm = assigned ? driverMap[assigned] : null
                  return (
                    <div key={r._id} style={{ display:'flex', alignItems:'center', gap:12, background:assigned?dm?.bg+'40':'#f8fafc', border:`1px solid ${assigned?dm?.bg:border}`, borderRadius:10, padding:'10px 14px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:textC, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.address}</div>
                        <div style={{ fontSize:11, color:muted, marginTop:2 }}>
                          <span style={{ fontFamily:'monospace', fontWeight:600, color:navy }}>{r.date} {r.time}</span>
                          <span style={{ marginLeft:10 }}>폐기물 {r.waste}</span>
                          <span style={{ marginLeft:10 }}>{r.cname} {r.cphone}</span>
                          {r.driver_hint && !assigned && <span style={{ marginLeft:10, color:amber }}>힌트: {r.driver_hint}</span>}
                        </div>
                      </div>
                      <select value={assigns[r._id]||''} onChange={e=>setAssign(r._id,e.target.value)}
                        style={{ padding:'7px 10px', borderRadius:8, border:`1.5px solid ${assigned?dm?.bg:border}`, fontSize:13, fontWeight:600, color:assigned?dm?.color:muted, background:assigned?dm?.bg:'#fff', outline:'none', minWidth:110, cursor:'pointer' }}>
                        <option value="">— 미배치 —</option>
                        {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ padding:'12px 16px', borderTop:`1px solid ${border}`, display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <button onClick={()=>setStep(1)} style={{ background:'none', border:`1px solid ${border}`, borderRadius:8, color:blue, fontSize:13, fontWeight:600, cursor:'pointer', padding:'9px 12px', whiteSpace:'nowrap' }}>← 수정</button>
              <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:'auto' }}>
                {assignedCount < rows.length && <span style={{ fontSize:12, color:red, whiteSpace:'nowrap' }}>{rows.length-assignedCount}건 미배치</span>}
                <span style={{ fontSize:12, color:muted, whiteSpace:'nowrap' }}>{assignedCount}/{rows.length}건</span>
                <Btn onClick={submit} style={{ padding:'9px 16px', fontSize:13, whiteSpace:'nowrap' }}>
                  {assignedCount < rows.length ? '미배치 포함 등록' : '등록 완료'}
                </Btn>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
