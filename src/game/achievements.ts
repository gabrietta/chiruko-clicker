import { ACHIEVEMENTS } from '../config/achievements'
import type { AchievementDefinition, GameState } from '../types/game'
import { getSatisfactionPerSecond, getTotalOwned } from './calculations'

export const getAchievementProgress = (
  game: GameState,
  achievement: AchievementDefinition,
) => {
  switch (achievement.metric) {
    case 'totalSatisfaction':
      return game.totalSatisfaction
    case 'manualClicks':
      return game.manualClicks
    case 'perSecond':
      return getSatisfactionPerSecond(
        game.inventory,
        game.unlockedAchievementIds.length,
        game.purchasedUpgradeIds,
        game.virtueMarks,
        game.purchasedDoctrineIds,
        game.worshipPolicy,
      )
    case 'totalOwned':
      return getTotalOwned(game.inventory)
    case 'uniqueItems':
      return Object.values(game.inventory).filter((count) => count > 0).length
    case 'itemOwned':
      return achievement.itemId ? (game.inventory[achievement.itemId] ?? 0) : 0
    case 'luckyEvents':
      return game.luckyEventsClicked
    case 'upgradesOwned':
      return game.purchasedUpgradeIds.length
    case 'prestigeCount':
      return game.prestigeCount
    case 'virtueMarks':
      return game.virtueMarks
    case 'luckyCombo':
      return game.maxBuffCombo
    case 'luckyChains':
      return game.luckyChainsCompleted
    case 'doctrinesOwned':
      return game.purchasedDoctrineIds.length
    case 'bestClickCombo':
      return game.bestClickCombo
    case 'luckyVarieties':
      return game.luckyEventTypesSeen.length
    case 'playSeconds':
      return game.playSeconds
    case 'offlineSessions':
      return game.offlineSessions
    case 'longestOffline':
      return game.longestOfflineSeconds
    case 'omenCompletions':
      return game.dailyOmenCompletions
    case 'worshipPolicyChanges':
      return game.worshipPolicyChanges
    case 'sleepyWakes':
      return game.sleepyTotalWoken
    case 'maxSleepyChirukos':
      return game.maxSleepyChirukos
  }
}

export const unlockEarnedAchievements = (game: GameState) => {
  const alreadyUnlocked = new Set(game.unlockedAchievementIds)
  const newAchievements = ACHIEVEMENTS.filter(
    (achievement) =>
      !alreadyUnlocked.has(achievement.id) &&
      getAchievementProgress(game, achievement) >= achievement.target,
  )

  if (newAchievements.length === 0) return { game, newAchievements }

  return {
    game: {
      ...game,
      unlockedAchievementIds: [
        ...game.unlockedAchievementIds,
        ...newAchievements.map((achievement) => achievement.id),
      ],
    },
    newAchievements,
  }
}
