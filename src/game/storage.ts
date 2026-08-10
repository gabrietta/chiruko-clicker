import { ACHIEVEMENTS } from '../config/achievements'
import { GAME_CONFIG, SHOP_ITEMS } from '../config/gameConfig'
import { UPGRADES } from '../config/upgrades'
import { ALL_COSMETICS } from '../config/cosmetics'
import { DOCTRINES, getDoctrineEffect } from '../config/doctrines'
import { MEMORIALS } from '../config/memorials'
import type { GameState, OfflineReport } from '../types/game'
import { getSatisfactionPerSecond } from './calculations'

const createInventory = () =>
  Object.fromEntries(SHOP_ITEMS.map((item) => [item.id, 0]))

export const createInitialGame = (): GameState => ({
  version: GAME_CONFIG.saveVersion,
  satisfaction: 0,
  totalSatisfaction: 0,
  runSatisfaction: 0,
  inventory: createInventory(),
  purchasedUpgradeIds: [],
  manualClicks: 0,
  luckyEventsClicked: 0,
  totalPurchases: 0,
  totalLuckyRewards: 0,
  prestigeCount: 0,
  virtueMarks: 0,
  purchasedDoctrineIds: [],
  selectedCharacterSkin: 'sit',
  selectedStageTheme: 'rose',
  maxBuffCombo: 0,
  luckyChainsCompleted: 0,
  clickCombo: 0,
  bestClickCombo: 0,
  clickComboLastAt: 0,
  luckyEventTypesSeen: [],
  offlineSessions: 0,
  totalOfflineSeconds: 0,
  longestOfflineSeconds: 0,
  playSeconds: 0,
  highestPerSecond: 0,
  startedAt: Date.now(),
  unlockedAchievementIds: [],
  viewedMemorialIds: [],
  lastPlayedAt: Date.now(),
  anomalyFrozen: false,
  anomalyReason: '',
})

const finiteOr = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback

// 旧版で使っていた累計値同士の判定による停止は、正しいセーブでも起こり得ました。
// その理由だけで停止している既存セーブは、新しい差分判定へ移行する際に自動復旧します。
const isLegacyLuckyAggregateAnomaly = (value: Partial<GameState>) =>
  value.anomalyFrozen === true && value.anomalyReason === '奇跡の記録が累計満足を追い越しました。'

const SAVE_CODE_PREFIX = 'CHIRUKO-SAVE-8.'

