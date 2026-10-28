import type { GardenState } from '../types/game'

export const GARDEN_TEA_COST = 15
export const GARDEN_TEA_SECONDS = 300
export interface GardenSeed { id: string; name: string; description: string; growSeconds: number; petals: number; glyph: string; color: string; parents?: [string, string] }
export const GARDEN_SEEDS: readonly GardenSeed[] = [
  { id: 'sweet', name: '聖菓の実', description: '甘い香りの小さな実。', growSeconds: 180, petals: 2, glyph: '●', color: '#e99b76' },
  { id: 'fluff', name: 'ふかふか草', description: '触れると眠くなる草。', growSeconds: 480, petals: 3, glyph: '☁', color: '#c9b2e8' },
  { id: 'prayer', name: '祈りの花', description: '静かな願いを受け止める花。', growSeconds: 900, petals: 4, glyph: '✿', color: '#db82a7' },
  { id: 'honey', name: '蜜色ベリー', description: '甘さとふかふかの交配種。', growSeconds: 1200, petals: 5, glyph: '◆', color: '#e2b94f', parents: ['sweet', 'fluff'] },
  { id: 'moon', name: '月灯りの花', description: '眠りと祈りを照らす花。', growSeconds: 1800, petals: 7, glyph: '☾', color: '#9aa9df', parents: ['fluff', 'prayer'] },
  { id: 'star', name: '星砂の芽', description: '甘さと祈りから星を育てる。', growSeconds: 2700, petals: 9, glyph: '✦', color: '#e4c86a', parents: ['sweet', 'prayer'] },
  { id: 'dream', name: '夢見すずらん', description: '蜜と月の夢を見る花。', growSeconds: 3600, petals: 12, glyph: '♧', color: '#bca8db', parents: ['honey', 'moon'] },
  { id: 'aurora', name: '極光の聖花', description: '月と星を束ねる光。', growSeconds: 7200, petals: 16, glyph: '❈', color: '#83c9c1', parents: ['moon', 'star'] },
  { id: 'cosmos', name: '満足宇宙樹', description: '夢と極光の先にある庭の星。', growSeconds: 14400, petals: 24, glyph: '✺', color: '#8b78c9', parents: ['dream', 'aurora'] },
] as const
export const GARDEN_DECORATIONS: readonly { id: string; name: string; glyph: string; description: string; cost: number }[] = [
  { id: 'ribbon', name: '花リボン', glyph: '🎀', description: '庭の風に揺れる。', cost: 20 },
  { id: 'lantern', name: '星あかりランタン', glyph: '🏮', description: '夜の庭を照らす。', cost: 60 },
  { id: 'shrine', name: '小さな教祖像', glyph: '♟', description: '庭を静かに見守る。', cost: 120 },
] as const
const knownSeeds = new Set<string>(GARDEN_SEEDS.map((seed) => seed.id))
const knownDecorations = new Set<string>(GARDEN_DECORATIONS.map((decor) => decor.id))
export const createInitialGarden = (): GardenState => ({ unlocked: false, plots: Array(9).fill(null), unlockedSeedIds: ['sweet', 'fluff', 'prayer'], petals: 0, totalHarvests: 0, decorationIds: [], selectedDecorationId: null })
export const normalizeGarden = (value: unknown, fallbackUnlocked = false): GardenState => {
  const source = value && typeof value === 'object' ? value as Partial<GardenState> : {}
  const listedSeeds = Array.isArray(source.unlockedSeedIds) ? source.unlockedSeedIds.filter((id): id is string => typeof id === 'string' && knownSeeds.has(id)) : []
  const unlockedSeedIds = [...new Set(['sweet', 'fluff', 'prayer', ...listedSeeds])]
  const plots = Array.from({ length: 9 }, (_, index) => {
    const plant = Array.isArray(source.plots) ? source.plots[index] : null
    if (!plant || typeof plant !== 'object' || typeof plant.seedId !== 'string' || !knownSeeds.has(plant.seedId) || !unlockedSeedIds.includes(plant.seedId) || typeof plant.plantedAt !== 'number' || !Number.isFinite(plant.plantedAt) || plant.plantedAt < 0) return null
    return { seedId: plant.seedId, plantedAt: plant.plantedAt }
  })
  const decorationIds = Array.isArray(source.decorationIds) ? [...new Set(source.decorationIds.filter((id): id is string => typeof id === 'string' && knownDecorations.has(id)))] : []
  const selectedDecorationId = typeof source.selectedDecorationId === 'string' && decorationIds.includes(source.selectedDecorationId) ? source.selectedDecorationId : null
  const number = (input: unknown) => typeof input === 'number' && Number.isFinite(input) && input >= 0 ? Math.floor(input) : 0
  return { unlocked: source.unlocked === true || fallbackUnlocked, plots, unlockedSeedIds, petals: number(source.petals), totalHarvests: number(source.totalHarvests), decorationIds, selectedDecorationId }
}
