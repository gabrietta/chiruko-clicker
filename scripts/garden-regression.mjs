import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import ts from 'typescript'
registerHooks({ resolve(specifier, context, nextResolve) { if (specifier.startsWith('.') && !path.extname(specifier)) { const url = new URL(`${specifier}.ts`, context.parentURL); if (fs.existsSync(url)) return { url: url.href, shortCircuit: true } } return nextResolve(specifier, context) }, load(url, context, nextLoad) { if (url.endsWith('.ts')) { const source = fs.readFileSync(new URL(url), 'utf8'); const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }); return { format: 'module', source: output.outputText, shortCircuit: true } } return nextLoad(url, context) } })
const storage = await import('../src/game/storage.ts')
const config = await import('../src/config/garden.ts')
const garden = await import('../src/game/garden.ts')
const { createInitialGame, encodeSaveData, decodeSaveData, loadGame } = storage
const { createInitialGarden, GARDEN_SEEDS, GARDEN_DECORATIONS } = config
const { getPlantProgress, getGardenNeighbors, plantGardenSeed, harvestGardenPlot, clearGardenPlot, buyGardenDecoration, selectGardenDecoration } = garden
// Freeze the save/load interval so real offline production cannot change assertions.
const originalNow = Date.now
Date.now = () => 1_800_000_000_000
const fresh = createInitialGame()
const saved = new Map()
globalThis.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) }
const unlocked = { ...fresh, totalPurchases: 25, garden: { ...createInitialGarden(), unlocked: true, unlockedSeedIds: ['sweet', 'fluff', 'prayer'] } }
assert.equal(unlocked.garden.plots.length, 9)
assert.equal(plantGardenSeed(unlocked, 9, 'sweet', 0), unlocked)
assert.equal(plantGardenSeed({ ...unlocked, anomalyFrozen: true }, 0, 'sweet', 0).garden.plots[0], null)
const planted = plantGardenSeed(unlocked, 0, 'sweet', 1000)
assert.equal(planted.garden.plots[0].seedId, 'sweet')
assert.equal(getPlantProgress(planted.garden.plots[0], 1000 + 180_000).mature, true)
assert.equal(getPlantProgress(planted.garden.plots[0], 900).progress, 0)
assert.deepEqual(getGardenNeighbors(4).sort((a, b) => a - b), [1, 3, 5, 7])
assert.deepEqual(getGardenNeighbors(0).sort((a, b) => a - b), [1, 3])
const withNeighbor = plantGardenSeed(planted, 1, 'fluff', 0)
const harvested = harvestGardenPlot(withNeighbor, 0, 500_000)
assert(harvested)
assert.equal(harvested.petals, 2)
assert(harvested.newSeedIds.includes('honey'))
assert.equal(harvestGardenPlot(harvested.game, 0, 500_000), null)
const diagonal = plantGardenSeed(plantGardenSeed(unlocked, 0, 'sweet', 0), 4, 'fluff', 0)
assert(!harvestGardenPlot(diagonal, 0, 180_000)?.newSeedIds.includes('honey'))
const unripeNeighbor = plantGardenSeed(plantGardenSeed(unlocked, 0, 'sweet', 0), 1, 'fluff', 0)
const unripeHarvest = harvestGardenPlot(unripeNeighbor, 0, 200_000)
assert(unripeHarvest)
assert(!unripeHarvest.newSeedIds.includes('honey'))
assert.equal(plantGardenSeed(unlocked, 0, 'unknown', 0), unlocked)
assert.equal(clearGardenPlot(unlocked, 0), unlocked)
const decorated = { ...unlocked, garden: { ...unlocked.garden, petals: 200 } }
const bought = buyGardenDecoration(decorated, GARDEN_DECORATIONS[0].id)
assert.equal(bought.garden.petals, 180)
assert.equal(buyGardenDecoration(bought, GARDEN_DECORATIONS[0].id), bought)
assert.equal(selectGardenDecoration(bought, 'unknown'), bought)
assert.equal(selectGardenDecoration(bought, null).garden.selectedDecorationId, null)
const hostile = { ...fresh, garden: { ...createInitialGarden(), unlockedSeedIds: ['sweet', 'unknown'], plots: [{ seedId: 'sweet', plantedAt: Infinity }, { seedId: 'unknown', plantedAt: 0 }, ...Array(8).fill(null)], petals: NaN } }
const decoded = decodeSaveData(encodeSaveData(hostile))
assert.equal(decoded.garden.plots[0], null)
assert.equal(decoded.garden.plots[1], null)
assert.equal(decoded.garden.petals, 0)
const legacy = { ...fresh, satisfaction: 123, inventory: { ...fresh.inventory, 'sweet-treat': 25 }, totalPurchases: 25 }
storage.saveGame(legacy)
const loaded = loadGame().game
assert.equal(loaded.garden.unlocked, true)
assert.equal(loaded.satisfaction, 123)
assert.equal(loaded.inventory['sweet-treat'], 25)
const legacyWithoutGarden = { ...legacy, garden: undefined, inventory: fresh.inventory }
storage.saveGame(legacyWithoutGarden)
assert.equal(loadGame().game.garden.unlocked, true)
assert.equal(decodeSaveData(encodeSaveData(legacyWithoutGarden)).garden.unlocked, true)
const roundtrip = { ...loaded, garden: { ...loaded.garden, petals: 77, totalHarvests: 3 } }
const loadedRoundtrip = decodeSaveData(encodeSaveData(roundtrip))
assert.equal(loadedRoundtrip.garden.petals, 77)
assert.equal(loadedRoundtrip.garden.totalHarvests, 3)
storage.saveGame({ ...legacy, garden: roundtrip.garden })
assert.deepEqual(loadGame().game.garden, roundtrip.garden)
assert.deepEqual(config.normalizeGarden({ unlockedSeedIds: [] }).unlockedSeedIds, ['sweet', 'fluff', 'prayer'])
assert.equal(buyGardenDecoration(fresh, 'ribbon'), fresh)
assert.equal(plantGardenSeed(fresh, 0, 'sweet', 0), fresh)
assert.equal(plantGardenSeed(unlocked, 0, 'sweet', -1), unlocked)
assert.equal(getPlantProgress(planted.garden.plots[0], 180999).mature, false)
for (const child of GARDEN_SEEDS.filter(seed => seed.parents)) {
  const state = { ...unlocked, garden: { ...unlocked.garden, unlockedSeedIds: GARDEN_SEEDS.map(seed => seed.id).filter(id => id !== child.id) } }
  const first = plantGardenSeed(state, 4, child.parents[0], 0)
  const both = plantGardenSeed(first, 3, child.parents[1], 0)
  const result = harvestGardenPlot(both, 4, 86_400_000)
  assert.ok(result.newSeedIds.includes(child.id), child.id)
  assert.equal(result.game.garden.plots[3].seedId, child.parents[1])
}
const wrap = plantGardenSeed(plantGardenSeed(unlocked, 2, 'sweet', 0), 3, 'fluff', 0)
assert.equal(harvestGardenPlot(wrap, 2, 86_400_000).newSeedIds.length, 0)
const { MEMORIALS } = await import('../src/config/memorials.ts')
Date.now = originalNow
const fixture = { ...fresh, totalPurchases: 25, satisfaction: 1e30, totalSatisfaction: 1e30, runSatisfaction: 1e30, inventory: { ...fresh.inventory, 'sweet-treat': 25 }, viewedMemorialIds: MEMORIALS.map(item => item.id), garden: { ...createInitialGarden(), unlocked: true, plots: [{ seedId: 'sweet', plantedAt: 0 }, { seedId: 'fluff', plantedAt: 0 }, { seedId: 'prayer', plantedAt: 0 }, { seedId: 'cosmos', plantedAt: 0 }, null, null, null, null, null], unlockedSeedIds: GARDEN_SEEDS.slice(0, 3).map((seed) => seed.id).concat('cosmos'), petals: 200, totalHarvests: 0, decorationIds: [], selectedDecorationId: null } }
fs.mkdirSync('tmp', { recursive: true }); fs.writeFileSync(path.join('tmp', 'garden-ready-fixture.txt'), encodeSaveData(fixture))
console.log('actual garden modules passed; fixture written to tmp/garden-ready-fixture.txt')
