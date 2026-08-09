import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const projectRoot = process.cwd()
const defaults = {
  manifest: path.join(projectRoot, 'docs', 'dialogue-voice-manifest.csv'),
  outDir: path.join(projectRoot, 'public', 'assets', 'audio'),
  ttsScript: '',
  appExe: '',
  voice: '',
  v3: false,
  overwrite: false,
  includeDynamic: false,
  dryRun: false,
  only: '',
  updateMap: false,
  skipExisting: false,
}

const parseArgs = (argv) => {
  const options = { ...defaults }
  const valueOptions = new Map([
    ['--manifest', 'manifest'],
    ['--out-dir', 'outDir'],
    ['--tts-script', 'ttsScript'],
    ['--app-exe', 'appExe'],
    ['--voice', 'voice'],
    ['--only', 'only'],
  ])
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--v3') options.v3 = true
    else if (argument === '--overwrite') options.overwrite = true
    else if (argument === '--include-dynamic') options.includeDynamic = true
    else if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--update-map') options.updateMap = true
    else if (argument === '--skip-existing') options.skipExisting = true
    else if (argument === '--help' || argument === '-h') options.help = true
    else {
      const key = valueOptions.get(argument)
      if (!key || argv[index + 1] === undefined) throw new Error(`不明な引数または値不足: ${argument}`)
      options[key] = argv[index + 1]
      index += 1
    }
  }
  return options
}

const printHelp = () => {
  console.log(`CSV台詞マニフェストから音声を一括生成します。

例（PowerShell）:
node scripts/generate-voices-from-manifest.mjs \\
  --tts-script "I:\\かんたん音声メーカー-案内付き\\win-unpacked\\Codexスキル\\elevenlabs-tts\\scripts\\elevenlabs-tts.mjs" \\
  --voice "声のIDまたは声名" --v3

主なオプション:
  --manifest <CSV>       台詞一覧CSV
  --out-dir <フォルダ>   MP3の出力先（既定: public/assets/audio）
  --tts-script <JS>      付属TTSスクリプトの場所
  --app-exe <exe>        付属アプリ。CLI・同梱APIキーを自動検出
  --voice <IDまたは名前> 使用する声
  --only <id,...>        指定したIDだけ生成（例: event-purchase,event-upgrade）
  --v3                   Eleven v3 + Audio Tags
  --overwrite            既存MP3を上書き
  --include-dynamic      {buffName}を含む動的台詞も対象にする
  --update-map            生成済みMP3をvoiceClips.tsへ自動登録
  --skip-existing         既存MP3は再生成せずに続行
  --dry-run              生成せず、実行予定だけ表示
`)
}

const tagForRow = (row) => {
  if (row.id === 'event-purchase') return '[shyly]'
  if (row.id === 'event-upgrade' || row.id === 'event-prestige') return '[cheerfully]'
  if (row.id === 'event-doctrine' || row.category === 'time-late-night') return '[calmly]'
  if (row.id === 'dialogue-base-02') return '[gently]'
  if (row.category === 'base') return '[calmly]'
  if (row.category === 'time-morning' || row.category === 'time-daytime') return '[cheerfully]'
  if (row.category === 'time-evening') return '[gently]'
  if (row.category === 'facility-petting') return '[shyly]'
  if (row.category === 'facility-sweet-treat' || row.category === 'facility-ramen-sanctum') return '[cute]'
  if (row.category === 'facility-soft-futon' || row.category === 'facility-desktop-accessory') return '[gently]'
  if (row.category === 'facility-chiruko-doll') return '[cute]'
  if (row.category === 'facility-sora-2' || row.category === 'facility-dimension-gate' || row.category === 'facility-satisfaction-observatory' || row.category === 'facility-satisfaction-simulator') return '[curious]'
  if (row.category === 'facility-believer' || row.category === 'facility-cult-broadcast') return '[cheerfully]'
  if (row.category === 'facility-altar' || row.category === 'facility-giant-statue' || row.category === 'facility-neo-cathedral') return '[calmly]'
  if (row.category === 'facility-cosmic-chiruko' || row.category === 'facility-sora-3' || row.category === 'facility-galaxy-mission-fleet') return '[excited]'
  if (row.category === 'facility-sora-4') return '[angry]'
  if (row.category === 'condition-clicks' || row.category === 'condition-buff') return '[excited]'
  if (row.category === 'condition-production' || row.category === 'condition-total' || row.category === 'skin') return '[calmly]'
  return null
}

const voiceTextForRow = (row) => row.id === 'dialogue-facility-altar-02'
  ? row.text.replace('祭壇', 'さいだん')
  : row.id === 'event-upgrade'
  ? 'ごりやくを授けましょう。'
  : row.text

const enhanceText = (row) => {
  const tag = tagForRow(row)
  const spokenText = voiceTextForRow(row)
  if (!tag) return spokenText
  const pauseTag = '[short pause]'
  return `${pauseTag} ${tag} ${spokenText.trim()} ${pauseTag}`
}

