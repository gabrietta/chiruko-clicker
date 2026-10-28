import { useEffect, useRef, useState } from 'react'
import { GARDEN_SEEDS, GARDEN_DECORATIONS, GARDEN_TEA_COST, GARDEN_TEA_SECONDS } from '../config/garden'
import { getPlantProgress, isGardenUnlocked } from '../game/garden'
import type { ActiveBuff, GameState } from '../types/game'

interface GardenModalProps {
  game: GameState
  activeBuffs: ActiveBuff[]
  onClose: () => void
  onPlant: (index: number, seedId: string) => boolean
  onHarvest: (index: number) => { petals: number; newSeedIds: string[] } | null
  onClear: (index: number) => boolean
  onBuyDecoration: (id: string) => boolean
  onSelectDecoration: (id: string | null) => boolean
  onBrewTea: () => boolean
}
const seedById = (id: string) => GARDEN_SEEDS.find(seed => seed.id === id)!
const timeLabel = (seconds: number) => seconds >= 3600 ? `${Math.floor(seconds / 3600)}時間${Math.ceil((seconds % 3600) / 60)}分` : seconds >= 60 ? `${Math.ceil(seconds / 60)}分` : `${Math.ceil(seconds)}秒`

const PlantSprite = ({ color, glyph, progress }: { color: string; glyph: string; progress: number }) => <svg className={`garden-sprite ${progress >= 100 ? 'ripe' : ''}`} viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="50" cy="89" rx="30" ry="7" fill="#492c21" opacity=".15" />
  <path d={progress < 35 ? 'M50 86 Q46 69 51 58' : 'M50 86 Q43 62 50 36'} fill="none" stroke="#557343" strokeWidth="5" strokeLinecap="round" />
  <ellipse cx="36" cy="65" rx="15" ry="7" transform="rotate(28 36 65)" fill="#8fa56b" />
  <ellipse cx="62" cy="58" rx="15" ry="7" transform="rotate(-30 62 58)" fill="#708d51" />
  {progress >= 35 && <g><circle cx="50" cy="31" r={progress >= 100 ? 23 : 12} fill={color} /><circle cx="50" cy="31" r="15" fill="#fff9e7" opacity=".45" /><text x="50" y="39" textAnchor="middle" fill="#4c3e35" fontSize="24">{glyph}</text></g>}
  {progress >= 100 && <g fill="#bf943e"><path d="m17 24 3-7 3 7-3 7z" /><path d="m81 44 3-6 3 6-3 6z" /></g>}
</svg>

