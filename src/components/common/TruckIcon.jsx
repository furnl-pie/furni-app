export default function TruckIcon({ width=110, height=70, style={} }) {
  return (
    <img src="/icon-transparent.png" alt="트럭" width={width} height={height} style={{ objectFit:'contain', ...style }}/>
  )
}
