import { useState } from 'react'
import { SHOP_ITEMS } from '../config/gameConfig'
import { getActiveSeason } from '../config/seasons'
import { UPGRADES } from '../config/upgrades'
import {
  FACILITY_MILESTONE_MULTIPLIER,
  getBulkItemCost,
  getFacilityMilestoneMultiplier,
  getItemProductionMultiplier,
  getNextFacilityMilestone,
  getVirtueMarkMultiplier,
  isUpgradeUnlocked,
} from '../game/calculations'
import type { GameState, ShopItemDefinition } from '../types/game'
import { formatNumber } from '../utils/format'
import { assetPath } from '../utils/assetPath'

interface ShopProps {
  game: GameState
  lastPurchasedId: string | null
  achievementMultiplier: number
  productionMultiplier: number
  onPurchase: (itemId: string, quantity: number) => void
  onPurchaseUpgrade: (upgradeId: string) => void
}

interface TooltipState {
  itemId: string
  left: number
  top: number
}

const getUnlockLabel = (upgrade: typeof UPGRADES[number]) => {
  const requirement = upgrade.unlock
  if (requirement.type === 'prestige') return `再布教 ${requirement.target}回で解禁`
  if (requirement.type === 'totalSatisfaction') return `累計 ${formatNumber(requirement.target)}満足で解禁`
  const item = SHOP_ITEMS.find((candidate) => candidate.id === requirement.itemId)
  return `${item?.name ?? '設備'}を${requirement.target}個で解禁`
}

