export interface SeasonDefinition {
  id: string
  name: string
  subtitle: string
  description: string
  icon: string
  months: number[]
  productionMultiplier: number
  clickMultiplier: number
  luckyMultiplier: number
  accent: string
}

export const SEASONS: SeasonDefinition[] = [
  { id: 'spring', name: '桜色布教週間', subtitle: 'SPRING EVENT', description: 'ひとさわりが15%強化。花より満足。', icon: '桜', months: [2, 3, 4], productionMultiplier: 1, clickMultiplier: 1.15, luckyMultiplier: 1, accent: '#e98eae' },
  { id: 'summer', name: 'ラムネ救済祭', subtitle: 'SUMMER EVENT', description: '自動生産が10%強化。冷たい満足をどうぞ。', icon: '涼', months: [5, 6, 7], productionMultiplier: 1.1, clickMultiplier: 1, luckyMultiplier: 1, accent: '#55a9c7' },
  { id: 'autumn', name: '聖菓収穫祭', subtitle: 'AUTUMN EVENT', description: '救済の欠片の報酬が2倍。食欲も徳。', icon: '菓', months: [8, 9, 10], productionMultiplier: 1, clickMultiplier: 1, luckyMultiplier: 2, accent: '#c9823d' },
  { id: 'winter', name: '黒金降誕祭', subtitle: 'WINTER EVENT', description: '自動生産とひとさわりが各10%強化。', icon: '聖', months: [11, 0, 1], productionMultiplier: 1.1, clickMultiplier: 1.1, luckyMultiplier: 1, accent: '#a891c8' },
]

export const getActiveSeason = (date = new Date()) =>
  SEASONS.find((season) => season.months.includes(date.getMonth())) ?? SEASONS[0]
