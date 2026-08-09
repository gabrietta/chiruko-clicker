import { GAME_CONFIG, SHOP_ITEMS } from '../config/gameConfig'
import { getActiveSeason } from '../config/seasons'
import { UPGRADES } from '../config/upgrades'
import { getDoctrineEffect } from '../config/doctrines'
import type { GameState, ShopItemDefinition } from '../types/game'

export const getItemCost = (item: ShopItemDefinition, owned: number) =>
  Math.ceil(item.baseCost * item.costGrowth ** owned)

export const getBulkItemCost = (item: ShopItemDefinition, owned: number, quantity: number) => {
  if (quantity <= 0) return 0
  const numerator = item.baseCost * item.costGrowth ** owned * (item.costGrowth ** quantity - 1)
  return Math.ceil(numerator / (item.costGrowth - 1))
}

export const getMaxAffordableQuantity = (
  item: ShopItemDefinition,
  owned: number,
  satisfaction: number,
) => {
  if (satisfaction < getItemCost(item, owned)) return 0
  const estimate = Math.floor(
    Math.log(1 + (satisfaction * (item.costGrowth - 1)) / (item.baseCost * item.costGrowth ** owned)) /
    Math.log(item.costGrowth),
  )
  return Math.max(1, estimate)
}

const getUpgradeMultiplier = (
  purchasedUpgradeIds: string[],
  effectType: 'clickMultiplier' | 'globalProductionMultiplier',
) => UPGRADES.reduce((multiplier, upgrade) => (
  upgrade.effectType === effectType && purchasedUpgradeIds.includes(upgrade.id)
    ? multiplier * upgrade.effectValue
    : multiplier
), 1)

export const getGlobalProductionUpgradeMultiplier = (purchasedUpgradeIds: string[]) =>
  getUpgradeMultiplier(purchasedUpgradeIds, 'globalProductionMultiplier')

export const getItemProductionMultiplier = (itemId: string, purchasedUpgradeIds: string[]) =>
  UPGRADES.reduce((multiplier, upgrade) => (
    upgrade.effectType === 'itemProductionMultiplier' &&
    upgrade.itemId === itemId &&
    purchasedUpgradeIds.includes(upgrade.id)
      ? multiplier * upgrade.effectValue
      : multiplier
  ), 1)

export const FACILITY_MILESTONES = [10, 25, 50] as const
export const FACILITY_MILESTONE_MULTIPLIER = 1.4

export const getFacilityMilestoneMultiplier = (owned: number) =>
  FACILITY_MILESTONE_MULTIPLIER ** FACILITY_MILESTONES.filter((target) => owned >= target).length

export const getNextFacilityMilestone = (owned: number) =>
  FACILITY_MILESTONES.find((target) => owned < target) ?? null

export const getVirtueMarkMultiplier = (virtueMarks: number) =>
  1 + Math.log2(Math.max(0, virtueMarks) + 1) * GAME_CONFIG.virtueMarkBonusPerDoubling

export const getVirtueMarkBonusPercent = (virtueMarks: number) =>
  Math.round((getVirtueMarkMultiplier(virtueMarks) - 1) * 100)

export const getClickComboMultiplier = (combo: number) =>
  1 + Math.min(0.15, Math.max(0, combo - 1) * 0.005)

export const getClickPower = (
  inventory: Record<string, number>,
  purchasedUpgradeIds: string[] = [],
  virtueMarks = 0,
  purchasedDoctrineIds: string[] = [],
) => {
  const base = 1 + SHOP_ITEMS.reduce((total, item) => {
    if (item.effectType !== 'click') return total
    const owned = inventory[item.id] ?? 0
    return total + owned * item.effectValue * getFacilityMilestoneMultiplier(owned)
  }, 0)
  const prestigeMultiplier = getVirtueMarkMultiplier(virtueMarks)
  return base *
    getUpgradeMultiplier(purchasedUpgradeIds, 'clickMultiplier') *
    getDoctrineEffect(purchasedDoctrineIds, 'clickMultiplier') *
    prestigeMultiplier *
    getActiveSeason().clickMultiplier
}

export const getAchievementMultiplier = (
  achievementCount: number,
  purchasedDoctrineIds: string[] = [],
) => 1 + achievementCount *
  GAME_CONFIG.achievementProductionBonus *
  getDoctrineEffect(purchasedDoctrineIds, 'achievementBonusMultiplier')

export const getBaseSatisfactionPerSecond = (
  inventory: Record<string, number>,
  purchasedUpgradeIds: string[] = [],
) =>
  SHOP_ITEMS.reduce((total, item) => {
    if (item.effectType !== 'perSecond') return total
    const owned = inventory[item.id] ?? 0
    return total + owned * item.effectValue *
      getItemProductionMultiplier(item.id, purchasedUpgradeIds) *
      getFacilityMilestoneMultiplier(owned)
  }, 0)

export const getSatisfactionPerSecond = (
  inventory: Record<string, number>,
  achievementCount = 0,
  purchasedUpgradeIds: string[] = [],
  virtueMarks = 0,
  purchasedDoctrineIds: string[] = [],
) => {
  const prestigeMultiplier = getVirtueMarkMultiplier(virtueMarks)
  return getBaseSatisfactionPerSecond(inventory, purchasedUpgradeIds) *
    getAchievementMultiplier(achievementCount, purchasedDoctrineIds) *
    getGlobalProductionUpgradeMultiplier(purchasedUpgradeIds) *
    getDoctrineEffect(purchasedDoctrineIds, 'productionMultiplier') *
    prestigeMultiplier *
    getActiveSeason().productionMultiplier
}

export const getPrestigeGain = (runSatisfaction: number) =>
  Math.floor(Math.cbrt(runSatisfaction / GAME_CONFIG.prestigeBaseRequirement))

export const isUpgradeUnlocked = (game: GameState, upgradeId: string) => {
  const upgrade = UPGRADES.find((candidate) => candidate.id === upgradeId)
  if (!upgrade) return false
  const requirement = upgrade.unlock
  if (requirement.type === 'totalSatisfaction') return game.totalSatisfaction >= requirement.target
  if (requirement.type === 'prestige') return game.prestigeCount >= requirement.target
  return requirement.itemId ? (game.inventory[requirement.itemId] ?? 0) >= requirement.target : false
}

export const getTotalOwned = (inventory: Record<string, number>) =>
  Object.values(inventory).reduce((total, count) => total + count, 0)
