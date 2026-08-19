import { GAME_CONFIG, SHOP_ITEMS } from '../config/gameConfig'
import type { SeasonDefinition } from '../config/seasons'
import { getFacilityMilestoneMultiplier, getItemProductionMultiplier, getPrestigeGain, getVirtueMarkBonusPercent } from '../game/calculations'
import type { GameState } from '../types/game'
import { formatMultiplier, formatNumber } from '../utils/format'
import { assetPath } from '../utils/assetPath'
import { SideSystemsPanel } from './SideSystemsPanel'
import type { WorshipPolicy } from '../types/game'

interface WorldPanelProps {
  game: GameState
  perSecond: number
  achievementMultiplier: number
  productionMultiplier: number
  season: SeasonDefinition
  onOpenStats: () => void
  onOpenPrestige: () => void
  onClaimOmen: () => void
  onSetWorshipPolicy: (policy: WorshipPolicy) => void
  onSendSleepyChiruko: () => void
  onWakeSleepyChiruko: () => void
}

const LANE_GROUPS = [
  { label: '教祖のおへや', scenery: '窓辺とおやつの小部屋', ids: ['petting', 'sweet-treat'], tone: 'room' },
  { label: 'ふかふか平原', scenery: 'よく眠れる救済の丘', ids: ['soft-futon', 'chiruko-doll'], tone: 'meadow' },
  { label: 'デスクトップ区画', scenery: 'PCのすみから映像世界へ', ids: ['desktop-accessory', 'sora-2'], tone: 'desktop' },
  { label: '満足教・聖域', scenery: '信者と祭壇の荘厳な集会', ids: ['believer', 'altar'], tone: 'sanctuary' },
  { label: '夜更けの布教街', scenery: '巨大像・湯気・放送電波', ids: ['giant-statue', 'ramen-sanctum', 'cult-broadcast'], tone: 'city' },
  { label: 'ネオ大聖域', scenery: '世界の境界はここから', ids: ['neo-cathedral', 'dimension-gate'], tone: 'cathedral' },
  { label: '銀河満足航路', scenery: '布教船の先にある架空の未来', ids: ['cosmic-chiruko', 'sora-3'], tone: 'cosmos' },
  { label: '満足宇宙開発区', scenery: '星を観測し、銀河へ満足を届ける', ids: ['satisfaction-observatory', 'galaxy-mission-fleet'], tone: 'cosmos' },
  { label: '終端世界', scenery: '宇宙を演算し、夢想圏へ', ids: ['satisfaction-simulator', 'sora-4'], tone: 'cathedral' },
]

const DISPLAY_COUNT_THRESHOLDS = [1, 2, 3, 4, 5, 7, 10, 15, 25, 50, 100, 250]

const getDisplayedFacilityCount = (owned: number) => (
  DISPLAY_COUNT_THRESHOLDS.filter((threshold) => owned >= threshold).length
)

export const WorldPanel = ({ game, perSecond, achievementMultiplier, productionMultiplier, season, onOpenStats, onOpenPrestige, onClaimOmen, onSetWorshipPolicy, onSendSleepyChiruko, onWakeSleepyChiruko }: WorldPanelProps) => {
  const prestigeGain = getPrestigeGain(game.runSatisfaction)
  const progress = Math.min(100, (game.runSatisfaction / GAME_CONFIG.prestigeBaseRequirement) * 100)

  return (
    <section className="world-panel" aria-labelledby="world-title" style={{ '--season-accent': season.accent } as React.CSSProperties}>
      <header className="world-header">
        <div>
          <span>THE SATISFACTION WORLD</span>
          <h2 id="world-title">満足界・観測窓</h2>
        </div>
        <div className="world-actions">
          <button type="button" onClick={onOpenStats}>記録</button>
          <button type="button" onClick={onOpenPrestige}>再布教</button>
        </div>
      </header>

      <article className="season-banner">
        <span className="season-icon" aria-hidden="true">{season.icon}</span>
        <div><small>{season.subtitle}</small><strong>{season.name}</strong><p>{season.description}</p></div>
        <i aria-hidden="true">開催中</i>
      </article>

      <SideSystemsPanel game={game} perSecond={perSecond} onClaimOmen={onClaimOmen} onSetWorshipPolicy={onSetWorshipPolicy} onSendSleepyChiruko={onSendSleepyChiruko} onWakeSleepyChiruko={onWakeSleepyChiruko} />

      <div className="world-lanes">
        {LANE_GROUPS.map((lane, laneIndex) => {
          const items = lane.ids.map((id) => SHOP_ITEMS.find((item) => item.id === id)!).filter(Boolean)
          const ownedInLane = items.reduce((sum, item) => sum + (game.inventory[item.id] ?? 0), 0)
          return (
            <article className={`world-lane lane-${lane.tone} ${ownedInLane > 0 ? 'active' : 'dormant'}`} key={lane.label}>
              <div className="lane-label"><small>AREA {String(laneIndex + 1).padStart(2, '0')}</small><strong>{lane.label}</strong><span>{lane.scenery}</span></div>
              <div className="lane-scene" aria-label={`${lane.label}の所有設備 ${ownedInLane}個`}>
                <div className="lane-sky" aria-hidden="true"><i /><i /><i /></div>
                <div className={`facility-visuals groups-${items.length}`} aria-hidden="true">
                  {items.map((item) => {
                    const displayedCount = getDisplayedFacilityCount(game.inventory[item.id] ?? 0)
                    return (
                      <div className="facility-sprite-group" key={item.id}>
                        {Array.from({ length: displayedCount }, (_, index) => (
                          item.imagePath
                            ? <img className="facility-sprite" src={assetPath(item.imagePath)} alt="" decoding="async" key={`${item.id}-${index}`} />
                            : <span className="facility-sprite fallback" key={`${item.id}-${index}`}>{item.icon}</span>
                        ))}
                      </div>
                    )
                  })}
                </div>
                <div className="facility-row">
                  {items.map((item) => {
                    const owned = game.inventory[item.id] ?? 0
                    const milestoneMultiplier = getFacilityMilestoneMultiplier(owned)
                    const unitRate = item.effectType === 'perSecond'
                      ? item.effectValue * getItemProductionMultiplier(item.id, game.purchasedUpgradeIds) * milestoneMultiplier * achievementMultiplier * productionMultiplier
                      : 0
                    return (
                      <div className={`world-facility ${owned > 0 ? 'owned' : ''}`} key={item.id} title={item.name}>
                        <span aria-hidden="true">{item.imagePath ? <img src={assetPath(item.imagePath)} alt="" /> : item.icon}</span>
                        <div><strong>{item.name}</strong><small>×{owned}{milestoneMultiplier > 1 ? `・効率×${formatMultiplier(milestoneMultiplier)}` : ''}{unitRate > 0 && owned > 0 ? `・${formatNumber(unitRate * owned)}/秒` : ''}</small></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <footer className="world-footer">
        <div className="prestige-meter">
          <span><b>再布教への満足</b><em>{formatNumber(game.runSatisfaction)} / {formatNumber(GAME_CONFIG.prestigeBaseRequirement)}</em></span>
          <div><i style={{ width: `${progress}%` }} /></div>
        </div>
        <button type="button" className={prestigeGain > 0 ? 'ready' : ''} onClick={onOpenPrestige}>
          <small>救済印 {game.virtueMarks}・永久 +{getVirtueMarkBonusPercent(game.virtueMarks)}%</small>
          <strong>{prestigeGain > 0 ? `いま再布教で +${prestigeGain}印` : `毎秒 ${formatNumber(perSecond)} 満足`}</strong>
        </button>
      </footer>
    </section>
  )
}
