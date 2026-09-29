import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import ts from 'typescript'

const root = process.cwd()
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !path.extname(specifier)) {
      const url = new URL(`${specifier}.ts`, context.parentURL)
      if (fs.existsSync(url)) return { url: url.href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) {
      const source = fs.readFileSync(new URL(url), 'utf8')
      const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } })
      return { format: 'module', source: output.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

const storage = await import('../src/game/storage.ts')
const research = await import('../src/game/research.ts')
const calculations = await import('../src/game/calculations.ts')
const config = await import('../src/config/gameConfig.ts')
const { createInitialGame, encodeSaveData, decodeSaveData, loadGame } = storage
const { RESEARCH_COSTS, RESEARCH_DURATIONS } = await import('../src/config/research.ts')
const local = new Map()
globalThis.localStorage = { getItem: (key) => local.get(key) ?? null, setItem: (key, value) => local.set(key, value), removeItem: (key) => local.delete(key) }
const base = createInitialGame()
const game = { ...base, researchUnlocked: true, satisfaction: 1e30, inventory: { ...base.inventory, 'sora-4': 50 } }

assert.equal(research.getResearchNext([0, 0, 0], 3), null)
assert.equal(research.getResearchNext([4, 0, 0], 0), null)
assert.deepEqual(research.getResearchNext([2, 0, 0], 0), { branch: 0, level: 2, cost: RESEARCH_COSTS[2], duration: RESEARCH_DURATIONS[2] })
assert.equal(research.normalizeResearch({ researchLevels: [9, 'x', Infinity], researchProject: { branch: 0, level: 0, finishAt: 4 } }).researchCompleted, 4)
assert.equal(research.normalizeResearch({ researchLevels: [0, 0, 0], researchProject: { branch: 5, level: 0, finishAt: 4 } }).researchProject, null)
assert.equal(research.startResearchProject({ ...game, satisfaction: 0 }, 0, 1000).researchProject, null)
assert.equal(research.startResearchProject(game, 4, 1000).researchProject, null)
const started = research.startResearchProject(game, 0, 1000)
assert.equal(started.researchProject.finishAt, 1000 + RESEARCH_DURATIONS[0] * 1000)
assert.equal(started.satisfaction, game.satisfaction - RESEARCH_COSTS[0])
assert.equal(research.startResearchProject(started, 1, 1000), started)
assert.equal(research.claimResearchProject(started, 1000).researchProject, started.researchProject)
const completed = research.claimResearchProject({ ...started, researchProject: { ...started.researchProject, finishAt: 1000 } }, 1000)
assert.equal(completed.researchLevels[0], 1)
assert.equal(research.claimResearchProject(completed, 1000), completed)
assert.equal(research.accelerateResearchProject({ ...completed, researchProject: { branch: 0, level: 1, finishAt: 51_000 } }, 30, 1000).shortened, 30)
assert.equal(research.accelerateResearchProject({ ...completed, researchProject: { branch: 0, level: 1, finishAt: 1000 } }, 30, 1000).shortened, 0)
const production0 = calculations.getSatisfactionPerSecond({ ...base.inventory, 'sweet-treat': 1 }, 0, [], 0, [], 'balanced', [0, 0, 0])
const production4 = calculations.getSatisfactionPerSecond({ ...base.inventory, 'sweet-treat': 1 }, 0, [], 0, [], 'balanced', [4, 0, 0])
assert.equal(production4 / production0, 1.4)
const click0 = calculations.getClickPower({ ...base.inventory, petting: 1 }, [], 0, [], 'balanced', [0, 0, 0])
const click4 = calculations.getClickPower({ ...base.inventory, petting: 1 }, [], 0, [], 'balanced', [0, 4, 0])
assert.equal(click4 / click0, 2)
assert.equal(calculations.getResearchAdjustedOfflineCap(config.GAME_CONFIG.maxOfflineSeconds, [0, 0, 4]), 57_600)
const legacy = { ...game, researchUnlocked: undefined, researchLevels: undefined, researchCompleted: undefined, researchProject: undefined }
const legacyCode = encodeSaveData(legacy)
assert.equal(decodeSaveData(legacyCode).researchUnlocked, true)
assert.equal(decodeSaveData(legacyCode).inventory['sora-4'], 50)
local.set(config.GAME_CONFIG.saveKey, JSON.stringify(legacy))
assert.equal(loadGame().game.researchUnlocked, true)
assert.equal(loadGame().game.inventory['sora-4'], 50)
assert.equal(research.startResearchProject(base, 0, 1000), base)
const frozen = { ...game, anomalyFrozen: true }
assert.equal(research.startResearchProject(frozen, 0, 1000), frozen)
const maxed = { ...game, researchLevels: [4, 4, 4] }
assert.equal(research.startResearchProject(maxed, 0, 1000), maxed)
assert.equal(research.normalizeResearch({ researchProject: { branch: 0, level: 0, finishAt: 1000 } }).researchProject, null)
assert.equal(research.accelerateResearchProject(started, 30, started.researchProject.finishAt - 5000).shortened, 5)
assert.equal(research.accelerateResearchProject(started, 30, started.researchProject.finishAt - 5000).game.researchProject.finishAt, started.researchProject.finishAt - 5000)
assert.deepEqual(decodeSaveData(encodeSaveData(started)).researchProject, started.researchProject)
assert.deepEqual(decodeSaveData(encodeSaveData(completed)).researchLevels, [1, 0, 0])
const pastPrestige = { ...base, unlockedAchievementIds: ['sora-4-50'] }
assert.equal(decodeSaveData(encodeSaveData(pastPrestige)).researchUnlocked, true)
assert.equal(research.getResearchUnlock(pastPrestige), true)
const originalNow = Date.now
Date.now = () => 100_000_000
try {
  const offline = { ...game, researchLevels: [0, 0, 4], lastPlayedAt: Date.now() - 12 * 3600_000 }
  local.set(config.GAME_CONFIG.saveKey, JSON.stringify(offline))
  assert.equal(loadGame().offlineReport.wasCapped, false)
  assert.equal(loadGame().offlineReport.elapsedSeconds, 12 * 3600)
  local.set(config.GAME_CONFIG.saveKey, JSON.stringify({ ...offline, lastPlayedAt: Date.now() - 20 * 3600_000 }))
  assert.equal(loadGame().offlineReport.wasCapped, true)
  assert.equal(loadGame().offlineReport.elapsedSeconds, 16 * 3600)
  local.set(config.GAME_CONFIG.saveKey, JSON.stringify({ ...offline, researchLevels: [0, 0, 0], researchProject: { branch: 0, level: 0, finishAt: Date.now() - 1000 } }))
  const unclaimed = loadGame().game
  assert.deepEqual(unclaimed.researchLevels, [0, 0, 0])
  assert.ok(unclaimed.researchProject)
} finally { Date.now = originalNow }
const { MEMORIALS } = await import('../src/config/memorials.ts')
const memorialIds = MEMORIALS.map(item => item.id)
const writeFixture = (name, overrides = {}) => {
  const fresh = createInitialGame()
  const fixture = { ...fresh, satisfaction: 1e30, totalSatisfaction: 1e30, runSatisfaction: 1e30, inventory: { ...fresh.inventory, 'sora-4': 50 }, viewedMemorialIds: memorialIds, ...overrides }
  fs.mkdirSync(path.join(root, 'tmp'), { recursive: true })
  fs.writeFileSync(path.join(root, 'tmp', name), encodeSaveData(fixture))
}
writeFixture('research-endgame-fixture.txt', { researchUnlocked: undefined, researchLevels: undefined, researchCompleted: undefined, researchProject: undefined })
writeFixture('research-ready-fixture.txt', { researchUnlocked: true, researchProject: { branch: 0, level: 0, finishAt: Date.now() - 1000 } })
writeFixture('research-near-completion-fixture.txt', { researchUnlocked: true, researchLevels: [3, 3, 3], researchCompleted: 9, researchProject: { branch: 0, level: 3, finishAt: Date.now() + 5000 } })
console.log('actual research modules passed; fixtures generated in tmp/')
