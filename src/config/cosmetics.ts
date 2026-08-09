import type { CosmeticDefinition, GameState } from '../types/game'
import { GAME_CONFIG } from './gameConfig'

// 実績報酬の見た目はここへ追加します。unlockAchievementId を省略すると最初から使用できます。
export const CHARACTER_SKINS: CosmeticDefinition[] = [
  {
    id: 'sit',
    kind: 'character',
    name: 'いつものちる子',
    description: '満足計画の基本姿勢。',
    imagePath: GAME_CONFIG.characterImages.main,
  },
  {
    id: 'sleep',
    kind: 'character',
    name: 'おやすみちる子',
    description: '累計10,000満足のご褒美。',
    imagePath: GAME_CONFIG.characterImages.sleep,
    unlockAchievementId: 'satisfaction-10000',
  },
  {
    id: 'read',
    kind: 'character',
    name: '読書ちる子',
    description: '御利益を6個集めたご褒美。',
    imagePath: GAME_CONFIG.characterImages.read,
    unlockAchievementId: 'upgrade-6',
  },
  {
    id: 'run',
    kind: 'character',
    name: '駆けるちる子',
    description: '救済の欠片を7回つかまえたご褒美。',
    imagePath: GAME_CONFIG.characterImages.run,
    unlockAchievementId: 'lucky-7',
  },
]

export const STAGE_THEMES: CosmeticDefinition[] = [
  {
    id: 'rose',
    kind: 'theme',
    name: '仮設支部',
    description: '淡いピンクのいつもの観測室。',
  },
  {
    id: 'midnight',
    kind: 'theme',
    name: '深夜礼拝',
    description: '初めて再布教した者だけの夜。',
    unlockAchievementId: 'prestige-1',
  },
  {
    id: 'gold',
    kind: 'theme',
    name: '黄金教典',
    description: '救済印を10個集めた者の背景。',
    unlockAchievementId: 'marks-10',
  },
  {
    id: 'cosmic',
    kind: 'theme',
    name: 'Sora星雲',
    description: 'Sora3が想像した架空の満足宇宙。',
    unlockAchievementId: 'sora3-dream',
  },
]

export const ALL_COSMETICS = [...CHARACTER_SKINS, ...STAGE_THEMES]

export const isCosmeticUnlocked = (game: GameState, cosmetic: CosmeticDefinition) =>
  !cosmetic.unlockAchievementId || game.unlockedAchievementIds.includes(cosmetic.unlockAchievementId)

export const getCosmeticRewardsForAchievement = (achievementId: string) =>
  ALL_COSMETICS.filter((cosmetic) => cosmetic.unlockAchievementId === achievementId)
