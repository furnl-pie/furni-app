import { today } from '../constants/styles'

export function parseKoreanTime(raw) {
  if (!raw) return ''
  const s = raw.trim()
  if (s.includes('첫타임')) return '첫타임'
  if (s.includes('오전중')) return '오전중'
  if (s.includes('오후중')) return '오후중'
  if (s.includes('당일중')) return '당일중'
  if (s.includes('막타임')) return '막타임'
  // 한글 시간 키워드
  if (/새벽/.test(s)) return '06:00'
  if (/아침/.test(s)) return '09:00'
  if (/점심시간|점심때|점심/.test(s)) return '12:00'
  if (/저녁시간|저녁/.test(s)) return '18:00'
  if (/야간|밤/.test(s)) return '20:00'
  // 시간 범위(~) 는 그대로 보존
  if (s.includes('~')) return s
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h,m] = s.split(':').map(Number)
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }
  const isAm = s.includes('오전')
  const isPm = s.includes('오후')
  const hm = s.replace(/오전|오후|중/g,'')
  const hMatch = hm.match(/(\d+)시/)
  const mMatch = hm.match(/(\d+)분/)
  if (!hMatch) return s
  let h = parseInt(hMatch[1])
  const m = mMatch ? parseInt(mMatch[1]) : 0
  if (isPm && h < 12) h += 12
  if (isAm && h === 12) h = 0
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

export function parseDate(raw) {
  if (!raw) return today
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const slash = s.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/)
  if (slash) return `${slash[1]}-${String(slash[2]).padStart(2,'0')}-${String(slash[3]).padStart(2,'0')}`
  const short = s.match(/^(\d{1,2})[\/\.](\d{1,2})$/)
  if (short) return `${new Date().getFullYear()}-${String(short[1]).padStart(2,'0')}-${String(short[2]).padStart(2,'0')}`
  return today
}

export const HEADER_MAP = {
  date:        ['날짜','일자','date'],
  cname:       ['업체명','업체','현장명','현장','업체(담당자)','고객사'],
  address:     ['주소','현장주소','address'],
  time:        ['진입시간','시간','방문시간','예정시간','time'],
  cphone:      ['전화번호','연락처','전화','핸드폰','phone','tel'],
  waste:       ['폐기물양','폐기물량','폐기물','양','waste'],
  memo:        ['비고','메모','참고','memo','note'],
  door_pw:     ['공동비밀번호','공동pw','공동패스워드','공동'],
  unit_pw:     ['세대비밀번호','세대pw','세대패스워드','세대'],
  driver_hint: ['담당자','기사','기사명','driver'],
  driver_note: ['특이사항','비고2','note2'],
}

export function detectColMap(headers) {
  const map = {}
  headers.forEach((h, i) => {
    const norm = h.trim().replace(/\s|\*/g,'').toLowerCase()
    for (const [field, keywords] of Object.entries(HEADER_MAP)) {
      if (keywords.some(k => norm.includes(k.toLowerCase())) && !(field in map)) {
        map[field] = i
      }
    }
  })
  return map
}

