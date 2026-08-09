import { GAME_CONFIG } from '../config/gameConfig'
import {
  areDoctrineRequirementsMet,
  DOCTRINES,
  getSpentVirtueMarks,
} from '../config/doctrines'
import { getPrestigeGain, getVirtueMarkBonusPercent } from '../game/calculations'
import type { GameState } from '../types/game'
import { formatNumber } from '../utils/format'

interface PrestigeModalProps {
  game: GameState
  onClose: () => void
  onPrestige: () => void
  onPurchaseDoctrine: (doctrineId: string) => void
}

export const PrestigeModal = ({ game, onClose, onPrestige, onPurchaseDoctrine }: PrestigeModalProps) => {
  const gain = getPrestigeGain(game.runSatisfaction)
  const virtueBonusPercent = getVirtueMarkBonusPercent(game.virtueMarks)
  const spentMarks = getSpentVirtueMarks(game.purchasedDoctrineIds)
  const availableMarks = game.virtueMarks - spentMarks
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card prestige-modal" role="dialog" aria-modal="true" aria-labelledby="prestige-title">
        <div className="prestige-seal" aria-hidden="true">巡</div>
        <p className="modal-eyebrow">SPREAD SATISFACTION ONCE MORE</p>
        <h2 id="prestige-title">世界を満たして、再布教</h2>
        <p>現在の満足・設備・御利益を手放し、最初から始めます。実績・統計・救済印は残ります。</p>
        <div className="prestige-reward">
          <span>今回の満足</span><strong>{formatNumber(game.runSatisfaction)}</strong>
          <i>→</i><span>獲得できる救済印</span><strong>+{gain}</strong>
        </div>
        <p className="prestige-note">救済印による永久補正は、印が増えるほど緩やかに伸びます。現在はひとさわりと自動生産が+{virtueBonusPercent}%強化されています。</p>
        {gain <= 0 && <p className="prestige-warning">最初の再布教には今回の周回で累計{formatNumber(GAME_CONFIG.prestigeBaseRequirement)}満足が必要です。</p>}

        <section className="doctrine-section" aria-labelledby="doctrine-title">
          <header>
            <div><small>PERMANENT DOCTRINES</small><h3 id="doctrine-title">恒久教義</h3></div>
            <div className="doctrine-wallet"><span>使用可能</span><strong>{availableMarks}</strong><em> / 累計{game.virtueMarks}印</em></div>
          </header>
          <p>救済印で授かる効果は、再布教しても失われません。印を使っても累計印による基礎倍率は下がりません。</p>
          <div className="doctrine-grid">
            {DOCTRINES.map((doctrine) => {
              const purchased = game.purchasedDoctrineIds.includes(doctrine.id)
              const requirementsMet = areDoctrineRequirementsMet(game.purchasedDoctrineIds, doctrine)
              const canBuy = !purchased && requirementsMet && availableMarks >= doctrine.cost
              const requiredNames = (doctrine.requires ?? [])
                .map((id) => DOCTRINES.find((candidate) => candidate.id === id)?.name)
                .filter(Boolean)
                .join('・')
              return (
                <article className={`doctrine-card ${purchased ? 'purchased' : ''} ${requirementsMet ? '' : 'locked'}`} key={doctrine.id}>
                  <span className="doctrine-icon" aria-hidden="true">{purchased ? '済' : doctrine.icon}</span>
                  <div>
                    <h4>{doctrine.name}</h4>
                    <p>{doctrine.description}</p>
                    <em>{purchased ? doctrine.flavor : requirementsMet ? `救済印 ${doctrine.cost}` : `前提：${requiredNames}`}</em>
                  </div>
                  <button type="button" disabled={!canBuy} onClick={() => onPurchaseDoctrine(doctrine.id)}>
                    {purchased ? '取得済' : !requirementsMet ? '未解禁' : availableMarks >= doctrine.cost ? '授かる' : '印不足'}
                  </button>
                </article>
              )
            })}
          </div>
        </section>

        <div className="settings-actions">
          <button className="prestige-button" type="button" disabled={gain <= 0} onClick={() => {
            if (window.confirm(`設備と御利益を手放して再布教し、救済印を${gain}個獲得しますか？`)) onPrestige()
          }}>再布教する</button>
          <button className="secondary-button" type="button" onClick={onClose} autoFocus>まだ満たす</button>
        </div>
      </section>
    </div>
  )
}
