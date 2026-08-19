const numberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 1,
})

const detailedNumberFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 2,
})

const largeUnits = [
  { value: 1e24, suffix: '秭' },
  { value: 1e20, suffix: '垓' },
  { value: 1e16, suffix: '京' },
  { value: 1e12, suffix: '兆' },
  { value: 1e8, suffix: '億' },
]

export const formatNumber = (value: number) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  const unit = largeUnits.find((candidate) => safeValue >= candidate.value)
  if (unit) {
    const scaled = safeValue / unit.value
    return `${scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(2).replace(/\.00$/, '')}${unit.suffix}`
  }
  return numberFormatter.format(safeValue)
}

/** 省略せず、マウスオーバー用に正確な桁を表示します。 */
export const formatDetailedNumber = (value: number) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  return detailedNumberFormatter.format(safeValue)
}

export const formatDuration = (seconds: number) => {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}時間${minutes}分`
  if (minutes > 0) return `${minutes}分`
  return `${Math.floor(seconds)}秒`
}

export const formatMultiplier = (value: number) => {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value)
  const normalized = Math.abs(value - rounded) < 0.05 ? rounded : Number(value.toFixed(2))
  return String(normalized)
}
