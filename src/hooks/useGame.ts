import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GAME_CONFIG, SHOP_ITEMS } from '../config/gameConfig'
import { getActiveSeason } from '../config/seasons'
import { UPGRADES } from '../config/upgrades'
import { ALL_COSMETICS, isCosmeticUnlocked } from '../config/cosmetics'
import { getDailyOmen, getOmenProgress, syncDailyOmen } from '../config/omens'
import {
  areDoctrineRequirementsMet,
  DOCTRINES,
  getDoctrineEffect,
  getSpentVirtueMarks,
} from '../config/doctrines'
import { unlockEarnedAchievements } from '../game/achievements'
import {
  getBulkItemCost,
  getClickPower,
  getClickComboMultiplier,
  getPrestigeGain,
  getSatisfactionPerSecond,
  getSleepyBankCap,
  getSleepyChirukoSlots,
  isUpgradeUnlocked,
} from '../game/calculations'
import { clearSavedGame, createInitialGame, decodeSaveData, encodeSaveData, loadGame, saveGame } from '../game/storage'
import type { ActiveBuff, AchievementDefinition, GameState, LuckyEventResult, OfflineReport } from '../types/game'

const randomBetween = (min: number, max: number) =>
  Math.round(min + Math.random() * (max - min))

const getBuffMultiplier = (buffs: ActiveBuff[], target: 'click' | 'production') =>
  buffs.reduce((multiplier, buff) => (
    buff.expiresAt > Date.now() && (buff.kind === 'both' || buff.kind === target)
      ? multiplier * buff.multiplier
      : multiplier
  ), 1)

const getAnomalyReason = (previous: GameState, candidate: GameState, buffs: ActiveBuff[]) => {
  const numericValues = [candidate.satisfaction, candidate.totalSatisfaction, candidate.runSatisfaction]
  if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
    return '満足の数値が現実の範囲を飛び出しました。'
  }
  const monotonicCounters: (keyof GameState)[] = [
    'manualClicks',
    'luckyEventsClicked',
    'totalPurchases',
    'totalLuckyRewards',
    'prestigeCount',
    'virtueMarks',
    'luckyChainsCompleted',
    'offlineSessions',
    'totalOfflineSeconds',
    'longestOfflineSeconds',
    'playSeconds',
    'highestPerSecond',
    'bestClickCombo',
  ]
  for (const field of monotonicCounters) {
    const previousValue = previous[field]
    const candidateValue = candidate[field]
    if (
      typeof previousValue !== 'number' ||
      typeof candidateValue !== 'number' ||
      !Number.isFinite(candidateValue) ||
      candidateValue < previousValue
    ) {
      return 'ちる子の記録が、ありえない巻き戻り方をしました。いったん満足を止めます。'
    }
  }
  for (const [itemId, count] of Object.entries(candidate.inventory)) {
    if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
      return `設備「${itemId}」の所持数が不正です。いったん満足を止めます。`
    }
  }
  if (candidate.totalSatisfaction + 1 < previous.totalSatisfaction) {
    return '累計満足が過去へ戻りました。'
  }

  const gain = candidate.totalSatisfaction - previous.totalSatisfaction
  const luckyRewardGain = candidate.totalLuckyRewards - previous.totalLuckyRewards
  const sleepyShare = previous.sleepyChirukos > 0
    ? previous.sleepyBank / previous.sleepyChirukos
    : 0
  const sleepyWakeReward = sleepyShare * GAME_CONFIG.sleepyChiruko.wakeBonus
  const sleepyWakeTolerance = Number.EPSILON * Math.max(1, Math.abs(sleepyShare), Math.abs(sleepyWakeReward)) * 32
  const isSleepyWake = previous.sleepyChirukos > 0 &&
    candidate.sleepyChirukos === previous.sleepyChirukos - 1 &&
    candidate.sleepyTotalWoken === previous.sleepyTotalWoken + 1 &&
    candidate.maxSleepyChirukos === previous.maxSleepyChirukos &&
    Math.abs((previous.sleepyBank - candidate.sleepyBank) - sleepyShare) <= sleepyWakeTolerance &&
    Math.abs((candidate.satisfaction - previous.satisfaction) - sleepyWakeReward) <= sleepyWakeTolerance &&
    Math.abs((candidate.totalSatisfaction - previous.totalSatisfaction) - sleepyWakeReward) <= sleepyWakeTolerance &&
    Math.abs((candidate.runSatisfaction - previous.runSatisfaction) - sleepyWakeReward) <= sleepyWakeTolerance
  // 旧バージョンでは、奇跡報酬の累計だけ別の計算方法で保存された
  // セーブがありました。この値を今回の増加量と比較すると、再布教後の
  // 大きな救済印・連鎖報酬を正しく遊んでいる人まで誤検知します。
  // 報酬そのものは下の maxLuckyReward で上限を確認するため、ここでは
  // 冗長な差分判定を行わないようにします。

  const baseProduction = getSatisfactionPerSecond(
    previous.inventory,
    previous.unlockedAchievementIds.length,
    previous.purchasedUpgradeIds,
    previous.virtueMarks,
    previous.purchasedDoctrineIds,
    previous.worshipPolicy,
  )
  const baseClick = getClickPower(
    previous.inventory,
    previous.purchasedUpgradeIds,
    previous.virtueMarks,
    previous.purchasedDoctrineIds,
    previous.worshipPolicy,
  )
  const production = baseProduction * getBuffMultiplier(buffs, 'production')
  const click = baseClick * getClickComboMultiplier(50) * getBuffMultiplier(buffs, 'click')
  const expectedBaseReward = Math.ceil(
    Math.max(25, baseProduction * 60, baseClick * 20) * getActiveSeason().luckyMultiplier,
  )
  const maxLuckyReward = expectedBaseReward * GAME_CONFIG.anomalyDetection.maxLuckyRewardMultiplier
  const allowedGain = Math.max(
    100_000,
    (production + click) * GAME_CONFIG.anomalyDetection.maxGainRateMultiplier,
    maxLuckyReward,
    isSleepyWake ? sleepyWakeReward : 0,
  )
  if (gain > allowedGain) return '満足の増え方が、ちる子の想定を大きく超えました。'
  const satisfactionGain = candidate.satisfaction - previous.satisfaction
  if (satisfactionGain > allowedGain) {
    return '現在の満足が、ちる子の想定を大きく飛び越えました。いったん満足を止めます。'
  }

  if (luckyRewardGain > 0) {
    if (luckyRewardGain > maxLuckyReward) {
      return '奇跡のご利益が、一度に大きすぎます。ちる子が確認するまで満足を止めます。'
    }
  }
  return null
}