export const GardenModal = ({ game, activeBuffs, onClose, onPlant, onHarvest, onClear, onBuyDecoration, onSelectDecoration, onBrewTea }: GardenModalProps) => {
  const panel = useRef<HTMLElement>(null)
  const [tab, setTab] = useState<'garden' | 'seeds' | 'shop'>('garden')
  const [selectedSeed, setSelectedSeed] = useState('sweet')
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now)
  const [message, setMessage] = useState('')
  const garden = game.garden
  const unlocked = isGardenUnlocked(game)
  const selectedPlant = selectedPlot === null ? null : garden.plots[selectedPlot]
  const decoration = GARDEN_DECORATIONS.find(item => item.id === garden.selectedDecorationId)
  const tea = activeBuffs.find(buff => buff.id === 'garden-tea' && buff.expiresAt > now)
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { window.clearInterval(timer); focused?.focus() }
  }, [])
  const act = (success: boolean, text: string) => setMessage(success ? text : '今は操作できません。花びらや庭の状態を確認してください。')
  return <div className="modal-backdrop garden-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section ref={panel} className="garden-modal" role="dialog" aria-modal="true" aria-labelledby="garden-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose() }
      if (event.key === 'Tab') {
        const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
        const first = buttons[0]; const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }}>
      <header className="garden-heading">
        <div><small>A LITTLE GARDEN OF SATISFACTION</small><h2 id="garden-title">満足庭園</h2><p>ひと粒の種から、まだ見ぬ満足へ。</p></div>
        <button type="button" onClick={onClose} className="garden-close" aria-label="満足庭園を閉じる">×</button>
      </header>
      <div className="garden-wallet"><span>✿ 花びら <b>{garden.petals}</b></span><span>種 <b>{garden.unlockedSeedIds.length}/{GARDEN_SEEDS.length}</b></span><span>収穫 <b>{garden.totalHarvests}回</b></span></div>
      <nav className="garden-nav" aria-label="庭園のページ">
        <button type="button" aria-pressed={tab === 'garden'} onClick={() => setTab('garden')}>庭のお世話</button>
        <button type="button" aria-pressed={tab === 'seeds'} onClick={() => setTab('seeds')}>種の図鑑</button>
        <button type="button" aria-pressed={tab === 'shop'} onClick={() => setTab('shop')}>お店・飾り</button>
      </nav>
      {!unlocked && <p className="garden-notice">設備を合計25個購入すると解放します。まずは満足商店で設備をお迎えしましょう。</p>}
      <div className="garden-content">
        {tab === 'garden' && <>
          <div className="garden-instructions"><strong>種を選んで、空いた区画をタップ。</strong><p>育ちきった植物はタップで収穫。上下左右に育ちきった相性のよい植物があると、新しい種が必ず見つかります。閉じている間も育ち、枯れません。</p></div>
          <div className="garden-seed-picker" aria-label="植える種">
            {GARDEN_SEEDS.filter(seed => garden.unlockedSeedIds.includes(seed.id)).map(seed => <button type="button" key={seed.id} aria-pressed={selectedSeed === seed.id} onClick={() => { setSelectedSeed(seed.id); setMessage(`${seed.name}の種を選びました`) }}><span aria-hidden="true" style={{ color: seed.color }}>{seed.glyph}</span>{seed.name}</button>)}
          </div>
          <div className={`garden-land garden-decor-${decoration?.id ?? 'none'}`}>
            <div className="garden-land-label"><span>CHIRUKO'S GREENHOUSE</span><span aria-label={decoration?.name ?? '飾りなし'}>{decoration?.glyph ?? '☀'}</span></div>
            <div className="garden-plots" aria-label="庭の9区画">
              {garden.plots.map((plant, index) => {
                const seed = plant ? seedById(plant.seedId) : null
                const growth = plant ? getPlantProgress(plant, now) : null
                return <button type="button" key={index} className={`garden-plot ${plant ? growth?.mature ? 'mature' : 'growing' : 'empty'} ${selectedPlot === index ? 'selected' : ''}`} disabled={!unlocked || game.anomalyFrozen} aria-label={`区画${index + 1} ${seed ? `${seed.name} ${growth?.mature ? '収穫する' : `成長中 残り${timeLabel(growth!.remainingSeconds)}`}` : `${seedById(selectedSeed).name}を植える`}`} onClick={() => {
                  setSelectedPlot(index)
                  if (!plant) act(onPlant(index, selectedSeed), `${seedById(selectedSeed).name}を植えました`)
                  else if (growth?.mature) {
                    const result = onHarvest(index)
                    if (!result) { setMessage('まだ収穫できません。成長を確認してください。'); return }
                    const names = result.newSeedIds.map(id => seedById(id).name)
                    setMessage(names.length ? `新しい種「${names.join('・')}」を発見！ 花びら＋${result.petals}` : `${seed!.name}を収穫。花びら＋${result.petals}`)
                  }
                  else setMessage(`${seed!.name}は成長中です。残り${timeLabel(growth!.remainingSeconds)}`)
                }}>
                  <span className="garden-plot-number">{String(index + 1).padStart(2, '0')}</span>
                  {seed && growth ? <><PlantSprite color={seed.color} glyph={seed.glyph} progress={growth.progress} /><strong>{seed.name}</strong><small>{growth.mature ? `収穫 ＋${seed.petals}✿` : `あと${timeLabel(growth.remainingSeconds)}`}</small><progress aria-label={`${seed.name}の成長`} max={100} value={growth.progress} /></> : <><span className="garden-empty-mark" aria-hidden="true">＋</span><strong>種を植える</strong><small>何度でも無料</small></>}
                </button>
              })}
            </div>
            {decoration && <p className="garden-decoration-caption">{decoration.glyph} {decoration.name}を飾っています</p>}
          </div>
          {selectedPlant && selectedPlot !== null && <div className="garden-plot-detail"><span>区画{selectedPlot + 1} · {seedById(selectedPlant.seedId).name}</span><button type="button" onClick={() => { if (window.confirm('この区画の植物を片付けますか？ 花びらは得られません。種は残り、何度でも植え直せます。')) act(onClear(selectedPlot), '区画を空けました') }}>この区画を片付ける</button></div>}
          <p className="garden-footnote">種・花びら・植えた植物・庭の飾りは再布教後も残ります。植物の種類は「種の図鑑」の組み合わせをヒントに増やせます。</p>
        </>}
        {tab === 'seeds' && <>
          <p className="garden-instructions">組み合わせの2種類を上下左右に隣り合わせ、両方が育ったらどちらかを収穫。斜めの区画は対象になりません。</p>
          <div className="garden-catalog">{GARDEN_SEEDS.map(seed => {
            const known = garden.unlockedSeedIds.includes(seed.id)
            return <article className={`garden-seed-card ${known ? '' : 'unknown'}`} key={seed.id}><span className="garden-catalog-glyph" style={{ background: known ? seed.color : '#e4e0d6' }} aria-hidden="true">{known ? seed.glyph : '?'}</span><div><small>{known ? '発見済み' : 'まだ見ぬ種'}</small><h3>{known ? seed.name : '未発見の植物'}</h3><p>{known ? seed.description : '庭の隣り合わせから、新しい命が生まれます。'}</p><p>{seed.parents ? `組み合わせ：${seedById(seed.parents[0]).name} × ${seedById(seed.parents[1]).name}` : '最初から何度でも植えられる種'}</p><em>成長 {timeLabel(seed.growSeconds)} · 収穫 {seed.petals}花びら</em></div></article>
          })}</div>
          {garden.unlockedSeedIds.length === GARDEN_SEEDS.length && <p className="garden-completion">✦ 満足庭園の全品種を発見！<br />「宇宙のすみまで、あなたの庭が続いていますわ。」</p>}
        </>}
        {tab === 'shop' && <>
          <article className="garden-tea-card"><span aria-hidden="true">☕</span><div><h3>庭園のお茶会</h3><p>花びら{GARDEN_TEA_COST}枚で{GARDEN_TEA_SECONDS / 60}分間、ひとさわりと自動生産が1.2倍。</p><small>救済効果と同じ一時強化です。再読み込み・再布教で終了します。発動できる効果は同時に3つまで。</small><button type="button" disabled={!unlocked || garden.petals < GARDEN_TEA_COST || Boolean(tea) || activeBuffs.filter(buff => buff.expiresAt > now).length >= 3} onClick={() => act(onBrewTea(), '庭園のお茶会を始めました')}>{tea ? `お茶会中・残り${timeLabel(Math.min(GARDEN_TEA_SECONDS, Math.max(0, (tea.expiresAt - now) / 1000)))}` : `花びら${GARDEN_TEA_COST}枚でお茶会`}</button></div></article>
          <h3 className="garden-shop-title">庭にひとつ、お気に入りの飾りを。</h3><p className="garden-footnote">購入した飾りはずっと残ります。気分に合わせて付け替えられます。</p>
          <div className="garden-shop">{GARDEN_DECORATIONS.map(item => {
            const owned = garden.decorationIds.includes(item.id)
            const selected = garden.selectedDecorationId === item.id
            return <article key={item.id}><span aria-hidden="true">{item.glyph}</span><h3>{item.name}</h3><p>{item.description}</p><button type="button" disabled={selected || !unlocked || (!owned && garden.petals < item.cost)} onClick={() => act(owned ? onSelectDecoration(item.id) : onBuyDecoration(item.id), `${item.name}を飾りました`)}>{selected ? '飾っています' : owned ? 'この飾りにする' : `花びら${item.cost}枚で交換`}</button></article>
          })}</div>
          {garden.selectedDecorationId && <button type="button" className="garden-remove-decor" onClick={() => act(onSelectDecoration(null), '飾りを外しました')}>飾りを外す</button>}
        </>}
      </div>
      <div className="garden-message" role="status">{message || 'ちる子「急がず、のんびり育てましょう。」'}</div>
    </section>
  </div>
}