export function parseKakaoChat(text) {
  const blocks = text.trim().split(/\n{2,}/)
  const results = []

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l)
    if (lines.length < 3) continue

    const phoneIdx = [...lines].reverse().findIndex(l => /\d{3}[\s-]\d{3,4}[\s-]\d{4}/.test(l))
    if (phoneIdx < 0) continue
    const phoneLine = lines[lines.length - 1 - phoneIdx]
    const phoneRaw = phoneLine.match(/\d{3}[\s-]\d{3,4}[\s-]\d{4}/)?.[0] || ''
    const cphone = phoneRaw.replace(/\s/g, '-')
    const contentLines = lines.slice(0, lines.length - 1 - phoneIdx)
    if (contentLines.length < 2) continue

    const cname = contentLines[0]

    const dateLine = contentLines[1] || ''
    let date = today
    const dateM = dateLine.match(/(\d{1,2})월\s*(\d{1,2})일/)
    if (dateM) {
      const y = new Date().getFullYear()
      date = `${y}-${String(dateM[1]).padStart(2,'0')}-${String(dateM[2]).padStart(2,'0')}`
    }
    let time = '09:00'
    if (/오전중/.test(dateLine)) {
      time = '오전중'
    } else if (/오후중/.test(dateLine)) {
      time = '오후중'
    } else if (/첫타임/.test(dateLine)) {
      time = '첫타임'
    } else if (/당일중/.test(dateLine)) {
      time = '당일중'
    } else if (/막타임/.test(dateLine)) {
      time = '막타임'
    } else if (/새벽/.test(dateLine)) {
      time = '06:00'
    } else if (/아침/.test(dateLine)) {
      time = '09:00'
    } else if (/점심시간|점심때|점심/.test(dateLine)) {
      time = '12:00'
    } else if (/저녁시간|저녁/.test(dateLine)) {
      time = '18:00'
    } else if (/야간|밤/.test(dateLine)) {
      time = '20:00'
    } else if (/~/.test(dateLine)) {
      // 시간 범위(예: 오후 2시 ~ 4시, 14:00~16:00) 그대로 보존, 공백 허용
      const rangeM = dateLine.match(/((?:오전|오후)?\s*\d+시(?:\s*\d+분)?\s*~\s*(?:오전|오후)?\s*\d+시(?:\s*\d+분)?|\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2})/)
      if (rangeM) time = rangeM[1].replace(/\s+/g, '')
      else {
        const timeM = dateLine.match(/(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/)
        if (timeM) {
          let h = parseInt(timeM[2])
          const m = timeM[3] ? parseInt(timeM[3]) : 0
          if (timeM[1] === '오후' && h < 12) h += 12
          if (timeM[1] === '오전' && h === 12) h = 0
          time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
        }
      }
    } else {
      const timeM = dateLine.match(/(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/)
      if (timeM) {
        let h = parseInt(timeM[2])
        const m = timeM[3] ? parseInt(timeM[3]) : 0
        if (timeM[1] === '오후' && h < 12) h += 12
        if (timeM[1] === '오전' && h === 12) h = 0
        time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
      }
    }

    // 주소: 3번째 줄부터 시작, 공동/세대/비밀번호/PW/전화번호 패턴 전까지 연속 줄 합치기
    const ADDRESS_STOP = /^(공동|세대|비밀번호|pw|비번)\s*[:：]/i
    const PHONE_PATTERN = /\d{3}[\s-]\d{3,4}[\s-]\d{4}/
    let addrLines = []
    let addrEnd = 2 // contentLines[2]부터 시작
    for (let i = 2; i < contentLines.length; i++) {
      const l = contentLines[i]
      if (ADDRESS_STOP.test(l) || PHONE_PATTERN.test(l)) break
      addrLines.push(l)
      addrEnd = i + 1
    }
    const address = addrLines.join(' ').trim()
    const rest = contentLines.slice(addrEnd)

    const doorLine = rest.find(l => /^공동\s*(?:비밀번호|비번|현관|pw|패스워드)?\s*[:：]/i.test(l))
    const unitLine = rest.find(l => /^세대\s*(?:비밀번호|비번|현관|pw|패스워드)?\s*[:：]/i.test(l))
    const door_pw = doorLine ? doorLine.replace(/^공동\s*(?:비밀번호|비번|현관|pw|패스워드)?\s*[:：]\s*/i, '').trim() : ''
    const unit_pw = unitLine ? unitLine.replace(/^세대\s*(?:비밀번호|비번|현관|pw|패스워드)?\s*[:：]\s*/i, '').trim() : ''

    const filtered = rest.filter(l => l !== doorLine && l !== unitLine)
    const wasteIdx = filtered.findIndex(l => /\d+\/\d+차|[0-9.]+톤|[0-9]+차|이하|이상|물량/i.test(l))
    const waste = wasteIdx >= 0 ? filtered[wasteIdx] : ''
    const memo = filtered.filter((_, i) => i !== wasteIdx).join(' / ')

    results.push({ cname, date, time, address, cphone, door_pw, unit_pw, waste, memo,
      _id: Math.random().toString(36).slice(2), driver_hint:'', driver_note:'' })
  }
  return results
}

// ── 시간 → 분 변환 (정렬용) ───────────────────────────────────────
// 첫타임(0) < 오전숫자(홀수×2+1) < 오전중(1440) < 오후숫자 < 오후중(2160) < 당일중(2162) < 막타임(2164) < 없음(9999)
const TIME_TEXT_ORDER = { '첫타임': 0, '오전중': 1440, '오후중': 2160, '당일중': 2162, '막타임': 2164 }
export function timeToMin(t) {
  if (!t) return 9999
  if (TIME_TEXT_ORDER[t] != null) return TIME_TEXT_ORDER[t]
  const [h, m] = String(t).split(':').map(Number)
  return isNaN(h) ? 9999 : (h * 60 + (m || 0)) * 2 + 1
}

export const newRow = () => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2,'0')
  const mm = String(now.getMinutes()).padStart(2,'0')
  return { _id: Math.random().toString(36).slice(2), date:today, time:`${hh}:${mm}`, address:'', waste:'', cname:'', cphone:'', door_pw:'', unit_pw:'', memo:'', driver_hint:'', driver_note:'' }
}