export const Shop = ({ game, lastPurchasedId, achievementMultiplier, productionMultiplier, onPurchase, onPurchaseUpgrade }: ShopProps) => {
  const [tab, setTab] = useState<'facilities' | 'upgrades'>('facilities')
  const [quantity, setQuantity] = useState<1 | 10 | 100>(1)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const totalOwned = Object.values(game.inventory).reduce((total, count) => total + count, 0)
  const clickGlobalMultiplier = UPGRADES.reduce((multiplier, upgrade) => (
    upgrade.effectType === 'clickMultiplier' && game.purchasedUpgradeIds.includes(upgrade.id)
      ? multiplier * upgrade.effectValue
      : multiplier
  ), 1) * getVirtueMarkMultiplier(game.virtueMarks) * getActiveSeason().clickMultiplier

  const showTooltip = (itemId: string, element: HTMLElement, autoHide = false) => {
    const rect = element.getBoundingClientRect()
    const next = {
      itemId,
      left: Math.max(12, rect.left - 374),
      top: Math.max(96, Math.min(rect.top - 20, window.innerHeight - 340)),
    }
    setTooltip(next)
    if (autoHide) {
      window.setTimeout(() => setTooltip((current) => current?.itemId === itemId ? null : current), 4_500)
    }
  }

  const tooltipItem = tooltip ? SHOP_ITEMS.find((item) => item.id === tooltip.itemId) ?? null : null
  const tooltipOwned = tooltipItem ? game.inventory[tooltipItem.id] ?? 0 : 0
  const tooltipItemMultiplier = tooltipItem ? getItemProductionMultiplier(tooltipItem.id, game.purchasedUpgradeIds) : 1
  const tooltipMilestoneMultiplier = getFacilityMilestoneMultiplier(tooltipOwned)
  const tooltipNextMilestone = getNextFacilityMilestone(tooltipOwned)
  const tooltipUnitEffect = tooltipItem
    ? tooltipItem.effectType === 'click'
      ? tooltipItem.effectValue * tooltipMilestoneMultiplier * clickGlobalMultiplier
      : tooltipItem.effectValue * tooltipItemMultiplier * tooltipMilestoneMultiplier * achievementMultiplier * productionMultiplier
    : 0
  const tooltipOwnedEffect = tooltipUnitEffect * tooltipOwned
  const tooltipUpgrades = tooltipItem ? UPGRADES.filter((upgrade) => {
    if (!game.purchasedUpgradeIds.includes(upgrade.id)) return false
    if (upgrade.effectType === 'itemProductionMultiplier') return upgrade.itemId === tooltipItem.id
    if (tooltipItem.effectType === 'click') return upgrade.effectType === 'clickMultiplier'
    return upgrade.effectType === 'globalProductionMultiplier'
  }) : []

  return (
    <>
      <aside className="shop-panel" aria-labelledby="shop-title">
        <div className="shop-heading">
          <div><span className="shop-overline">SATISFACTION SUPPLY DEPOT</span><h2 id="shop-title">満足商店</h2><p>設備と、一度きりのありがたい御利益</p></div>
          <span className="shop-count">総設備 <b>{totalOwned}</b></span>
        </div>

        <div className="shop-tabs" role="tablist" aria-label="満足商店の品揃え">
          <button type="button" role="tab" aria-selected={tab === 'facilities'} className={tab === 'facilities' ? 'active' : ''} onClick={() => { setTab('facilities'); setTooltip(null) }}>設備</button>
          <button type="button" role="tab" aria-selected={tab === 'upgrades'} className={tab === 'upgrades' ? 'active' : ''} onClick={() => { setTab('upgrades'); setTooltip(null) }}>御利益 <span>{game.purchasedUpgradeIds.length}/{UPGRADES.length}</span></button>
        </div>

        {tab === 'facilities' ? (
          <>
            <div className="quantity-selector"><span>設備にカーソルを合わせると詳細表示</span>{([1, 10, 100] as const).map((amount) => <button type="button" className={quantity === amount ? 'active' : ''} onClick={() => setQuantity(amount)} key={amount}>{amount}</button>)}</div>
            <div className="shop-list" onScroll={() => setTooltip(null)}>
              {SHOP_ITEMS.map((item, index) => {
                const owned = game.inventory[item.id] ?? 0
                const cost = getBulkItemCost(item, owned, quantity)
                const canBuy = game.satisfaction >= cost
                const itemMultiplier = getItemProductionMultiplier(item.id, game.purchasedUpgradeIds)
                const milestoneMultiplier = getFacilityMilestoneMultiplier(owned)
                const nextMilestone = getNextFacilityMilestone(owned)
                const effectLabel = item.effectType === 'click'
                  ? `ひとさわり +${formatNumber(item.effectValue * milestoneMultiplier * clickGlobalMultiplier)}`
                  : `毎秒 +${formatNumber(item.effectValue * itemMultiplier * milestoneMultiplier * achievementMultiplier * productionMultiplier)}`
                return (
                  <article
                    className={`shop-item ${canBuy ? 'can-buy' : 'cannot-buy'} ${lastPurchasedId === item.id ? 'just-bought' : ''}`}
                    key={item.id}
                    tabIndex={0}
                    aria-describedby={tooltip?.itemId === item.id ? 'facility-detail-tooltip' : undefined}
                    onMouseEnter={(event) => showTooltip(item.id, event.currentTarget)}
                    onMouseLeave={() => setTooltip((current) => current?.itemId === item.id ? null : current)}
                    onFocus={(event) => showTooltip(item.id, event.currentTarget)}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTooltip(null)
                    }}
                    onPointerDown={(event) => {
                      if (event.pointerType === 'touch' && !(event.target as HTMLElement).closest('button')) showTooltip(item.id, event.currentTarget, true)
                    }}
                  >
                    <span className="item-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <div className="item-icon" aria-hidden="true">{item.imagePath ? <img src={assetPath(item.imagePath)} alt="" /> : item.icon}</div>
                    <div className="item-details">
                      <div className="item-title-line"><h3>{item.name}</h3><span className="owned-pill">× {owned}</span>{milestoneMultiplier > 1 && <span className="milestone-multiplier">×{milestoneMultiplier}</span>}</div>
                      <p className="item-description">{item.description}</p>
                      <div className="item-production-line"><span className="item-effect">{effectLabel}</span>{item.effectType === 'perSecond' && owned > 0 && <span className="item-total-output">計 +{formatNumber(item.effectValue * itemMultiplier * milestoneMultiplier * owned * achievementMultiplier * productionMultiplier)}/秒</span>}</div>
                      <span className={`milestone-progress ${nextMilestone ? '' : 'complete'}`}>{nextMilestone ? `あと${nextMilestone - owned}個で生産×${FACILITY_MILESTONE_MULTIPLIER}` : '節目ボーナス最大'}</span>
                    </div>
                    <button type="button" className="buy-button" disabled={!canBuy} onClick={() => onPurchase(item.id, quantity)} aria-label={`${item.name}を${quantity}個、${formatNumber(cost)}満足で購入`}>
                      <span>{canBuy ? `${quantity}個お迎え` : '不足'}</span><strong>{formatNumber(cost)}</strong>
                    </button>
                  </article>
                )
              })}
            </div>
          </>
        ) : (
          <div className="upgrade-list">
            {UPGRADES.map((upgrade) => {
              const purchased = game.purchasedUpgradeIds.includes(upgrade.id)
              const unlocked = isUpgradeUnlocked(game, upgrade.id)
              const canBuy = unlocked && !purchased && game.satisfaction >= upgrade.cost
              return (
                <article className={`upgrade-card ${purchased ? 'purchased' : ''} ${unlocked ? 'unlocked' : 'locked'}`} key={upgrade.id}>
                  <span className="upgrade-icon" aria-hidden="true">{purchased ? '済' : upgrade.icon}</span>
                  <div><h3>{upgrade.name}</h3><p>{upgrade.description}</p><em>{purchased ? upgrade.flavor : unlocked ? `${formatNumber(upgrade.cost)} 満足` : getUnlockLabel(upgrade)}</em></div>
                  <button type="button" disabled={!canBuy} onClick={() => onPurchaseUpgrade(upgrade.id)}>{purchased ? '取得済' : unlocked ? game.satisfaction >= upgrade.cost ? '授かる' : '不足' : '未解禁'}</button>
                </article>
              )
            })}
          </div>
        )}
        <div className="shop-footer-note"><span aria-hidden="true">※</span> 購入価格は設備ごとに上昇します。御利益は再布教すると失われます。</div>
      </aside>

      {tooltip && tooltipItem && (
        <FacilityTooltip
          item={tooltipItem}
          owned={tooltipOwned}
          unitEffect={tooltipUnitEffect}
          ownedEffect={tooltipOwnedEffect}
          milestoneMultiplier={tooltipMilestoneMultiplier}
          nextMilestone={tooltipNextMilestone}
          nextCost={getBulkItemCost(tooltipItem, tooltipOwned, 1)}
          upgradeNames={tooltipUpgrades.map((upgrade) => upgrade.name)}
          left={tooltip.left}
          top={tooltip.top}
          onClose={() => setTooltip(null)}
        />
      )}
    </>
  )
}