export const useGame = () => {
  const initialLoad = useRef<ReturnType<typeof loadGame> | null>(null)
  if (!initialLoad.current) {
    const loaded = loadGame()
    loaded.game = syncDailyOmen(loaded.game)
    loaded.game = unlockEarnedAchievements(loaded.game).game
    initialLoad.current = loaded
  }

  const [game, setGame] = useState<GameState>(initialLoad.current.game)
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(
    initialLoad.current.offlineReport,
  )
  const [saveLabel, setSaveLabel] = useState('自動保存オン')
  const [latestAchievement, setLatestAchievement] = useState<AchievementDefinition | null>(null)
  const [luckyEventVisible, setLuckyEventVisible] = useState(false)
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([])
  const [luckyCycle, setLuckyCycle] = useState(0)
  const [chainRemaining, setChainRemaining] = useState(0)
  const gameRef = useRef(game)
  const activeBuffsRef = useRef<ActiveBuff[]>([])
  const hasScheduledLuckyRef = useRef(false)
  const luckyEventTimesRef = useRef<number[]>([])
  const lastLuckyClaimAtRef = useRef(0)
  const luckyAssistUsesRef = useRef(0)
  const lastTickRef = useRef(performance.now())
  const playAccumulatorRef = useRef(0)

  const clickPower = useMemo(
    () => getClickPower(
      game.inventory,
      game.purchasedUpgradeIds,
      game.virtueMarks,
      game.purchasedDoctrineIds,
      game.worshipPolicy,
    ) * getClickComboMultiplier(game.clickCombo) * getBuffMultiplier(activeBuffs, 'click'),
    [activeBuffs, game.clickCombo, game.inventory, game.purchasedDoctrineIds, game.purchasedUpgradeIds, game.virtueMarks, game.worshipPolicy],
  )
  const satisfactionPerSecond = useMemo(
    () => getSatisfactionPerSecond(
      game.inventory,
      game.unlockedAchievementIds.length,
      game.purchasedUpgradeIds,
      game.virtueMarks,
      game.purchasedDoctrineIds,
      game.worshipPolicy,
    ) * getBuffMultiplier(activeBuffs, 'production'),
    [activeBuffs, game.inventory, game.purchasedDoctrineIds, game.purchasedUpgradeIds, game.unlockedAchievementIds.length, game.virtueMarks, game.worshipPolicy],
  )

  useEffect(() => {
    gameRef.current = game
  }, [game])

  useEffect(() => {
    activeBuffsRef.current = activeBuffs
    if (activeBuffs.length === 0) return
    const nextExpiry = Math.min(...activeBuffs.map((buff) => buff.expiresAt))
    const timer = window.setTimeout(() => {
      setActiveBuffs((current) => current.filter((buff) => buff.expiresAt > Date.now()))
    }, Math.max(0, nextExpiry - Date.now()) + 20)
    return () => window.clearTimeout(timer)
  }, [activeBuffs])

  const persist = useCallback((snapshot: GameState, showStatus = true) => {
    saveGame(snapshot)
    if (!showStatus) return
    setSaveLabel('保存しました')
    window.setTimeout(() => setSaveLabel('自動保存オン'), 1100)
  }, [])

  const commit = useCallback((candidate: GameState, persistNow = false) => {
    const current = syncDailyOmen(gameRef.current)
    const prepared = syncDailyOmen(candidate)
    if (current !== gameRef.current) {
      gameRef.current = current
      setGame(current)
    }
    const anomalyReason = getAnomalyReason(current, prepared, activeBuffsRef.current)
    // Protect the save by rejecting only the suspicious update. A local-only
    // game should never lock an entire player out because of a false positive.
    if (anomalyReason) return gameRef.current
    const result = unlockEarnedAchievements(prepared)
    const next = result.game
    gameRef.current = next
    setGame(next)
    if (result.newAchievements.length > 0) {
      setLatestAchievement(result.newAchievements[result.newAchievements.length - 1])
      persistNow = true
    }
    if (persistNow) persist(next)
    return next
  }, [persist])

  useEffect(() => {
    if (game.clickCombo <= 0) return
    const remaining = Math.max(0, game.clickComboLastAt + 2_200 - Date.now())
    const timer = window.setTimeout(() => {
      if (Date.now() - gameRef.current.clickComboLastAt < 2_200) return
      commit({ ...gameRef.current, clickCombo: 0 })
    }, remaining + 20)
    return () => window.clearTimeout(timer)
  }, [commit, game.clickCombo, game.clickComboLastAt])

  useEffect(() => {
    persist(gameRef.current, false)

    const productionTimer = window.setInterval(() => {
      const now = performance.now()
      const elapsed = Math.min((now - lastTickRef.current) / 1000, 10)
      lastTickRef.current = now
      playAccumulatorRef.current += elapsed
      const playGain = playAccumulatorRef.current >= 1 ? playAccumulatorRef.current : 0
      if (playGain > 0) playAccumulatorRef.current = 0
      const rate = getSatisfactionPerSecond(
        gameRef.current.inventory,
        gameRef.current.unlockedAchievementIds.length,
        gameRef.current.purchasedUpgradeIds,
        gameRef.current.virtueMarks,
        gameRef.current.purchasedDoctrineIds,
        gameRef.current.worshipPolicy,
      ) * getBuffMultiplier(activeBuffsRef.current, 'production')
      if (rate <= 0 && playGain <= 0) return
      const gain = rate * elapsed
      const sleepyBank = Math.min(
        getSleepyBankCap(rate, gameRef.current.sleepyBank),
        gameRef.current.sleepyBank + gain * gameRef.current.sleepyChirukos * GAME_CONFIG.sleepyChiruko.sharePerChiruko,
      )
      commit({
        ...gameRef.current,
        satisfaction: gameRef.current.satisfaction + gain,
        totalSatisfaction: gameRef.current.totalSatisfaction + gain,
        runSatisfaction: gameRef.current.runSatisfaction + gain,
        playSeconds: gameRef.current.playSeconds + playGain,
        highestPerSecond: Math.max(gameRef.current.highestPerSecond, rate),
        sleepyBank,
      })
    }, GAME_CONFIG.productionTickMs)

    const saveTimer = window.setInterval(
      () => persist(gameRef.current),
      GAME_CONFIG.autoSaveIntervalMs,
    )
    const saveBeforeLeaving = () => saveGame(gameRef.current)
    window.addEventListener('pagehide', saveBeforeLeaving)
    window.addEventListener('beforeunload', saveBeforeLeaving)

    return () => {
      window.clearInterval(productionTimer)
      window.clearInterval(saveTimer)
      window.removeEventListener('pagehide', saveBeforeLeaving)
      window.removeEventListener('beforeunload', saveBeforeLeaving)
      saveBeforeLeaving()
    }
  }, [commit, persist])

  useEffect(() => {
    const config = GAME_CONFIG.luckyEvent
    const frequencyMultiplier = getDoctrineEffect(
      game.purchasedDoctrineIds,
      'luckyFrequencyMultiplier',
    )
    const durationMultiplier = getDoctrineEffect(
      game.purchasedDoctrineIds,
      'luckyDurationMultiplier',
    )
    const isFirst = !hasScheduledLuckyRef.current
    const liveBuffCount = activeBuffs.filter((buff) => buff.expiresAt > Date.now()).length
    if (liveBuffCount === 0) luckyAssistUsesRef.current = 0
    const comboAssistActive = liveBuffCount >= config.comboAssistMinActiveBuffs &&
      luckyAssistUsesRef.current < config.comboAssistUsesPerBuffWindow
    const delay = chainRemaining > 0
      ? 900
      : comboAssistActive
        ? randomBetween(config.comboAssistDelayMinMs, config.comboAssistDelayMaxMs)
      : randomBetween(
        isFirst ? config.firstDelayMinMs : config.repeatDelayMinMs,
        isFirst ? config.firstDelayMaxMs : config.repeatDelayMaxMs,
      ) * frequencyMultiplier
    hasScheduledLuckyRef.current = true
    const appearanceTimer = window.setTimeout(() => {
      setLuckyEventVisible(true)
    }, delay)
    const hideTimer = window.setTimeout(() => {
      setLuckyEventVisible(false)
      if (chainRemaining > 0) setChainRemaining(0)
      setLuckyCycle((cycle) => cycle + 1)
    }, delay + config.visibleMs * durationMultiplier)

    return () => {
      window.clearTimeout(appearanceTimer)
      window.clearTimeout(hideTimer)
    }
  }, [activeBuffs, chainRemaining, game.purchasedDoctrineIds, luckyCycle])

  const clickCharacter = useCallback(() => {
    const now = Date.now()
    const previous = gameRef.current
    const nextCombo = now - previous.clickComboLastAt <= 2_200
      ? Math.min(50, previous.clickCombo + 1)
      : 1
    const amount = getClickPower(
      previous.inventory,
      previous.purchasedUpgradeIds,
      previous.virtueMarks,
      previous.purchasedDoctrineIds,
      previous.worshipPolicy,
    ) * getClickComboMultiplier(nextCombo) * getBuffMultiplier(activeBuffsRef.current, 'click')
    commit({
      ...previous,
      satisfaction: previous.satisfaction + amount,
      totalSatisfaction: previous.totalSatisfaction + amount,
      runSatisfaction: previous.runSatisfaction + amount,
      manualClicks: previous.manualClicks + 1,
      clickCombo: nextCombo,
      bestClickCombo: Math.max(previous.bestClickCombo, nextCombo),
      clickComboLastAt: now,
    })
    return amount
  }, [commit])

  const purchaseItem = useCallback((itemId: string, quantity = 1) => {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId)
    if (!item) return false

    const owned = gameRef.current.inventory[itemId] ?? 0
    const safeQuantity = Math.max(1, Math.floor(quantity))
    const cost = getBulkItemCost(item, owned, safeQuantity)
    if (gameRef.current.satisfaction < cost) return false

    commit({
      ...gameRef.current,
      satisfaction: gameRef.current.satisfaction - cost,
      inventory: {
        ...gameRef.current.inventory,
        [itemId]: owned + safeQuantity,
      },
      totalPurchases: gameRef.current.totalPurchases + safeQuantity,
    }, true)
    return true
  }, [commit])

  const purchaseUpgrade = useCallback((upgradeId: string) => {
    const upgrade = UPGRADES.find((candidate) => candidate.id === upgradeId)
    if (!upgrade || gameRef.current.purchasedUpgradeIds.includes(upgradeId)) return false
    if (!isUpgradeUnlocked(gameRef.current, upgradeId) || gameRef.current.satisfaction < upgrade.cost) return false
    commit({
      ...gameRef.current,
      satisfaction: gameRef.current.satisfaction - upgrade.cost,
      purchasedUpgradeIds: [...gameRef.current.purchasedUpgradeIds, upgradeId],
      totalPurchases: gameRef.current.totalPurchases + 1,
    }, true)
    return true
  }, [commit])

  const claimLuckyEvent = useCallback((): LuckyEventResult => {
    if (!luckyEventVisible) {
      return { amount: 0, message: '', buff: null, chainStarted: false, chainCompleted: false, eventType: '' }
    }
    const now = Date.now()
    const lastClaimAt = lastLuckyClaimAtRef.current
    if (
      lastClaimAt > 0 &&
      (now < lastClaimAt || now - lastClaimAt < GAME_CONFIG.anomalyDetection.minLuckyClaimIntervalMs)
    ) {
      // Mobile browsers can dispatch a second click from a perfectly normal
      // double tap. Ignore the duplicate instead of freezing the whole save.
      return { amount: 0, message: '', buff: null, chainStarted: false, chainCompleted: false, eventType: '' }
    }
    const windowStart = now - GAME_CONFIG.anomalyDetection.luckyWindowMs
    luckyEventTimesRef.current = luckyEventTimesRef.current.filter((timestamp) => timestamp >= windowStart)
    if (luckyEventTimesRef.current.length >= GAME_CONFIG.anomalyDetection.maxLuckyEventsPerWindow) {
      // Legitimate chains and assisted miracles can bunch together. Rate-limit
      // only the event itself; never stop ordinary production for this case.
      setLuckyEventVisible(false)
      setChainRemaining(0)
      setLuckyCycle((cycle) => cycle + 1)
      return {
        amount: 0,
        message: '救済の欠片は少し休憩中です。しばらくお待ちください。',
        buff: null,
        chainStarted: false,
        chainCompleted: false,
        eventType: 'cooldown',
      }
    }
    lastLuckyClaimAtRef.current = now
    luckyEventTimesRef.current.push(now)
    const perSecond = getSatisfactionPerSecond(
      gameRef.current.inventory,
      gameRef.current.unlockedAchievementIds.length,
      gameRef.current.purchasedUpgradeIds,
      gameRef.current.virtueMarks,
      gameRef.current.purchasedDoctrineIds,
      gameRef.current.worshipPolicy,
    )
    const baseReward = Math.ceil(Math.max(
      25,
      perSecond * 60,
      getClickPower(
        gameRef.current.inventory,
        gameRef.current.purchasedUpgradeIds,
        gameRef.current.virtueMarks,
        gameRef.current.purchasedDoctrineIds,
        gameRef.current.worshipPolicy,
      ) * 20,
    ) * getActiveSeason().luckyMultiplier)
    const liveBuffs = activeBuffsRef.current.filter((active) => active.expiresAt > now)
    const comboAssistActive = chainRemaining === 0 &&
      liveBuffs.length >= GAME_CONFIG.luckyEvent.comboAssistMinActiveBuffs &&
      luckyAssistUsesRef.current < GAME_CONFIG.luckyEvent.comboAssistUsesPerBuffWindow
    if (comboAssistActive) luckyAssistUsesRef.current += 1
    const roll = comboAssistActive && Math.random() < GAME_CONFIG.luckyEvent.comboAssistBuffChance
      ? 0.30 + Math.random() * 0.60
      : Math.random()
    const durationMultiplier = getDoctrineEffect(
      gameRef.current.purchasedDoctrineIds,
      'luckyDurationMultiplier',
    )
    const duration = (milliseconds: number) => Math.round(milliseconds * durationMultiplier)
    let reward = 0
    let buff: ActiveBuff | null = null
    let message = ''
    let eventType = 'small-reward'
    let chainStarted = false
    let chainCompleted = false

    if (chainRemaining > 0) {
      const chainStep = 3 - chainRemaining
      const chainMultiplier = [2, 3, 5][chainStep] ?? 5
      reward = baseReward * chainMultiplier
      eventType = 'chain'
      chainCompleted = chainRemaining === 1
      message = chainCompleted
        ? `満足チェーン完走！ +${reward.toLocaleString('ja-JP')}満足`
        : `満足チェーン ${chainStep + 1}/3！ +${reward.toLocaleString('ja-JP')}満足`
    } else if (roll < 0.30) {
      reward = baseReward
      eventType = 'fragment-reward'
      message = `満足の贈り物！ +${Math.ceil(reward).toLocaleString('ja-JP')}満足`
    } else if (roll < 0.50) {
      const expiresAt = now + duration(30_000)
      eventType = 'production-blessing'
      buff = { id: `production-${now}`, name: '満足大行進', description: '自動生産が7倍', kind: 'production', multiplier: 7, startedAt: now, expiresAt }
      message = `満足大行進！ ${Math.round((expiresAt - now) / 1000)}秒間、自動生産が7倍`
    } else if (roll < 0.68) {
      const expiresAt = now + duration(10_000)
      eventType = 'click-blessing'
      buff = { id: `click-${now}`, name: 'おでこ無双', description: 'ひとさわりが77倍', kind: 'click', multiplier: 77, startedAt: now, expiresAt }
      message = `おでこ無双！ ${Math.round((expiresAt - now) / 1000)}秒間、ひとさわりが77倍`
    } else if (roll < 0.80) {
      const expiresAt = now + duration(40_000)
      eventType = 'all-blessing'
      buff = { id: `both-${now}`, name: '教祖降臨', description: 'すべての生産が3倍', kind: 'both', multiplier: 3, startedAt: now, expiresAt }
      message = `教祖降臨！ ${Math.round((expiresAt - now) / 1000)}秒間、すべての生産が3倍`
    } else if (roll < 0.90) {
      const candidates = SHOP_ITEMS.filter(
        (item) => item.effectType === 'perSecond' && (gameRef.current.inventory[item.id] ?? 0) > 0,
      )
      const item = candidates[Math.floor(Math.random() * candidates.length)]
      if (item) {
        eventType = 'facility-blessing'
        const owned = gameRef.current.inventory[item.id] ?? 0
        const multiplier = Math.min(15, Math.max(2, 1 + Math.floor(Math.sqrt(owned))))
        const expiresAt = now + duration(35_000)
        buff = {
          id: `facility-${item.id}-${now}`,
          name: `${item.name}の大覚醒`,
          description: `所持数共鳴で自動生産が${multiplier}倍`,
          kind: 'production',
          multiplier,
          startedAt: now,
          expiresAt,
        }
        message = `${item.name}の大覚醒！ ${Math.round((expiresAt - now) / 1000)}秒間、自動生産が${multiplier}倍`
      } else {
        reward = baseReward
        message = `設備の代わりに満足をお届け！ +${reward.toLocaleString('ja-JP')}満足`
      }
    } else if (roll < 0.96) {
      reward = baseReward
      chainStarted = true
      eventType = 'chain'
      message = `満足チェーン開始！ +${reward.toLocaleString('ja-JP')}満足・次の欠片を追いかけて！`
    } else if (roll < 0.98) {
      reward = Math.ceil(Math.max(7, baseReward * 0.08))
      message = `ちょっと残念な欠片……それでも +${reward.toLocaleString('ja-JP')}満足`
    } else {
      eventType = 'lost-believer'
      reward = Math.ceil(Math.max(15, baseReward * 0.15))
      message = `迷子の信者がひとり……お礼に +${reward.toLocaleString('ja-JP')}満足`
    }

    setLuckyEventVisible(false)
    if (buff) {
      const nextBuffs = [...liveBuffs, buff].slice(-GAME_CONFIG.luckyEvent.maxConcurrentBuffs)
      activeBuffsRef.current = nextBuffs
      setActiveBuffs(nextBuffs)
    }
    const comboCount = buff
      ? Math.min(GAME_CONFIG.luckyEvent.maxConcurrentBuffs, liveBuffs.length + 1)
      : liveBuffs.length
    const nextChainRemaining = chainStarted ? 3 : chainRemaining > 0 ? chainRemaining - 1 : 0
    setChainRemaining(nextChainRemaining)
    setLuckyCycle((cycle) => cycle + 1)
    const luckyCandidate = {
      ...gameRef.current,
      satisfaction: gameRef.current.satisfaction + reward,
      totalSatisfaction: gameRef.current.totalSatisfaction + reward,
      runSatisfaction: gameRef.current.runSatisfaction + reward,
      luckyEventsClicked: gameRef.current.luckyEventsClicked + 1,
      totalLuckyRewards: gameRef.current.totalLuckyRewards + reward,
      luckyEventTypesSeen: gameRef.current.luckyEventTypesSeen.includes(eventType)
        ? gameRef.current.luckyEventTypesSeen
        : [...gameRef.current.luckyEventTypesSeen, eventType],
      maxBuffCombo: Math.max(gameRef.current.maxBuffCombo, comboCount),
      luckyChainsCompleted: gameRef.current.luckyChainsCompleted + (chainCompleted ? 1 : 0),
    }
    const next = commit(luckyCandidate, true)
    if (next.totalLuckyRewards < luckyCandidate.totalLuckyRewards) {
      return { amount: 0, message: '', buff: null, chainStarted: false, chainCompleted: false, eventType: '' }
    }
    return { amount: reward, message, buff, chainStarted, chainCompleted, eventType }
  }, [chainRemaining, commit, luckyEventVisible])

  const claimDailyOmen = useCallback(() => {
    const current = syncDailyOmen(gameRef.current)
    const omen = getDailyOmen()
    if (current.dailyOmenCompleted || getOmenProgress(current, omen) < omen.target) return false
    commit({
      ...current,
      dailyOmenCompleted: true,
      dailyOmenCompletions: current.dailyOmenCompletions + 1,
    }, true)
    return true
  }, [commit])

  const setWorshipPolicy = useCallback((policy: GameState['worshipPolicy']) => {
    const current = gameRef.current
    if (current.worshipPolicy === policy) return false
    commit({
      ...current,
      worshipPolicy: policy,
      worshipPolicyChanges: current.worshipPolicyChanges + 1,
    }, true)
    return true
  }, [commit])

  const sendSleepyChiruko = useCallback(() => {
    const current = gameRef.current
    const slots = getSleepyChirukoSlots(current.inventory)
    if (current.sleepyChirukos >= slots) return false
    const nextCount = current.sleepyChirukos + 1
    commit({
      ...current,
      sleepyChirukos: nextCount,
      maxSleepyChirukos: Math.max(current.maxSleepyChirukos, nextCount),
    }, true)
    return true
  }, [commit])

  const wakeSleepyChiruko = useCallback(() => {
    const current = gameRef.current
    if (current.sleepyChirukos <= 0) return 0
    const bankShare = current.sleepyBank / current.sleepyChirukos
    const reward = bankShare * GAME_CONFIG.sleepyChiruko.wakeBonus
    const next = commit({
      ...current,
      satisfaction: current.satisfaction + reward,
      totalSatisfaction: current.totalSatisfaction + reward,
      runSatisfaction: current.runSatisfaction + reward,
      sleepyChirukos: current.sleepyChirukos - 1,
      sleepyBank: Math.max(0, current.sleepyBank - bankShare),
      sleepyTotalWoken: current.sleepyTotalWoken + 1,
    }, true)
    return next.sleepyChirukos === current.sleepyChirukos - 1 &&
      next.sleepyTotalWoken === current.sleepyTotalWoken + 1
      ? reward
      : 0
  }, [commit])

  const purchaseDoctrine = useCallback((doctrineId: string) => {
    const doctrine = DOCTRINES.find((candidate) => candidate.id === doctrineId)
    if (!doctrine || gameRef.current.purchasedDoctrineIds.includes(doctrineId)) return false
    if (!areDoctrineRequirementsMet(gameRef.current.purchasedDoctrineIds, doctrine)) return false
    const availableMarks = gameRef.current.virtueMarks -
      getSpentVirtueMarks(gameRef.current.purchasedDoctrineIds)
    if (availableMarks < doctrine.cost) return false
    commit({
      ...gameRef.current,
      purchasedDoctrineIds: [...gameRef.current.purchasedDoctrineIds, doctrineId],
    }, true)
    return true
  }, [commit])

  const selectCosmetic = useCallback((kind: 'character' | 'theme', cosmeticId: string) => {
    const cosmetic = ALL_COSMETICS.find(
      (candidate) => candidate.kind === kind && candidate.id === cosmeticId,
    )
    if (!cosmetic || !isCosmeticUnlocked(gameRef.current, cosmetic)) return false
    commit({
      ...gameRef.current,
      selectedCharacterSkin: kind === 'character'
        ? cosmeticId
        : gameRef.current.selectedCharacterSkin,
      selectedStageTheme: kind === 'theme'
        ? cosmeticId
        : gameRef.current.selectedStageTheme,
    }, true)
    return true
  }, [commit])

  const markMemorialViewed = useCallback((memorialId: string) => {
    if (gameRef.current.viewedMemorialIds.includes(memorialId)) return
    commit({
      ...gameRef.current,
      viewedMemorialIds: [...gameRef.current.viewedMemorialIds, memorialId],
    }, true)
  }, [commit])

  const prestige = useCallback(() => {
    const gain = getPrestigeGain(gameRef.current.runSatisfaction)
    if (gain <= 0) return 0
    const fresh = createInitialGame()
    const startingSatisfaction = getDoctrineEffect(
      gameRef.current.purchasedDoctrineIds,
      'startingSatisfaction',
      0,
    )
    commit({
      ...fresh,
      satisfaction: startingSatisfaction,
      totalSatisfaction: gameRef.current.totalSatisfaction,
      manualClicks: gameRef.current.manualClicks,
      luckyEventsClicked: gameRef.current.luckyEventsClicked,
      totalPurchases: gameRef.current.totalPurchases,
      totalLuckyRewards: gameRef.current.totalLuckyRewards,
      prestigeCount: gameRef.current.prestigeCount + 1,
      virtueMarks: gameRef.current.virtueMarks + gain,
      purchasedDoctrineIds: gameRef.current.purchasedDoctrineIds,
      selectedCharacterSkin: gameRef.current.selectedCharacterSkin,
      selectedStageTheme: gameRef.current.selectedStageTheme,
      dailyOmenDate: gameRef.current.dailyOmenDate,
      dailyOmenId: gameRef.current.dailyOmenId,
      dailyOmenStartValue: gameRef.current.dailyOmenStartValue,
      dailyOmenCompleted: gameRef.current.dailyOmenCompleted,
      dailyOmenCompletions: gameRef.current.dailyOmenCompletions,
      worshipPolicy: gameRef.current.worshipPolicy,
      worshipPolicyChanges: gameRef.current.worshipPolicyChanges,
      sleepyChirukos: 0,
      sleepyBank: 0,
      sleepyTotalWoken: gameRef.current.sleepyTotalWoken,
      maxSleepyChirukos: gameRef.current.maxSleepyChirukos,
      maxBuffCombo: gameRef.current.maxBuffCombo,
      luckyChainsCompleted: gameRef.current.luckyChainsCompleted,
      clickCombo: 0,
      bestClickCombo: gameRef.current.bestClickCombo,
      clickComboLastAt: 0,
      luckyEventTypesSeen: gameRef.current.luckyEventTypesSeen,
      offlineSessions: gameRef.current.offlineSessions,
      totalOfflineSeconds: gameRef.current.totalOfflineSeconds,
      longestOfflineSeconds: gameRef.current.longestOfflineSeconds,
      playSeconds: gameRef.current.playSeconds,
      highestPerSecond: gameRef.current.highestPerSecond,
      startedAt: gameRef.current.startedAt,
      unlockedAchievementIds: gameRef.current.unlockedAchievementIds,
      viewedMemorialIds: gameRef.current.viewedMemorialIds,
    }, true)
    setLuckyEventVisible(false)
    setActiveBuffs([])
    activeBuffsRef.current = []
    setChainRemaining(0)
    lastLuckyClaimAtRef.current = 0
    setLuckyCycle((cycle) => cycle + 1)
    return gain
  }, [commit])

  const resetGame = useCallback(() => {
    clearSavedGame()
    const next = createInitialGame()
    gameRef.current = next
    setGame(next)
    setOfflineReport(null)
    setLatestAchievement(null)
    setLuckyEventVisible(false)
    setActiveBuffs([])
    activeBuffsRef.current = []
    setChainRemaining(0)
    lastLuckyClaimAtRef.current = 0
    setLuckyCycle((cycle) => cycle + 1)
    persist(next)
  }, [persist])

  const resumeFromAnomaly = useCallback(() => {
    if (!gameRef.current.anomalyFrozen) return false
    const current = gameRef.current
    const penaltyRate = GAME_CONFIG.anomalyDetection.resumePenaltyRate
    const satisfactionPenalty = current.satisfaction * penaltyRate
    // Repair the historical relationship before resuming. A damaged save can
    // otherwise trigger the same lucky-reward check again on the next claim.
    const repairedTotalSatisfaction = Math.max(
      current.totalSatisfaction,
      current.satisfaction,
      current.runSatisfaction,
    )
    const repairedRunSatisfaction = Math.min(current.runSatisfaction, repairedTotalSatisfaction)
    const repairedLuckyRewards = Math.min(current.totalLuckyRewards, repairedTotalSatisfaction)
    const resumed = {
      ...current,
      satisfaction: Math.max(0, current.satisfaction - satisfactionPenalty),
      totalSatisfaction: repairedTotalSatisfaction,
      runSatisfaction: Math.max(0, repairedRunSatisfaction - satisfactionPenalty),
      totalLuckyRewards: repairedLuckyRewards,
      anomalyFrozen: false,
      anomalyReason: '',
    }
    gameRef.current = resumed
    setGame(resumed)
    setLuckyEventVisible(false)
    setActiveBuffs([])
    activeBuffsRef.current = []
    luckyEventTimesRef.current = []
    lastLuckyClaimAtRef.current = 0
    setChainRemaining(0)
    setLuckyCycle((cycle) => cycle + 1)
    persist(resumed)
    return true
  }, [persist])

  const exportSave = useCallback(() => encodeSaveData(gameRef.current), [])

  const importSave = useCallback((code: string) => {
    try {
      const imported = decodeSaveData(code)
      const unlocked = unlockEarnedAchievements(imported).game
      gameRef.current = unlocked
      setGame(unlocked)
      setOfflineReport(null)
      setLatestAchievement(null)
      setLuckyEventVisible(false)
      setActiveBuffs([])
      activeBuffsRef.current = []
      setChainRemaining(0)
      lastLuckyClaimAtRef.current = 0
      setLuckyCycle((cycle) => cycle + 1)
      persist(unlocked)
      return true
    } catch {
      return false
    }
  }, [persist])

  const dismissOfflineReport = useCallback(() => setOfflineReport(null), [])
  const dismissLatestAchievement = useCallback(() => setLatestAchievement(null), [])

  return {
    game,
    clickPower,
    satisfactionPerSecond,
    offlineReport,
    saveLabel,
    latestAchievement,
    luckyEventVisible,
    activeBuffs,
    chainRemaining,
    clickCharacter,
    purchaseItem,
    purchaseUpgrade,
    purchaseDoctrine,
    claimDailyOmen,
    setWorshipPolicy,
    sendSleepyChiruko,
    wakeSleepyChiruko,
    selectCosmetic,
    markMemorialViewed,
    claimLuckyEvent,
    prestige,
    dismissOfflineReport,
    dismissLatestAchievement,
    resetGame,
    resumeFromAnomaly,
    exportSave,
    importSave,
  }
}