const getBundledAppData = async (appExe) => {
  if (!appExe) return { apiKey: '', voiceId: '' }
  const asarPath = path.join(path.dirname(path.resolve(appExe)), 'resources', 'app.asar')
  const bytes = await readFile(asarPath)
  const headerSize = bytes.readUInt32LE(4)
  const jsonSize = bytes.readUInt32LE(12)
  const header = JSON.parse(bytes.subarray(16, 16 + jsonSize).toString('utf8'))
  const dataStart = 8 + headerSize
  const appFiles = header?.files?.apps?.files?.['elevenlabs-tts']?.files
  const readAppFile = (name) => {
    const node = appFiles?.[name]
    if (!node) return ''
    const start = dataStart + Number(node.offset)
    return bytes.subarray(start, start + node.size).toString('utf8')
  }
  let config = {}
  try { config = JSON.parse(readAppFile('tts-config.json')) } catch { config = {} }
  const renderer = readAppFile('renderer.js')
  const voiceMatch = renderer.match(/DEFAULT_VOICE_ID\s*=\s*["']([A-Za-z0-9]{20})["']/)
  return {
    apiKey: typeof config.elevenLabsApiKey === 'string' ? config.elevenLabsApiKey.trim() : '',
    voiceId: voiceMatch?.[1] ?? '',
  }
}

const parseCsv = (source) => {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  const headers = rows.shift() ?? []
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

const runTts = (script, row, options, outputPath, environment) => new Promise((resolve, reject) => {
  const args = [script]
  if (options.v3) args.push('--v3')
  if (options.voice) args.push('--voice', options.voice)
  args.push('--text', enhanceText(row), '--out', outputPath)
  if (options.overwrite) args.push('--overwrite')
  const child = spawn(process.execPath, args, { env: environment, stdio: 'inherit', windowsHide: true })
  child.on('error', reject)
  child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`TTS失敗: ${row.id} (exit ${code})`)))
})

const updateVoiceMap = async (rows, outputRoot) => {
  const entries = []
  for (const row of rows) {
    const outputPath = path.resolve(outputRoot, row.filename)
    try {
      await access(outputPath)
    } catch {
      continue
    }
    const relative = path.relative(path.join(projectRoot, 'public'), outputPath).split(path.sep).join('/')
    if (relative.startsWith('..')) continue
    entries.push(`  ${JSON.stringify(row.text)}: ${JSON.stringify(`/${relative}`)},`)
  }
  const source = `/** Generated from docs/dialogue-voice-manifest.csv. */\nexport const VOICE_CLIP_PATHS: Record<string, string> = {\n${entries.join('\n')}\n}\n\nexport const getVoiceClipPath = (text: string) => VOICE_CLIP_PATHS[text] ?? null\n`
  await writeFile(path.join(projectRoot, 'src', 'audio', 'voiceClips.ts'), source, 'utf8')
  console.log(`${entries.length}本をsrc/audio/voiceClips.tsへ登録しました。`)
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) return printHelp()
  if (options.appExe) {
    const appDirectory = path.dirname(path.resolve(options.appExe))
    if (!options.ttsScript) options.ttsScript = path.join(appDirectory, 'Codexスキル', 'elevenlabs-tts', 'scripts', 'elevenlabs-tts.mjs')
  }
  if (!options.ttsScript && !options.dryRun) throw new Error('--tts-script または --app-exe を指定してください')

  const rows = parseCsv(await readFile(path.resolve(options.manifest), 'utf8'))
  const outputRoot = path.resolve(options.outDir)
  await mkdir(outputRoot, { recursive: true })
  const only = options.only ? new Set(options.only.split(',').map((id) => id.trim()).filter(Boolean)) : null
  const targets = rows.filter((row) => row.id && row.text && row.filename && (options.includeDynamic || !row.text.includes('{')) && (!only || only.has(row.id)))
  console.log(`${targets.length}本を処理します。今回の対象外は${rows.length - targets.length}本です。`)

  const bundled = options.appExe && !options.dryRun ? await getBundledAppData(options.appExe) : { apiKey: '', voiceId: '' }
  if (!options.voice && bundled.voiceId) options.voice = bundled.voiceId
  const environment = bundled.apiKey ? { ...process.env, ELEVENLABS_API_KEY: bundled.apiKey } : process.env
  if (options.appExe && !bundled.apiKey && !options.dryRun) console.log('同梱APIキーが見つからないため、環境変数を使用します。')

  for (const row of targets) {
    const outputPath = path.resolve(outputRoot, row.filename)
    const relative = path.relative(outputRoot, outputPath)
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`出力先が不正です: ${row.filename}`)
    if (options.skipExisting) {
      try {
        await access(outputPath)
        console.log(`- ${row.id} は既存のためスキップ`)
        continue
      } catch { /* 生成対象 */ }
    }
    console.log(`- ${row.id} -> ${outputPath}`)
    if (!options.dryRun) await runTts(path.resolve(options.ttsScript), row, options, outputPath, environment)
  }
  if (options.updateMap && !options.dryRun) await updateVoiceMap(targets, outputRoot)
  console.log(options.dryRun ? 'ドライラン完了。' : '音声生成が完了しました。')
}

main().catch((error) => {
  console.error(`エラー: ${error.message}`)
  process.exitCode = 1
})
