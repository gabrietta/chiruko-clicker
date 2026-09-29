import { RESEARCH_BRANCHES, RESEARCH_COSTS, RESEARCH_DURATIONS, RESEARCH_SORA4_REQUIREMENT } from '../config/research'
import type { GameState } from '../types/game'

export const getResearchUnlock = (game: Pick<GameState, 'inventory' | 'researchUnlocked' | 'unlockedAchievementIds'>) =>
  game.researchUnlocked || (game.inventory['sora-4'] ?? 0) >= RESEARCH_SORA4_REQUIREMENT || game.unlockedAchievementIds.includes('sora-4-50')

const safeLevel = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(4, Math.floor(value))) : 0

export const getResearchProductionMultiplier = (levels: readonly number[]) => 1 + safeLevel(levels[0]) * 0.1
export const getResearchClickMultiplier = (levels: readonly number[]) => 1 + safeLevel(levels[1]) * 0.25
export const getResearchOfflineSeconds = (levels: readonly number[]) => safeLevel(levels[2]) * 7_200
export const getResearchNext = (levels: readonly number[], branch: number) => {
  if (!Number.isInteger(branch) || branch < 0 || branch >= RESEARCH_BRANCHES.length) return null
  const level = safeLevel(levels[branch])
  return level < 4 ? { branch, level, cost: RESEARCH_COSTS[level], duration: RESEARCH_DURATIONS[level] } : null
}

export const startResearchProject = (game: GameState, branch: number, now = Date.now()) => {
  if (game.anomalyFrozen || !getResearchUnlock(game) || game.researchProject) return game
  const next = getResearchNext(game.researchLevels, branch)
  if (!next || !Number.isFinite(game.satisfaction) || game.satisfaction < next.cost || !Number.isFinite(now) || now < 0) return game
  return { ...game, researchUnlocked: true, satisfaction: game.satisfaction - next.cost, researchProject: { branch, level: next.level, finishAt: now + next.duration * 1000 } }
}

export const claimResearchProject = (game: GameState, now = Date.now()) => {
  const project = game.researchProject
  if (game.anomalyFrozen || !getResearchUnlock(game) || !project || !isValidResearchProject(project) || !Number.isFinite(now) || now < project.finishAt || project.level !== game.researchLevels[project.branch]) return game
  const levels = [...game.researchLevels] as [number, number, number]
  levels[project.branch] += 1
  return { ...game, researchLevels: levels, researchCompleted: levels.reduce((sum, level) => sum + level, 0), researchProject: null, researchUnlocked: true }
}

export const accelerateResearchProject = (game: GameState, seconds = 30, now = Date.now()) => {
  const project = game.researchProject
  if (game.anomalyFrozen || !project || !isValidResearchProject(project) || !Number.isFinite(now) || !Number.isFinite(seconds) || seconds <= 0 || project.finishAt <= now) return { game, shortened: 0 }
  const shortened = Math.min(seconds * 1000, project.finishAt - now)
  return { game: { ...game, researchProject: { ...project, finishAt: project.finishAt - shortened } }, shortened: Math.round(shortened / 1000) }
}

export const isValidResearchProject = (project: GameState['researchProject']) =>
  project === null || (
    Number.isInteger(project.branch) && project.branch >= 0 && project.branch < RESEARCH_BRANCHES.length &&
    Number.isInteger(project.level) && project.level >= 0 && project.level < 4 &&
    Number.isFinite(project.finishAt) && project.finishAt >= 0
  )

export const normalizeResearch = (value: unknown, fallbackUnlocked = false) => {
  const source = value && typeof value === 'object' ? value as Partial<GameState> : {}
  const rawLevels = Array.isArray(source.researchLevels) ? source.researchLevels : []
  const levels = [0, 1, 2].map((index) => {
    const number = rawLevels[index]
    return typeof number === 'number' && Number.isFinite(number) ? Math.max(0, Math.min(4, Math.floor(number))) : 0
  }) as [number, number, number]
  const rawProject = source.researchProject
  const candidate = rawProject && typeof rawProject === 'object' ? rawProject as GameState['researchProject'] : null
  const unlocked = source.researchUnlocked === true || fallbackUnlocked
  const project = unlocked && isValidResearchProject(candidate) && candidate !== null && candidate.level === levels[candidate.branch]
    ? candidate : null
  return {
    researchUnlocked: unlocked,
    researchLevels: levels,
    researchCompleted: levels.reduce((sum, level) => sum + level, 0),
    researchProject: project,
  }
}
