import { getTotalOwned } from '../game/calculations'
import type { DailyOmenDefinition, GameState, OmenMetric } from '../types/game'

export const DAILY_OMENS: DailyOmenDefinition[] = [
  { id: 'gentle-touch', name: 'おでこにご挨拶', description: 'ちる子を25回さわる', flavor: '本日の礼拝、たいへん丁寧でした。', metric: 'manualClicks', target: 25 },
  { id: 'small-offering', name: '小さな寄進', description: '設備や御利益を3回購入する', flavor: '机のすみへ、ささやかな奉納。', metric: 'totalPurchases', target: 3 },
  { id: 'watch-the-sparkle', name: 'きらめきを見つめて', description: '救済の欠片を1回つかまえる', flavor: '見逃さない眼差しも、立派な徳です。', metric: 'luckyEvents', target: 1 },
  { id: 'quiet-devotion', name: '静かな五分間', description: '5分間、満足計画を続ける', flavor: '何もしない時間にも、ちゃんと意味があります。', metric: 'playSeconds', target: 300 },
  { id: 'busy-desk', name: '机をにぎやかに', description: '設備を合計10個所有する', flavor: '少し狭いくらいが、ちょうどよい礼拝所です。', metric: 'totalOwned', target: 10 },
]

const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getDailyOmenDateKey = (timestamp = Date.now()) => dateKey(new Date(timestamp))

export const getDailyOmen = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  return DAILY_OMENS[((dayNumber % DAILY_OMENS.length) + DAILY_OMENS.length) % DAILY_OMENS.length]
}

export const getOmenMetricValue = (game: GameState, metric: OmenMetric) => {
  switch (metric) {
    case 'manualClicks': return game.manualClicks
    case 'totalPurchases': return game.totalPurchases
    case 'luckyEvents': return game.luckyEventsClicked
    case 'playSeconds': return game.playSeconds
    case 'totalOwned': return getTotalOwned(game.inventory)
  }
}

export const syncDailyOmen = (game: GameState, timestamp = Date.now()) => {
  const nextDate = getDailyOmenDateKey(timestamp)
  const omen = getDailyOmen(timestamp)
  if (game.dailyOmenDate === nextDate && game.dailyOmenId === omen.id) return game
  return {
    ...game,
    dailyOmenDate: nextDate,
    dailyOmenId: omen.id,
    dailyOmenStartValue: getOmenMetricValue(game, omen.metric),
    dailyOmenCompleted: false,
  }
}

export const getOmenProgress = (game: GameState, omen: DailyOmenDefinition) =>
  Math.max(0, getOmenMetricValue(game, omen.metric) - game.dailyOmenStartValue)
