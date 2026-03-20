export default function TruckIcon({ width=110, height=70 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="12" width="74" height="42" rx="2" fill="#f0f4f8" stroke="#c0ccd8" strokeWidth="1.2"/>
      <line x1="54" y1="12" x2="54" y2="54" stroke="#c0ccd8" strokeWidth="0.7"/>
      <line x1="76" y1="12" x2="76" y2="54" stroke="#c0ccd8" strokeWidth="0.7"/>
      <rect x="28" y="12" width="74" height="5" rx="2" fill="#dde5ee"/>
      <rect x="6" y="22" width="26" height="32" rx="3" fill="#1b3a5c"/>
      <polygon points="6,22 28,12 28,22" fill="#1b3a5c"/>
      <polygon points="10,22 24,14 24,22" fill="#7eb8e8" opacity="0.85"/>
      <rect x="8" y="25" width="10" height="8" rx="1.5" fill="#7eb8e8" opacity="0.7"/>
      <line x1="20" y1="22" x2="20" y2="54" stroke="#0f2740" strokeWidth="0.8"/>
      <rect x="4" y="50" width="28" height="5" rx="1" fill="#0f2740"/>
      <rect x="2" y="26" width="5" height="4" rx="1" fill="#2a5a8c"/>
      <rect x="6" y="54" width="96" height="4" rx="1" fill="#8899aa"/>
      <circle cx="20" cy="62" r="10" fill="#222"/>
      <circle cx="20" cy="62" r="6" fill="#444"/>
      <circle cx="20" cy="62" r="2.5" fill="#aaa"/>
      <circle cx="75" cy="62" r="10" fill="#222"/>
      <circle cx="75" cy="62" r="6" fill="#444"/>
      <circle cx="75" cy="62" r="2.5" fill="#aaa"/>
      <circle cx="93" cy="62" r="10" fill="#222"/>
      <circle cx="93" cy="62" r="6" fill="#444"/>
      <circle cx="93" cy="62" r="2.5" fill="#aaa"/>
      <rect x="32" y="26" width="66" height="20" rx="2" fill="#1b3a5c" opacity="0.08"/>
      <text x="65" y="40" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1b3a5c" fontFamily="'Noto Sans KR', sans-serif" letterSpacing="1">FN퍼니</text>
    </svg>
  )
}