interface FacilityTooltipProps {
  item: ShopItemDefinition
  owned: number
  unitEffect: number
  ownedEffect: number
  milestoneMultiplier: number
  nextMilestone: number | null
  nextCost: number
  upgradeNames: string[]
  left: number
  top: number
  onClose: () => void
}

const FacilityTooltip = ({ item, owned, unitEffect, ownedEffect, milestoneMultiplier, nextMilestone, nextCost, upgradeNames, left, top, onClose }: FacilityTooltipProps) => (
  <aside
    id="facility-detail-tooltip"
    className="facility-tooltip"
    role="tooltip"
    style={{ left, top }}
  >
    <button className="facility-tooltip-close" type="button" onClick={onClose} aria-label="詳細表示を閉じる">×</button>
    <header>
      <span className="facility-tooltip-icon" aria-hidden="true">{item.imagePath ? <img src={assetPath(item.imagePath)} alt="" /> : item.icon}</span>
      <div><h3>{item.name}</h3><p>所有数：{formatNumber(owned)}</p></div>
      <strong><small>次の価格</small>{formatNumber(nextCost)}</strong>
    </header>
    <blockquote>“{item.description}”</blockquote>
    <div className="facility-tooltip-effects">
      <p><span aria-hidden="true">●</span> 1個あたり{item.effectType === 'click' ? '、ひとさわり' : '毎秒'} <b>+{formatNumber(unitEffect)}</b> 満足</p>
      <p><span aria-hidden="true">●</span> 所有分の合計：<b>+{formatNumber(ownedEffect)}</b>{item.effectType === 'perSecond' ? ' / 秒' : ' / ひとさわり'}</p>
      <p><span aria-hidden="true">●</span> 節目効率：<b>×{milestoneMultiplier}</b>{nextMilestone ? `（あと${nextMilestone - owned}個で×${FACILITY_MILESTONE_MULTIPLIER}）` : '（最大）'}</p>
      <p><span aria-hidden="true">●</span> 適用中の御利益：<b>{upgradeNames.length > 0 ? upgradeNames.join('・') : 'なし'}</b></p>
    </div>
    <footer>実績・救済印・季節イベントなど、現在有効な倍率を含む表示です。</footer>
  </aside>
)
