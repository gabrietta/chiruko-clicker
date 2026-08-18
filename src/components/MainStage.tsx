import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SHOP_ITEMS, GAME_CONFIG } from '../config/gameConfig'
import { CHARACTER_SKINS } from '../config/cosmetics'
import { getDialogueCandidates } from '../config/dialogues'
import type { ActiveBuff, ShopItemDefinition } from '../types/game'
import { formatDetailedNumber, formatNumber } from '../utils/format'
import { assetPath } from '../utils/assetPath'
import { getItemCost } from '../game/calculations'

interface EffectParticle {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  glyph: string
}

interface GainEffect {
  id: number
  x: number
  y: number
  amount: number
}

type ChirukoExpression = 'normal' | 'smile' | 'nikoniko'

interface MainStageProps {
  satisfaction: number
  totalSatisfaction: number
  manualClicks: number
  inventory: Record<string, number>
  achievementCount: number
  achievementBonusPercent: number
  clickPower: number
  perSecond: number
  nextGoal: { item: ShopItemDefinition; cost: number } | null
  luckyEventVisible: boolean
  activeBuffs: ActiveBuff[]
  chainRemaining: number
  clickCombo: number
  selectedCharacterSkin: string
  selectedStageTheme: string
  onCharacterClick: () => number
  onLuckyEvent: () => void
  onOpenAchievements: () => void
  onDialogue: (line: string) => void
  onPurchaseItem: (itemId: string) => void
}

