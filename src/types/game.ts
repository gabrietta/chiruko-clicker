export type EffectType = 'click' | 'perSecond'

export type WorshipPolicy = 'balanced' | 'hands-on' | 'vigil'

export type OmenMetric = 'manualClicks' | 'totalPurchases' | 'luckyEvents' | 'playSeconds' | 'totalOwned'

export interface DailyOmenDefinition {
  id: string
  name: string
  description: string
  flavor: string
  metric: OmenMetric
  target: number
}

export interface ShopItemDefinition {
  id: string
  name: string
  description: string
  baseCost: number
  costGrowth: number
  effectType: EffectType
  effectValue: number
  icon: string
  imagePath?: string
}

export type AchievementMetric =
  | 'totalSatisfaction'
  | 'manualClicks'
  | 'perSecond'
  | 'totalOwned'
  | 'uniqueItems'
  | 'itemOwned'
  | 'luckyEvents'
  | 'upgradesOwned'
  | 'prestigeCount'
  | 'virtueMarks'
  | 'luckyCombo'
  | 'luckyChains'
  | 'doctrinesOwned'
  | 'bestClickCombo'
  | 'luckyVarieties'
  | 'playSeconds'
  | 'offlineSessions'
  | 'longestOffline'
  | 'omenCompletions'
  | 'worshipPolicyChanges'
  | 'sleepyWakes'
  | 'maxSleepyChirukos'

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  flavor: string
  icon: string
  metric: AchievementMetric
  target: number
  itemId?: string
  hidden?: boolean
}

export type UpgradeEffectType =
  | 'clickMultiplier'
  | 'globalProductionMultiplier'
  | 'itemProductionMultiplier'

export interface UpgradeDefinition {
  id: string
  name: string
  description: string
  flavor: string
  cost: number
  icon: string
  effectType: UpgradeEffectType
  effectValue: number
  itemId?: string
  unlock: {
    type: 'itemOwned' | 'totalSatisfaction' | 'prestige'
    target: number
    itemId?: string
  }
}

export type DoctrineEffectType =
  | 'clickMultiplier'
  | 'productionMultiplier'
  | 'achievementBonusMultiplier'
  | 'luckyFrequencyMultiplier'
  | 'luckyDurationMultiplier'
  | 'offlineCapMultiplier'
  | 'startingSatisfaction'

export interface DoctrineDefinition {
  id: string
  name: string
  description: string
  flavor: string
  icon: string
  cost: number
  effectType: DoctrineEffectType
  effectValue: number
  requires?: string[]
}

export interface CosmeticDefinition {
  id: string
  kind: 'character' | 'theme'
  name: string
  description: string
  imagePath?: string
  unlockAchievementId?: string
}

export interface AudioPreferences {
  masterEnabled: boolean
  clickEnabled: boolean
  effectsEnabled: boolean
  voiceEnabled: boolean
  bgmEnabled: boolean
  volume: number
}

export interface GameState {
  version: number
  satisfaction: number
  totalSatisfaction: number
  runSatisfaction: number
  inventory: Record<string, number>
  purchasedUpgradeIds: string[]
  manualClicks: number
  luckyEventsClicked: number
  totalPurchases: number
  totalLuckyRewards: number
  prestigeCount: number
  virtueMarks: number
  purchasedDoctrineIds: string[]
  selectedCharacterSkin: string
  selectedStageTheme: string
  maxBuffCombo: number
  luckyChainsCompleted: number
  clickCombo: number
  bestClickCombo: number
  clickComboLastAt: number
  luckyEventTypesSeen: string[]
  offlineSessions: number
  totalOfflineSeconds: number
  longestOfflineSeconds: number
  playSeconds: number
  highestPerSecond: number
  dailyOmenDate: string
  dailyOmenId: string
  dailyOmenStartValue: number
  dailyOmenCompleted: boolean
  dailyOmenCompletions: number
  worshipPolicy: WorshipPolicy
  worshipPolicyChanges: number
  sleepyChirukos: number
  sleepyBank: number
  sleepyTotalWoken: number
  maxSleepyChirukos: number
  startedAt: number
  unlockedAchievementIds: string[]
  viewedMemorialIds: string[]
  lastPlayedAt: number
  anomalyFrozen: boolean
  anomalyReason: string
}

export interface OfflineReport {
  elapsedSeconds: number
  earned: number
  wasCapped: boolean
}

export interface ActiveBuff {
  id: string
  name: string
  description: string
  kind: 'production' | 'click' | 'both'
  multiplier: number
  startedAt: number
  expiresAt: number
}

export interface LuckyEventResult {
  amount: number
  message: string
  buff: ActiveBuff | null
  chainStarted: boolean
  chainCompleted: boolean
  eventType: string
}
