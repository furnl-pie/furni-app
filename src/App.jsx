import { useState, useEffect } from 'react'
import { useAppData } from './hooks/useAppData'
import { useFCM } from './hooks/useFCM'
import { updateUsers } from './utils/users'
import LoginPage from './components/LoginPage'
import AdminApp from './components/admin/AdminApp'
import DriverApp from './components/driver/DriverApp'
import TruckIcon from './components/common/TruckIcon'
import { navy, border, muted, textC } from './constants/styles'

export default function App() {
  const [user, setUser] = useState(null)
  const [showLogoutConfirm, setLogoutConfirm] = useState(false)
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

  const [fcmMsg, setFcmMsg] = useState(null)
  useFCM(user, msg => { setFcmMsg(msg); setTimeout(() => setFcmMsg(null), 5000) })

  const doLogout = () => {
    localStorage.setItem('auto_login', '0')
    setUser(null)
    setLogoutConfirm(false)
  }

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

  if (!user) return <LoginPage onLogin={u=>setUser(u)} users={users}/>

  const logoutHandler = () => {
    localStorage.setItem('auto_login', '0')
    setUser(null)
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
        input.driver-date { color: #fff !important; -webkit-text-fill-color: #fff !important; color-scheme: dark !important; }
        input.driver-date::-webkit-calendar-picker-indicator { filter: invert(1); }
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
              <button onClick={doLogout}
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
