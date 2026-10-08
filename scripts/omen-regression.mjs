import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import ts from 'typescript'

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
      const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
      return { format: 'module', source: output.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

const omens = await import('../src/config/omens.ts')
const storage = await import('../src/game/storage.ts')
const { createInitialGame, encodeSaveData, decodeSaveData } = storage
const { DAILY_OMENS, getDailyOmen, getOmenProgress, prepareDailyOmenUpdate } = omens
const base = createInitialGame()
const day = new Date('2026-10-09T12:00:00').getTime()
const old = { ...base, dailyOmenDate: '2026-10-08', dailyOmenId: 'old', dailyOmenStartValue: 0, manualClicks: 25 }
const firstAction = prepareDailyOmenUpdate(old, { ...old, manualClicks: 26 }, day)
assert.equal(getOmenProgress(firstAction, getDailyOmen(day)), 1)
const repeated = prepareDailyOmenUpdate(firstAction, { ...firstAction, manualClicks: 27 }, day)
assert.equal(repeated.dailyOmenStartValue, firstAction.dailyOmenStartValue)
assert.equal(getOmenProgress(repeated, getDailyOmen(day)), 2)

const absolute = { ...base, inventory: { ...base.inventory, 'sweet-treat': 10 }, dailyOmenStartValue: 100 }
const busy = DAILY_OMENS.find((omen) => omen.id === 'busy-desk')
assert(busy)
assert.equal(getOmenProgress(absolute, busy), 10)
const afterPrestige = { ...absolute, inventory: { ...base.inventory } }
assert.equal(getOmenProgress(afterPrestige, busy), 0)
assert.equal(getOmenProgress({ ...afterPrestige, inventory: { ...afterPrestige.inventory, 'sweet-treat': 10 } }, busy), 10)

const fields = { manualClicks: 'manualClicks', totalPurchases: 'totalPurchases', luckyEvents: 'luckyEventsClicked', playSeconds: 'playSeconds' }
for (const omen of DAILY_OMENS) {
  const timestamp = Array.from({ length: 5 }, (_, offset) => day + offset * 86_400_000).find(time => getDailyOmen(time).id === omen.id)
  assert.notEqual(timestamp, undefined)
  if (omen.metric === 'totalOwned') continue
  const field = fields[omen.metric]
  const previous = { ...base, dailyOmenDate: '2000-01-01', dailyOmenId: 'old', dailyOmenCompleted: true, dailyOmenCompletions: 7, [field]: 100 }
  let progress = previous
  for (let step = 1; step <= omen.target; step++) {
    progress = prepareDailyOmenUpdate(progress, { ...progress, [field]: progress[field] + 1 }, timestamp)
    assert.equal(getOmenProgress(progress, omen), step)
    assert.equal(progress.dailyOmenStartValue, 100)
    assert.equal(progress.dailyOmenCompleted, false)
    assert.equal(progress.dailyOmenCompletions, 7)
  }
  const claimed = { ...progress, dailyOmenCompleted: true, dailyOmenCompletions: 8 }
  assert.equal(prepareDailyOmenUpdate(progress, claimed, timestamp).dailyOmenCompletions, 8)
  assert.equal(getOmenProgress(claimed, omen), omen.target)
  const tomorrow = prepareDailyOmenUpdate(claimed, claimed, timestamp + 86_400_000)
  assert.equal(tomorrow.dailyOmenCompleted, false)
  assert.equal(tomorrow.dailyOmenCompletions, 8)
}
const completedDesk = { ...afterPrestige, dailyOmenId: busy.id, dailyOmenCompleted: true }
assert.equal(getOmenProgress(completedDesk, busy), 10)
const legacy = { ...base, inventory: { ...base.inventory, 'sweet-treat': 10 }, dailyOmenStartValue: undefined, dailyOmenCompleted: true, dailyOmenCompletions: 4 }
const decoded = decodeSaveData(encodeSaveData(legacy))
assert.equal(decoded.dailyOmenCompleted, true)
assert.equal(decoded.dailyOmenCompletions, 4)
assert.equal(getOmenProgress(decoded, busy), 10)
const savedMemory = new Map()
globalThis.localStorage = { getItem: key => savedMemory.get(key) ?? null, setItem: (key, value) => savedMemory.set(key, value), removeItem: key => savedMemory.delete(key) }
const { GAME_CONFIG } = await import('../src/config/gameConfig.ts')
const actualSaved = { ...absolute, dailyOmenCompleted: false, dailyOmenStartValue: 100, lastPlayedAt: Date.now() }
savedMemory.set(GAME_CONFIG.saveKey, JSON.stringify(actualSaved))
const loaded = storage.loadGame().game
assert.equal(loaded.dailyOmenStartValue, 100)
assert.equal(getOmenProgress(loaded, busy), 10)
assert.equal(loaded.inventory['sweet-treat'], 10)
assert.equal(decodeSaveData(encodeSaveData(actualSaved)).dailyOmenStartValue, 100)
console.log('actual omen modules passed: rollover, absolute ownership, prestige state, legacy roundtrip, all omen dates')
