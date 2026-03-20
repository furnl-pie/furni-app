// ── 공유 사용자 목록 ───────────────────────────────────────────────
// App 컴포넌트에서 updateUsers(users)를 호출해 Firebase users를 동기화
const INIT_USERS = [
  { id:'퍼니', name:'관리자', role:'admin', pw:'admin', phone:'010-0000-0000' },
]
let _users = [...INIT_USERS]

export const updateUsers = (users) => { _users = users }
export const userName = (id) => _users.find(u => u.id === id)?.name || '?'
export const getUsers = () => _users
