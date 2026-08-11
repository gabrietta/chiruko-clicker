import { getDailyOmen, getOmenProgress } from '../config/omens'
import { WORSHIP_POLICIES } from '../config/worshipPolicies'
import { getSleepyChirukoSlots } from '../game/calculations'
import { GAME_CONFIG } from '../config/gameConfig'
import type { GameState, WorshipPolicy } from '../types/game'
import { formatNumber } from '../utils/format'
import { assetPath } from '../utils/assetPath'

interface SideSystemsPanelProps {
  game: GameState
  perSecond: number
  onClaimOmen: () => void
  onSetWorshipPolicy: (policy: WorshipPolicy) => void
  onSendSleepyChiruko: () => void
  onWakeSleepyChiruko: () => void
}

export const SideSystemsPanel = ({
  game,
  perSecond,
  onClaimOmen,
  onSetWorshipPolicy,
  onSendSleepyChiruko,
  onWakeSleepyChiruko,
}: SideSystemsPanelProps) => {
  const omen = getDailyOmen()
  const omenProgress = Math.min(omen.target, getOmenProgress(game, omen))
  const omenReady = !game.dailyOmenCompleted && omenProgress >= omen.target
  const sleepySlots = getSleepyChirukoSlots(game.inventory)
  const sleepyReady = game.sleepyChirukos > 0
  const sleepyPercent = sleepyReady
    ? Math.min(100, (game.sleepyBank / Math.max(1, perSecond * GAME_CONFIG.sleepyChiruko.bankCapSeconds)) * 100)
    : 0

  return (
    <section className="side-systems-panel" aria-label="追加の満足システム">
      <article className="side-system-card omen-system-card">
        <div className="side-system-heading">
          <span className="side-system-icon" aria-hidden="true">告</span>
          <div><small>DAILY OMEN</small><h3>教祖のお告げ</h3></div>
          <span className="side-system-count">達成 {game.dailyOmenCompletions}</span>
        </div>
        <p className="side-system-description">{omen.name}：{omen.description}</p>
        <div className="side-system-progress"><span style={{ width: `${(omenProgress / omen.target) * 100}%` }} /></div>
        <div className="side-system-meta"><span>{formatNumber(omenProgress)} / {formatNumber(omen.target)}</span><em>{game.dailyOmenCompleted ? '本日は達成済み' : omen.flavor}</em></div>
        <button type="button" className="side-system-action" disabled={!omenReady} onClick={onClaimOmen}>{game.dailyOmenCompleted ? '明日のお告げを待つ' : omenReady ? 'お告げを受け取る' : '進行中'}</button>
      </article>

      <article className="side-system-card policy-system-card">
        <div className="side-system-heading">
          <span className="side-system-icon" aria-hidden="true">方</span>
          <div><small>WORSHIP POLICY</small><h3>礼拝方針</h3></div>
          <span className="side-system-count">変更 {game.worshipPolicyChanges}</span>
        </div>
        <p className="side-system-description">その日の遊び方に合わせて、ひとつだけ選べます。</p>
        <div className="policy-options">
          {WORSHIP_POLICIES.map((policy) => (
            <button type="button" key={policy.id} className={game.worshipPolicy === policy.id ? 'selected' : ''} onClick={() => onSetWorshipPolicy(policy.id)}>
              <strong>{policy.name}</strong><span>{policy.id === 'balanced' ? '均衡' : policy.id === 'hands-on' ? 'クリック寄り' : '放置寄り'}</span>
            </button>
          ))}
        </div>
        <p className="side-system-flavor">{WORSHIP_POLICIES.find((policy) => policy.id === game.worshipPolicy)?.description}</p>
      </article>

      <article className="side-system-card sleepy-system-card">
        <div className="side-system-heading">
          <span className="side-system-icon sleepy-system-icon" aria-hidden="true"><img src={assetPath('/assets/characters/chiruko-sleep.png')} alt="" /></span>
          <div><small>DESK CORNER</small><h3>居眠りミニちる子</h3></div>
          <span className="side-system-count">{game.sleepyChirukos} / {sleepySlots || 0}人</span>
        </div>
        <p className="side-system-description">設備25個から解放。眠っているあいだ、少しだけ満足を預かります。</p>
        <div className="sleepy-figures" aria-label={`居眠りミニちる子${game.sleepyChirukos}人`}>
          {Array.from({ length: Math.max(1, sleepySlots) }, (_, index) => <span className={index < game.sleepyChirukos ? 'active' : ''} key={index}><img src={assetPath('/assets/characters/chiruko-sleep.png')} alt="" /></span>)}
        </div>
        <div className="side-system-progress sleepy-progress"><span style={{ width: `${sleepyPercent}%` }} /></div>
        <div className="side-system-meta"><span>預かり中 {formatNumber(game.sleepyBank)} 満足</span><em>起こすと少し多めに返ります</em></div>
        <div className="sleepy-actions">
          <button type="button" className="side-system-action" disabled={sleepySlots === 0 || game.sleepyChirukos >= sleepySlots} onClick={onSendSleepyChiruko}>{sleepySlots === 0 ? '設備25個で解放' : '1人寝かせる'}</button>
          <button type="button" className="side-system-action sleepy-wake-action" disabled={!sleepyReady} onClick={onWakeSleepyChiruko}>1人起こす</button>
        </div>
      </article>
    </section>
  )
}
