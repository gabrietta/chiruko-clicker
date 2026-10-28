import { GARDEN_DECORATIONS, GARDEN_SEEDS } from '../config/garden'
import type { GameState, GardenPlant } from '../types/game'

const seed = (id: string) => GARDEN_SEEDS.find((item) => item.id === id)
export const getGardenNeighbors = (index: number) => {
  if (!Number.isInteger(index) || index < 0 || index >= 9) return []
  const row = Math.floor(index / 3); const col = index % 3
  return [index - 3, index + 3, col > 0 ? index - 1 : -1, col < 2 ? index + 1 : -1].filter((value) => value >= 0 && value < 9 && Math.floor(value / 3) >= row - 1 && Math.floor(value / 3) <= row + 1)
}
export const getPlantProgress = (plant: GardenPlant | null, now = Date.now()) => {
  if (!plant || !Number.isFinite(now)) return { mature: false, remainingSeconds: 0, progress: 0 }
  const definition = seed(plant.seedId)
  if (!definition) return { mature: false, remainingSeconds: 0, progress: 0 }
  const age = Math.max(0, now - plant.plantedAt) / 1000
  return { mature: age >= definition.growSeconds, remainingSeconds: Math.max(0, Math.ceil(definition.growSeconds - age)), progress: Math.min(100, Math.max(0, age / definition.growSeconds * 100)) }
}
export const isGardenUnlocked = (game: Pick<GameState, 'garden' | 'inventory' | 'totalPurchases'>) => game.garden.unlocked || Object.values(game.inventory).reduce((sum, count) => sum + count, 0) >= 25 || game.totalPurchases >= 25
export const plantGardenSeed = (game: GameState, index: number, seedId: string, now = Date.now()) => {
  if (game.anomalyFrozen || !isGardenUnlocked(game) || !Number.isInteger(index) || index < 0 || index >= 9 || game.garden.plots[index] || !game.garden.unlockedSeedIds.includes(seedId) || !seed(seedId) || !Number.isFinite(now) || now < 0) return game
  const plots = [...game.garden.plots]; plots[index] = { seedId, plantedAt: now }
  return { ...game, garden: { ...game.garden, unlocked: true, plots } }
}
export const harvestGardenPlot = (game: GameState, index: number, now = Date.now()) => {
  if (game.anomalyFrozen || !isGardenUnlocked(game) || !Number.isInteger(index) || index < 0 || index >= 9 || !Number.isFinite(now)) return null
  const plant = game.garden.plots[index]; const definition = plant && seed(plant.seedId)
  if (!plant || !definition || !getPlantProgress(plant, now).mature) return null
  const neighbors = getGardenNeighbors(index).map((neighbor) => game.garden.plots[neighbor]).filter((neighbor): neighbor is GardenPlant => Boolean(neighbor && getPlantProgress(neighbor, now).mature))
  const discovered = GARDEN_SEEDS.filter((candidate) => candidate.parents && candidate.parents.includes(plant.seedId) && neighbors.some((neighbor) => neighbor.seedId !== plant.seedId && candidate.parents?.includes(neighbor.seedId)) && !game.garden.unlockedSeedIds.includes(candidate.id)).map((candidate) => candidate.id)
  const plots = [...game.garden.plots]; plots[index] = null
  return { game: { ...game, garden: { ...game.garden, unlocked: true, plots, unlockedSeedIds: [...game.garden.unlockedSeedIds, ...discovered], petals: game.garden.petals + definition.petals, totalHarvests: game.garden.totalHarvests + 1 } }, petals: definition.petals, newSeedIds: discovered }
}
export const clearGardenPlot = (game: GameState, index: number) => game.anomalyFrozen || !isGardenUnlocked(game) || !Number.isInteger(index) || index < 0 || index >= 9 || !game.garden.plots[index] ? game : { ...game, garden: { ...game.garden, plots: game.garden.plots.map((plot, plotIndex) => plotIndex === index ? null : plot) } }
export const buyGardenDecoration = (game: GameState, id: string) => {
  const decoration = GARDEN_DECORATIONS.find((item) => item.id === id)
  if (game.anomalyFrozen || !isGardenUnlocked(game) || !decoration || game.garden.decorationIds.includes(id) || game.garden.petals < decoration.cost) return game
  return { ...game, garden: { ...game.garden, petals: game.garden.petals - decoration.cost, decorationIds: [...game.garden.decorationIds, id], selectedDecorationId: id } }
}
export const selectGardenDecoration = (game: GameState, id: string | null) => game.anomalyFrozen || !isGardenUnlocked(game) || (id !== null && !game.garden.decorationIds.includes(id)) ? game : { ...game, garden: { ...game.garden, selectedDecorationId: id } }