export const MainStage = ({
  satisfaction,
  totalSatisfaction,
  manualClicks,
  inventory,
  achievementCount,
  achievementBonusPercent,
  clickPower,
  perSecond,
  nextGoal,
  luckyEventVisible,
  activeBuffs,
  chainRemaining,
  clickCombo,
  selectedCharacterSkin,
  selectedStageTheme,
  onCharacterClick,
  onLuckyEvent,
  onOpenAchievements,
  onDialogue,
  onPurchaseItem,
}: MainStageProps) => {
  const zoneRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const effectId = useRef(0)
  const [gains, setGains] = useState<GainEffect[]>([])
  const [particles, setParticles] = useState<EffectParticle[]>([])
  const [quote, setQuote] = useState('今日の小さな満足に、感謝いたしましょう。')
  const [expression, setExpression] = useState<ChirukoExpression>('normal')
  const [showExactSatisfaction, setShowExactSatisfaction] = useState(false)
  const quoteRef = useRef(quote)
  const smileTimeoutRef = useRef<number | null>(null)
  const characterSkin = CHARACTER_SKINS.find((skin) => skin.id === selectedCharacterSkin) ??
    CHARACTER_SKINS[0]
  const characterImagePath = selectedCharacterSkin === 'sit'
    ? expression === 'nikoniko'
      ? GAME_CONFIG.characterImages.nikoniko
      : expression === 'smile'
        ? GAME_CONFIG.characterImages.smile
        : characterSkin.imagePath
    : characterSkin.imagePath

  const triggerSmile = useCallback((durationMs = 1_800, variant?: Exclude<ChirukoExpression, 'normal'>) => {
    if (selectedCharacterSkin !== 'sit') return
    setExpression(variant ?? (Math.random() < 0.5 ? 'smile' : 'nikoniko'))
    if (smileTimeoutRef.current !== null) window.clearTimeout(smileTimeoutRef.current)
    smileTimeoutRef.current = window.setTimeout(() => {
      setExpression('normal')
      smileTimeoutRef.current = null
    }, durationMs)
  }, [selectedCharacterSkin])

  const dialogueTier = manualClicks >= 1_000 ? 3 : manualClicks >= 100 ? 2 : manualClicks >= 20 ? 1 : 0
  const productionTier = perSecond >= 1_000_000 ? 3 : perSecond >= 1_000 ? 2 : perSecond > 0 ? 1 : 0
  const satisfactionTier = totalSatisfaction >= 1_000_000_000 ? 1 : 0
  const dialogueCandidates = useMemo(() => getDialogueCandidates({
    hour: new Date().getHours(),
    manualClicks: [0, 20, 100, 1_000][dialogueTier],
    totalSatisfaction: satisfactionTier > 0 ? 1_000_000_000 : 0,
    perSecond: [0, 1, 1_000, 1_000_000][productionTier],
    inventory,
    activeBuffNames: activeBuffs.map((buff) => buff.name),
    selectedCharacterSkin,
  }), [activeBuffs, dialogueTier, inventory, productionTier, satisfactionTier, selectedCharacterSkin])

  useEffect(() => {
    const expressionImages = [GAME_CONFIG.characterImages.smile, GAME_CONFIG.characterImages.nikoniko]
    expressionImages.forEach((imagePath) => {
      const expressionImage = new Image()
      expressionImage.src = assetPath(imagePath)
    })
  }, [])

  useEffect(() => {
    if (selectedCharacterSkin !== 'sit') return
    let idleSmileTimer = 0
    const scheduleIdleSmile = () => {
      idleSmileTimer = window.setTimeout(() => {
        triggerSmile(2_200)
        scheduleIdleSmile()
      }, 17_000 + Math.random() * 16_000)
    }
    scheduleIdleSmile()
    return () => window.clearTimeout(idleSmileTimer)
  }, [selectedCharacterSkin, triggerSmile])

  useEffect(() => () => {
    if (smileTimeoutRef.current !== null) window.clearTimeout(smileTimeoutRef.current)
  }, [])

  useEffect(() => {
    let timer = 0
    const rotateQuote = () => {
      const alternatives = dialogueCandidates.filter((line) => line !== quoteRef.current)
      const choices = alternatives.length > 0 ? alternatives : dialogueCandidates
      const next = choices[Math.floor(Math.random() * choices.length)]
      if (next) {
        quoteRef.current = next
        setQuote(next)
        onDialogue(next)
      }
      timer = window.setTimeout(rotateQuote, 12_000 + Math.random() * 8_000)
    }
    timer = window.setTimeout(rotateQuote, 3_000 + Math.random() * 2_000)
    return () => window.clearTimeout(timer)
  }, [dialogueCandidates, onDialogue])

  const triggerClick = (x: number, y: number) => {
    const amount = onCharacterClick()
    triggerSmile(
      1_250 + Math.random() * 450,
      Math.random() < 0.5 ? 'smile' : 'nikoniko',
    )
    const id = ++effectId.current
    const newParticles = Array.from({ length: 5 }, (_, index) => ({
      id: id * 10 + index,
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 20,
      dx: (Math.random() - 0.5) * 125,
      dy: -35 - Math.random() * 85,
      glyph: index % 2 === 0 ? '♡' : '✦',
    }))

    setGains((current) => [...current.slice(-18), { id, x, y, amount }])
    setParticles((current) => [...current.slice(-42), ...newParticles])
    window.setTimeout(() => {
      setGains((current) => current.filter((effect) => effect.id !== id))
      setParticles((current) => current.filter((particle) => Math.floor(particle.id / 10) !== id))
    }, 900)

    imageRef.current?.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(0.955) rotate(-1deg)', offset: 0.35 },
        { transform: 'scale(1.035) rotate(1deg)', offset: 0.7 },
        { transform: 'scale(1)' },
      ],
      { duration: 210, easing: 'cubic-bezier(.2,.8,.3,1)' },
    )
  }

  const centerPoint = () => {
    const rect = zoneRef.current?.getBoundingClientRect()
    return rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 180, y: 180 }
  }

  return (
    <section className={`main-stage stage-theme-${selectedStageTheme}`} aria-label="残念院ちる子をさわって満足を集める場所">
      <div className="cult-watermark" aria-hidden="true">満</div>

      <div className="character-zone" ref={zoneRef}>
        <img className="satellite-chiruko satellite-read" src={assetPath(GAME_CONFIG.characterImages.read)} alt="" aria-hidden="true" />
        <img className="satellite-chiruko satellite-run" src={assetPath(GAME_CONFIG.characterImages.run)} alt="" aria-hidden="true" />
        <img className="satellite-chiruko satellite-sleep" src={assetPath(GAME_CONFIG.characterImages.sleep)} alt="" aria-hidden="true" />

        <div className="chiruko-quote"><span aria-hidden="true">教祖曰く</span>{quote}</div>

        {activeBuffs.length > 0 && (
          <div className="active-buff-stack" role="status" aria-label={`${activeBuffs.length}個の救済効果が発動中`}>
            {activeBuffs.map((buff, index) => {
              const remainingSeconds = Math.max(0, Math.ceil((buff.expiresAt - Date.now()) / 1000))
              const progress = Math.max(0, Math.min(100, ((buff.expiresAt - Date.now()) / (buff.expiresAt - buff.startedAt)) * 100))
              return (
                <div className={`active-buff-banner buff-${buff.kind}`} key={buff.id}>
                  <span aria-hidden="true">{index === 0 ? '✦' : '×'}</span>
                  <div><small>{activeBuffs.length > 1 ? `救済コンボ ×${activeBuffs.length}` : '救済効果・発動中'}</small><strong>{buff.name}</strong><em>{buff.description}・残り{remainingSeconds}秒</em></div>
                  <i aria-hidden="true"><b style={{ width: `${progress}%` }} /></i>
                </div>
              )
            })}
          </div>
        )}

        {clickCombo > 1 && (
          <div className="click-combo-meter" role="status" aria-label={`クリックコンボ ${clickCombo}`}>ひとさわり連祷 <b>×{clickCombo}</b><small>（最大+15%）</small></div>
        )}

        <button
          type="button"
          className="character-button"
          data-tutorial-target="chiruko"
          aria-label={`ちる子をさわる。${formatNumber(clickPower)}満足を獲得`}
          data-testid="chiruko-button"
          onPointerDown={(event) => {
            const rect = zoneRef.current?.getBoundingClientRect()
            if (!rect) return
            triggerClick(event.clientX - rect.left, event.clientY - rect.top)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            const point = centerPoint()
            triggerClick(point.x, point.y)
          }}
        >
          <span className="character-halo" aria-hidden="true" />
          <img
            ref={imageRef}
            className={`character-image character-skin-${characterSkin.id}`}
            src={assetPath(characterImagePath)}
            alt={`${characterSkin.name}の残念院ちる子`}
            data-expression={expression}
            draggable="false"
          />
        </button>

        {manualClicks === 0 && <div className="tap-hint" aria-hidden="true">♡ クリック / タップ</div>}

        {luckyEventVisible && (
          <button className="lucky-fragment" type="button" onClick={onLuckyEvent} aria-label="きらめく救済の欠片をつかまえる">
            <span aria-hidden="true">✦</span>
            <b>{chainRemaining > 0 ? `連鎖 ${4 - chainRemaining}/3` : '救済!'}</b>
          </button>
        )}

        {gains.map((gain) => (
          <span className="floating-gain" key={gain.id} style={{ left: gain.x, top: gain.y }} aria-hidden="true">
            +{formatNumber(gain.amount)}
          </span>
        ))}
        {particles.map((particle) => (
          <span
            className="particle"
            key={particle.id}
            style={{
              left: particle.x,
              top: particle.y,
              '--dx': `${particle.dx}px`,
              '--dy': `${particle.dy}px`,
            } as React.CSSProperties}
            aria-hidden="true"
          >
            {particle.glyph}
          </span>
        ))}
      </div>

      <div className="stage-bottom busy-stats">
        <div className="mini-stat" title={`正確なひとさわり: +${formatDetailedNumber(clickPower)} 満足`}>
          <span>ひとさわり</span>
          <strong>+{formatNumber(clickPower)} 満足</strong>
        </div>
        <div className="mini-stat" title={`正確な自動生産: +${formatDetailedNumber(perSecond)} 満足 / 秒`}>
          <span>自動生産</span>
          <strong>+{formatNumber(perSecond)} / 秒</strong>
        </div>
        <button className="mini-stat virtue-stat" type="button" onClick={onOpenAchievements}>
          <span>満足教の徳</span>
          <strong>{achievementCount}徳・生産 +{achievementBonusPercent}%</strong>
        </button>
        <div className="exact-satisfaction-anchor">
          <button
            className="next-goal-card current-satisfaction-card"
            data-tutorial-target="satisfaction"
            type="button"
            aria-expanded={showExactSatisfaction}
            aria-label={showExactSatisfaction ? '満足数の詳細を閉じる' : '満足数の詳細を開く'}
            title="クリックで満足数の詳細を表示"
            onClick={() => setShowExactSatisfaction((visible) => !visible)}
          >
            <span>現在の満足</span>
            <strong>{formatNumber(satisfaction)} 満足</strong>
            <em>{nextGoal ? `次：${nextGoal.item.name}まで ${formatNumber(Math.max(0, nextGoal.cost - satisfaction))}` : `累計 ${formatNumber(totalSatisfaction)} 満足`}</em>
          </button>
          {showExactSatisfaction && (
            <div className="satisfaction-detail-popover" role="status" aria-live="polite">
              <small>REAL-TIME SATISFACTION</small>
              <strong>{formatDetailedNumber(satisfaction)} 満足</strong>
              <span>毎秒 +{formatDetailedNumber(perSecond)} 満足</span>
              <em>クリックで閉じる</em>
            </div>
          )}
        </div>
      </div>

      <div className="facility-parade" aria-label="所有設備一覧">
        <span className="parade-label">机のすみ</span>
        <div className="parade-track" role="region" aria-label="所有設備の個数。横にスクロールしてすべて確認できます" tabIndex={0}>
          {SHOP_ITEMS.map((item) => (
            <button type="button" disabled={satisfaction < getItemCost(item, inventory[item.id] ?? 0)} className={`parade-unit ${(inventory[item.id] ?? 0) > 0 ? 'active' : ''}`} key={item.id} title={`${item.name} × ${inventory[item.id] ?? 0}`} onClick={() => onPurchaseItem(item.id)} aria-label={`${item.name}を1個、${formatNumber(getItemCost(item, inventory[item.id] ?? 0))}満足で購入`}>
              <span aria-hidden="true">{item.imagePath ? <img src={assetPath(item.imagePath)} alt="" /> : item.icon}</span>
              <b>{inventory[item.id] ?? 0}</b>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