// これは暗号ではなく、localStorageを直接いじったときの偶発的な破損や
// 単純な数値書き換えに気づきやすくするための軽い整合性チェックです。
// 本気で改ざんを防ぐ場合は、サーバー側でセーブを管理する必要があります。
const checksum = (value: string) => {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const makeSaveEnvelope = (snapshot: object) => {
  const payload = JSON.stringify(snapshot)
  return JSON.stringify({ payload, checksum: checksum(payload) })
}

const unwrapSaveEnvelope = (raw: string) => {
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object') return raw

  const candidate = parsed as { payload?: unknown; checksum?: unknown }
  if (typeof candidate.payload !== 'string' || typeof candidate.checksum !== 'string') return raw
  if (candidate.checksum !== checksum(candidate.payload)) throw new Error('SAVE_INTEGRITY_ERROR')
  return candidate.payload
}

const encodeBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

const decodeBase64 = (value: string) => {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export const encodeSaveData = (game: GameState) =>
  `${SAVE_CODE_PREFIX}${encodeBase64(makeSaveEnvelope({ ...game, lastPlayedAt: Date.now() }))}`

export const decodeSaveData = (code: string): GameState => {
  const trimmed = code.trim()
  if (!trimmed.startsWith(SAVE_CODE_PREFIX)) throw new Error('このセーブコードは認識できません。')
  const parsed = JSON.parse(unwrapSaveEnvelope(decodeBase64(trimmed.slice(SAVE_CODE_PREFIX.length)))) as Partial<GameState>
  if (!parsed || typeof parsed !== 'object' || typeof parsed.satisfaction !== 'number') {
    throw new Error('セーブデータの内容が正しくありません。')
  }

  const fresh = createInitialGame()
  const importedInventory = parsed.inventory && typeof parsed.inventory === 'object' ? parsed.inventory : {}
  const inventory = Object.fromEntries(
    Object.keys(fresh.inventory).map((itemId) => [itemId, Math.floor(finiteOr(importedInventory[itemId], 0))]),
  )
  const imported = {
    ...fresh,
    ...parsed,
    inventory,
    version: GAME_CONFIG.saveVersion,
    satisfaction: finiteOr(parsed.satisfaction, 0),
    totalSatisfaction: finiteOr(parsed.totalSatisfaction, 0),
    runSatisfaction: finiteOr(parsed.runSatisfaction, 0),
    virtueMarks: Math.floor(finiteOr(parsed.virtueMarks, 0)),
    lastPlayedAt: Date.now(),
    anomalyFrozen: parsed.anomalyFrozen === true && !isLegacyLuckyAggregateAnomaly(parsed),
    anomalyReason: isLegacyLuckyAggregateAnomaly(parsed)
      ? ''
      : typeof parsed.anomalyReason === 'string' ? parsed.anomalyReason : '',
  }
  return imported
}

export const loadGame = (): { game: GameState; offlineReport: OfflineReport | null } => {
  const fresh = createInitialGame()

  try {
    const raw = localStorage.getItem(GAME_CONFIG.saveKey)
    if (!raw) return { game: fresh, offlineReport: null }

    const parsed = JSON.parse(unwrapSaveEnvelope(raw)) as Partial<GameState>
    const inventory = createInventory()
    if (parsed.inventory && typeof parsed.inventory === 'object') {
      for (const item of SHOP_ITEMS) {
        inventory[item.id] = Math.floor(finiteOr(parsed.inventory[item.id], 0))
      }
    }

    const knownAchievementIds = new Set(ACHIEVEMENTS.map((achievement) => achievement.id))
    const unlockedAchievementIds = Array.isArray(parsed.unlockedAchievementIds)
      ? parsed.unlockedAchievementIds.filter(
        (id): id is string => typeof id === 'string' && knownAchievementIds.has(id),
      )
      : []

    const knownMemorialIds = new Set(MEMORIALS.map((memorial) => memorial.id))
    const viewedMemorialIds = Array.isArray(parsed.viewedMemorialIds)
      ? parsed.viewedMemorialIds.filter(
        (id): id is string => typeof id === 'string' && knownMemorialIds.has(id),
      )
      : []

    const knownUpgradeIds = new Set(UPGRADES.map((upgrade) => upgrade.id))
    const purchasedUpgradeIds = Array.isArray(parsed.purchasedUpgradeIds)
      ? parsed.purchasedUpgradeIds.filter(
        (id): id is string => typeof id === 'string' && knownUpgradeIds.has(id),
      )
      : []

    const knownDoctrineIds = new Set(DOCTRINES.map((doctrine) => doctrine.id))
    const purchasedDoctrineIds = Array.isArray(parsed.purchasedDoctrineIds)
      ? parsed.purchasedDoctrineIds.filter(
        (id): id is string => typeof id === 'string' && knownDoctrineIds.has(id),
      )
      : []

    const knownCharacterSkins = new Set(
      ALL_COSMETICS.filter((cosmetic) => cosmetic.kind === 'character').map((cosmetic) => cosmetic.id),
    )
    const knownStageThemes = new Set(
      ALL_COSMETICS.filter((cosmetic) => cosmetic.kind === 'theme').map((cosmetic) => cosmetic.id),
    )
    const selectedCharacterSkin = typeof parsed.selectedCharacterSkin === 'string' &&
      knownCharacterSkins.has(parsed.selectedCharacterSkin)
      ? parsed.selectedCharacterSkin
      : 'sit'
    const selectedStageTheme = typeof parsed.selectedStageTheme === 'string' &&
      knownStageThemes.has(parsed.selectedStageTheme)
      ? parsed.selectedStageTheme
      : 'rose'

    const previousTime = finiteOr(parsed.lastPlayedAt, Date.now())
    const rawElapsed = Math.max(0, (Date.now() - previousTime) / 1000)
    const virtueMarks = Math.floor(finiteOr(parsed.virtueMarks, 0))
    const perSecond = getSatisfactionPerSecond(
      inventory,
      unlockedAchievementIds.length,
      purchasedUpgradeIds,
      virtueMarks,
      purchasedDoctrineIds,
    )
    const offlineCapMultiplier = getDoctrineEffect(purchasedDoctrineIds, 'offlineCapMultiplier')
    const adjustedElapsedSeconds = Math.min(rawElapsed, GAME_CONFIG.maxOfflineSeconds * offlineCapMultiplier)
    const earned = perSecond * adjustedElapsedSeconds
    const offlineSession = rawElapsed >= 60
    const satisfaction = finiteOr(parsed.satisfaction, 0) + earned
    const totalSatisfaction = finiteOr(parsed.totalSatisfaction, 0) + earned
    const offlineSessions = Math.floor(finiteOr(parsed.offlineSessions, 0)) + (offlineSession ? 1 : 0)
    const totalOfflineSeconds = finiteOr(parsed.totalOfflineSeconds, 0) + (offlineSession ? adjustedElapsedSeconds : 0)
    const longestOfflineSeconds = Math.max(
      finiteOr(parsed.longestOfflineSeconds, 0),
      offlineSession ? adjustedElapsedSeconds : 0,
    )
    const luckyEventTypesSeen = Array.isArray(parsed.luckyEventTypesSeen)
      ? parsed.luckyEventTypesSeen.filter((type): type is string => typeof type === 'string')
      : []
    const legacyLuckyAggregateAnomaly = isLegacyLuckyAggregateAnomaly(parsed)

    return {
      game: {
        version: GAME_CONFIG.saveVersion,
        satisfaction,
        totalSatisfaction,
        runSatisfaction: finiteOr(parsed.runSatisfaction, finiteOr(parsed.totalSatisfaction, 0)) + earned,
        inventory,
        purchasedUpgradeIds,
        manualClicks: Math.floor(finiteOr(parsed.manualClicks, 0)),
        luckyEventsClicked: Math.floor(finiteOr(parsed.luckyEventsClicked, 0)),
        totalPurchases: Math.floor(finiteOr(parsed.totalPurchases, 0)),
        totalLuckyRewards: finiteOr(parsed.totalLuckyRewards, 0),
        prestigeCount: Math.floor(finiteOr(parsed.prestigeCount, 0)),
        virtueMarks,
        purchasedDoctrineIds,
        selectedCharacterSkin,
        selectedStageTheme,
        maxBuffCombo: Math.floor(finiteOr(parsed.maxBuffCombo, 0)),
        luckyChainsCompleted: Math.floor(finiteOr(parsed.luckyChainsCompleted, 0)),
        clickCombo: 0,
        bestClickCombo: Math.floor(finiteOr(parsed.bestClickCombo, 0)),
        clickComboLastAt: 0,
        luckyEventTypesSeen,
        offlineSessions,
        totalOfflineSeconds,
        longestOfflineSeconds,
        playSeconds: finiteOr(parsed.playSeconds, 0),
        highestPerSecond: Math.max(finiteOr(parsed.highestPerSecond, 0), perSecond),
        startedAt: finiteOr(parsed.startedAt, Date.now()),
        unlockedAchievementIds,
        viewedMemorialIds,
        lastPlayedAt: Date.now(),
        anomalyFrozen: parsed.anomalyFrozen === true && !legacyLuckyAggregateAnomaly,
        anomalyReason: legacyLuckyAggregateAnomaly
          ? ''
          : typeof parsed.anomalyReason === 'string' ? parsed.anomalyReason : '',
      },
      offlineReport: rawElapsed >= 10 && earned >= 1
        ? {
          elapsedSeconds: adjustedElapsedSeconds,
          earned,
          wasCapped: rawElapsed > GAME_CONFIG.maxOfflineSeconds * offlineCapMultiplier,
        }
        : null,
    }
  } catch {
    return { game: fresh, offlineReport: null }
  }
}

export const saveGame = (game: GameState) => {
  const snapshot = { ...game, lastPlayedAt: Date.now() }
  localStorage.setItem(GAME_CONFIG.saveKey, makeSaveEnvelope(snapshot))
}

export const clearSavedGame = () => {
  localStorage.removeItem(GAME_CONFIG.saveKey)
}
