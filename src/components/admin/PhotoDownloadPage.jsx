import { useState, useMemo } from 'react'
import { downloadPhotosToDir, downloadAllPhotos } from '../../utils/image'
import { navy, blue, green, amber, red, border, muted, textC, iStyle } from '../../constants/styles'

export default function PhotoDownloadPage({ schedules, users, onBack }) {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [from, setFrom]       = useState(monthAgo)
  const [to, setTo]           = useState(today)
  const [progress, setProgress] = useState(null) // { cur, total, name } | null
  const [done, setDone]       = useState(false)

  const getDriverName = id => users.find(u => u.id === id)?.name || '미배치'

  const withPhotos = useMemo(() => {
    return schedules
      .filter(s => {
        const pics = [...(s.work_photos || []), ...(s.photos || [])]
        if (!pics.length) return false
        if (from && s.date < from) return false
        if (to   && s.date > to)   return false
        return true
      })
      .sort((a, b) => {
        const dd = a.date.localeCompare(b.date)
        return dd !== 0 ? dd : (a.time || '').localeCompare(b.time || '')
      })
  }, [schedules, from, to])

  const totalPhotos = withPhotos.reduce(
    (acc, s) => acc + (s.work_photos || []).length + (s.photos || []).length, 0
  )

  const buildFolders = s => {
    const driverName = getDriverName(s.driver_id)
    const siteName   = [s.date, s.address?.slice(0, 20), s.cname].filter(Boolean).join('_')
    return [driverName, siteName]
  }

  const downloadAll = async () => {
    if (typeof window.showDirectoryPicker !== 'function') {
      alert('이 기능은 Chrome / Edge 데스크톱에서만 지원됩니다.')
      return
    }
    let rootHandle
    try { rootHandle = await window.showDirectoryPicker() } catch { return }

    setDone(false)
    setProgress({ cur: 0, total: withPhotos.length, name: '' })

    for (let i = 0; i < withPhotos.length; i++) {
      const s    = withPhotos[i]
      const pics = [...(s.work_photos || []), ...(s.photos || [])]
      const folders = buildFolders(s)
      setProgress({ cur: i + 1, total: withPhotos.length, name: folders[1] })
      try {
        await downloadPhotosToDir(rootHandle, pics, folders, '사진')
      } catch (e) {
        console.error('다운로드 실패:', folders, e)
      }
    }

    setProgress(null)
    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  const downloadOne = async s => {
    const pics = [...(s.work_photos || []), ...(s.photos || [])]
    await downloadAllPhotos(pics, '사진', buildFolders(s))
  }

  const pct = progress ? Math.round((progress.cur / progress.total) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Noto Sans KR', sans-serif" }}>

      {/* 헤더 */}
      <div style={{ background: navy, color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>📥 완료사진 일괄 다운로드</div>
      </div>

      <div style={{ padding: 20, maxWidth: 640, margin: '0 auto' }}>

        {/* 날짜 필터 */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 10 }}>기간 필터</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ ...iStyle, flex: 1, margin: 0, fontSize: 14 }}/>
            <span style={{ color: muted, fontSize: 14 }}>~</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ ...iStyle, flex: 1, margin: 0, fontSize: 14 }}/>
          </div>
        </div>

        {/* 요약 + 전체 다운로드 */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${border}`, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: progress ? 12 : 0 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, color: navy }}>{withPhotos.length}</span>
              <span style={{ fontSize: 13, color: muted, marginLeft: 4 }}>건</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: navy, marginLeft: 14 }}>{totalPhotos}</span>
              <span style={{ fontSize: 13, color: muted, marginLeft: 4 }}>장</span>
            </div>
            <button onClick={downloadAll} disabled={!!progress || withPhotos.length === 0}
              style={{
                background: progress ? '#94a3b8' : done ? green : navy,
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: progress ? 'default' : 'pointer',
                transition: 'background .2s'
              }}>
              {done ? '✓ 완료!' : progress ? `다운로드 중...` : '⬇ 전체 다운로드'}
            </button>
          </div>

          {/* 진행 바 */}
          {progress && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: muted, marginBottom: 5 }}>
                <span style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {progress.name}
                </span>
                <span style={{ flexShrink: 0 }}>{progress.cur} / {progress.total}</span>
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: blue, borderRadius: 99, transition: 'width .3s' }}/>
              </div>
            </div>
          )}
        </div>

        {/* 폴더 구조 안내 */}
        <div style={{ background: '#eff6ff', border: `1px solid #bfdbfe`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#1e40af', lineHeight: 1.8 }}>
          📁 저장 구조: <strong>선택폴더 / 기사이름 / 날짜_현장주소_담당자 / 사진_01.jpg</strong><br/>
          <span style={{ color: '#64748b' }}>Chrome / Edge 데스크톱 전용 · 다른 환경에서는 개별 파일로 다운로드됩니다</span>
        </div>

        {/* 일정 목록 */}
        {withPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: muted, fontSize: 14 }}>
            해당 기간에 사진이 있는 완료 건이 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {withPhotos.map(s => {
              const pics   = [...(s.work_photos || []), ...(s.photos || [])]
              const wpLen  = (s.work_photos || []).length
              const cpLen  = (s.photos || []).length
              const driver = getDriverName(s.driver_id)
              return (
                <div key={s.id} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${border}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* 썸네일 */}
                  <img src={pics[0]} alt="thumb"
                    style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 7, flexShrink: 0, border: `1px solid ${border}` }}/>

                  {/* 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textC, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.address}
                    </div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                      {s.date} · {driver}
                      {s.cname && <span style={{ marginLeft: 6, color: '#64748b' }}>({s.cname})</span>}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 3, display: 'flex', gap: 8 }}>
                      {wpLen > 0 && <span style={{ background: '#fef3c7', color: amber, padding: '1px 7px', borderRadius: 8, fontWeight: 600 }}>시작 {wpLen}장</span>}
                      {cpLen > 0 && <span style={{ background: '#dcfce7', color: green,  padding: '1px 7px', borderRadius: 8, fontWeight: 600 }}>완료 {cpLen}장</span>}
                    </div>
                  </div>

                  {/* 개별 다운로드 */}
                  <button onClick={() => downloadOne(s)} disabled={!!progress}
                    style={{ background: '#f1f5f9', border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    ⬇
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
