import { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from './lib/firebase'
import { useAppData } from './hooks/useAppData'
import { useFCM } from './hooks/useFCM'
import { updateUsers } from './utils/users'
import LoginPage from './components/LoginPage'
import AdminApp from './components/admin/AdminApp'
import DriverApp from './components/driver/DriverApp'
import TruckIcon from './components/common/TruckIcon'
import { navy, border, muted, textC } from './constants/styles'
import { VERSION, CHANGELOG } from './constants/version'

export default function App() {
  const [user, setUser] = useState(null)
  const [showLogoutConfirm, setLogoutConfirm] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)
  const {
    users, schedules, loading, error,
    addSchedules, updateSchedule, deleteSchedules,
    addDriver, updateDriver, deleteDriver,
  } = useAppData()

  // 모든 컴포넌트가 최신 users를 참조하도록 동기화
  updateUsers(users)

  useEffect(() => {
    if (!user) return
    window.history.pushState({ root: true }, '')
    const handler = (e) => {
      if (e.state && e.state.root) return
      e.preventDefault()
      setLogoutConfirm(true)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [user])

  // FCM 토큰 등록만 수행 (포그라운드 토스트 없음 - 시스템 알림으로 통일)
  useFCM(user, null)

  // 로그인 후 새 버전이면 업데이트 팝업 표시
  useEffect(() => {
    if (!user) return
    const seen = localStorage.getItem('app_version_seen')
    if (seen !== VERSION) setShowUpdate(true)
  }, [user])

  // 접속 상태 추적
  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'users', user.id)
    updateDoc(ref, { online: true }).catch(() => {})
    const setOffline = () => updateDoc(ref, { online: false }).catch(() => {})
    window.addEventListener('beforeunload', setOffline)
    return () => {
      setOffline()
      window.removeEventListener('beforeunload', setOffline)
    }
  }, [user?.id])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f1f5f9', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:16 }}><TruckIcon width={80} height={50}/></div>
        <div style={{ fontSize:16, fontWeight:600, color:'#1b3a5c', marginBottom:8 }}>데이터 불러오는 중...</div>
        <div style={{ fontSize:13, color:'#64748b' }}>Firebase에 연결 중입니다</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fef2f2', fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div style={{ textAlign:'center', padding:24 }}>
        <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:15, fontWeight:600, color:'#dc2626', marginBottom:8 }}>연결 오류</div>
        <div style={{ fontSize:13, color:'#64748b' }}>{error}</div>
      </div>
    </div>
  )

  if (!user) return <LoginPage onLogin={async (id, pw) => {
    const result = await login(id, pw)
    if (result.user) setUser(result.user)
    return result
  }} users={users}/>

  const logoutHandler = () => {
    localStorage.setItem('auto_login', '0')
    setUser(null)
    setLogoutConfirm(false)
  }

  return (
    <>
      <style>{`
        input, select, textarea {
          color: #1e293b !important;
          -webkit-text-fill-color: #1e293b !important;
          color-scheme: light !important;
        }
        input::placeholder { color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0); }
        input.driver-date { color: #111827 !important; -webkit-text-fill-color: #111827 !important; color-scheme: light !important; }
        input.driver-date::-webkit-calendar-picker-indicator { filter: invert(0); }
      `}</style>
      {user.role==='admin'
        ? <AdminApp
            user={user} users={users} schedules={schedules}
            onAddMany={addSchedules}
            onUpdate={(id, patch) => updateSchedule(id, patch)}
            onDelete={deleteSchedules}
            onAddDriver={addDriver}
            onUpdateDriver={updateDriver}
            onDeleteDriver={deleteDriver}
            onLogout={logoutHandler}
          />
        : <DriverApp
            user={user} schedules={schedules}
            onUpdate={(id, patch) => updateSchedule(id, patch)}
            onUpdateDriver={updateDriver}
            onLogout={logoutHandler}
          />
      }

      {showUpdate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:24, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:340, padding:28 }}>
            <div style={{ fontSize:20, marginBottom:4 }}>🆕</div>
            <div style={{ fontSize:16, fontWeight:700, color:textC, marginBottom:2 }}>업데이트 안내</div>
            <div style={{ fontSize:12, color:muted, marginBottom:16 }}>v{VERSION}</div>
            <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:textC, lineHeight:2 }}>
              {CHANGELOG.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <button onClick={() => { localStorage.setItem('app_version_seen', VERSION); setShowUpdate(false) }}
              style={{ marginTop:20, width:'100%', padding:'11px 0', borderRadius:8, border:'none', background:navy, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              확인
            </button>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:24, fontFamily:"'Noto Sans KR', sans-serif" }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:300, padding:28, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>👋</div>
            <div style={{ fontSize:16, fontWeight:700, color:textC, marginBottom:8 }}>로그아웃 할까요?</div>
            <div style={{ fontSize:13, color:muted, marginBottom:24 }}>{user.name}님으로 로그인 중입니다</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{ setLogoutConfirm(false); window.history.pushState({ root:true }, '') }}
                style={{ flex:1, padding:'11px 0', borderRadius:8, border:`1px solid ${border}`, background:'#f8fafc', color:muted, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                취소
              </button>
              <button onClick={logoutHandler}
                style={{ flex:2, padding:'11px 0', borderRadius:8, border:'none', background:navy, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
