import { useState, useMemo } from 'react'
import useWindowWidth from '../../utils/useWindowWidth'
import { downloadPhotosToDir, downloadAllPhotos } from '../../utils/image'
import { navy, blue, green, amber, red, border, muted, textC, iStyle } from '../../constants/styles'

export default function PhotoDownloadPage({ schedules, users, onBack }) {
  const isPC = useWindowWidth() >= 1024
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
    const siteName   = [s.cname, s.address?.slice(0, 30)].filter(Boolean).join('_')
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
    <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: "'Noto Sans KR', sans-serif" }}>

      {/* 헤더 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eaecf0', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack}
            style={{ width: 34, height: 34, border: '1px solid #eaecf0', background: '#f9fafb', borderRadius: 8, cursor: 'pointer', fontSize: 16, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>완료사진 다운로드</span>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: isPC ? 1200 : 640, margin: '0 auto' }}>

        {/* 날짜 필터 + 다운로드 */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eaecf0', padding: '16px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10 }}>기간 필터</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ ...iStyle, flex: 1, margin: 0, fontSize: 14 }}/>
            <span style={{ color: '#9ca3af', fontSize: 14, flexShrink: 0 }}>~</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ ...iStyle, flex: 1, margin: 0, fontSize: 14 }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>{withPhotos.length}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 2 }}>건</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{totalPhotos}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 2 }}>장</div>
              </div>
            </div>
            <button onClick={downloadAll} disabled={!!progress || withPhotos.length === 0}
              style={{
                background: progress ? '#9ca3af' : done ? '#10b981' : '#6366f1',
                color: '#fff', border: 'none', borderRadius: 9,
                padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: progress ? 'default' : 'pointer',
                transition: 'background .2s', fontFamily: 'inherit'
              }}>
              {done ? '✓ 완료!' : progress ? '다운로드 중...' : '⬇ 전체 다운로드'}
            </button>
          </div>
          {progress && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 5 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{progress.name}</span>
                <span style={{ flexShrink: 0 }}>{progress.cur} / {progress.total}</span>
              </div>
              <div style={{ height: 5, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#6366f1', borderRadius: 99, transition: 'width .3s' }}/>
              </div>
            </div>
          )}
        </div>

        {/* 폴더 구조 안내 */}
        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderLeft: '3px solid #6366f1', borderRadius: 8, padding: '9px 14px', marginBottom: 12, fontSize: 12, color: '#4338ca', lineHeight: 1.8 }}>
          📁 저장 구조: <strong>선택폴더 / 기사이름 / 업체명_주소 / 사진_01.jpg</strong><br/>
          <span style={{ color: '#9ca3af' }}>Chrome / Edge 데스크톱 전용 · 다른 환경에서는 개별 파일로 다운로드됩니다</span>
        </div>

        {/* 일정 목록 */}
        {withPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14 }}>해당 기간에 사진이 있는 완료 건이 없습니다</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isPC ? 'repeat(3,1fr)' : '1fr', gap: 10 }}>
            {withPhotos.map(s => {
              const pics   = [...(s.work_photos || []), ...(s.photos || [])]
              const wpLen  = (s.work_photos || []).length
              const cpLen  = (s.photos || []).length
              const driver = getDriverName(s.driver_id)
              return (
                <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #eaecf0', overflow: 'hidden' }}>
                  {/* 썸네일 그리드 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, height: 100 }}>
                    {pics.slice(0, 4).map((src, i) => (
                      <div key={i} style={{ position: 'relative', overflow: 'hidden', background: '#f3f4f6' }}>
                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                        {i === 3 && pics.length > 4 && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                            +{pics.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                    {pics.length < 4 && Array.from({ length: 4 - pics.length }).map((_, i) => (
                      <div key={`empty-${i}`} style={{ background: '#f3f4f6' }}/>
                    ))}
                  </div>
                  {/* 정보 */}
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                        {s.address}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {s.date} · {driver}{s.cname ? ` (${s.cname})` : ''}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 4, display: 'flex', gap: 5 }}>
                        {wpLen > 0 && <span style={{ background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>현장 {wpLen}장</span>}
                        {cpLen > 0 && <span style={{ background: '#ecfdf5', color: '#065f46', padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>완료 {cpLen}장</span>}
                      </div>
                    </div>
                    <button onClick={() => downloadOne(s)} disabled={!!progress}
                      style={{ background: '#f9fafb', border: '1px solid #eaecf0', color: '#6b7280', borderRadius: 7, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                      ⬇
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
