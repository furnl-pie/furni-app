import { today } from '../constants/styles'

export function parseKoreanTime(raw) {
  if (!raw) return ''
  const s = raw.trim()
  if (s.includes('오전중')) return '오전중'
  if (s.includes('오후중')) return '오후중'
  if (s.includes('당일중')) return '당일중'
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
    } else if (/당일중/.test(dateLine)) {
      time = '당일중'
    } else if (/~/.test(dateLine)) {
      // 시간 범위(예: 오후2시~4시, 14:00~16:00) 그대로 보존
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

    const address = contentLines[2] || ''
    const rest = contentLines.slice(3)

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

export const newRow = () => {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2,'0')
  const mm = String(now.getMinutes()).padStart(2,'0')
  return { _id: Math.random().toString(36).slice(2), date:today, time:`${hh}:${mm}`, address:'', waste:'', cname:'', cphone:'', door_pw:'', unit_pw:'', memo:'', driver_hint:'', driver_note:'' }
}
