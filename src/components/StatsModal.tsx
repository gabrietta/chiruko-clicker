import type { GameState } from '../types/game'
import { getSpentVirtueMarks } from '../config/doctrines'
import { formatNumber } from '../utils/format'

interface StatsModalProps {
  game: GameState
  clickPower: number
  perSecond: number
  onClose: () => void
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}時間 ${minutes}分`
}

export const StatsModal = ({ game, clickPower, perSecond, onClose }: StatsModalProps) => {
  const availableMarks = game.virtueMarks - getSpentVirtueMarks(game.purchasedDoctrineIds)
  const rows = [
    ['現在の満足', `${formatNumber(game.satisfaction)} 満足`],
    ['累計獲得', `${formatNumber(game.totalSatisfaction)} 満足`],
    ['今回の周回', `${formatNumber(game.runSatisfaction)} 満足`],
    ['ひとさわり', `+${formatNumber(clickPower)}`],
    ['現在の毎秒生産', `+${formatNumber(perSecond)}`],
    ['過去最高の毎秒生産', `+${formatNumber(game.highestPerSecond)}`],
    ['手動でさわった回数', `${formatNumber(game.manualClicks)}回`],
    ['クリック最高コンボ', `${formatNumber(game.bestClickCombo)}コンボ`],
    ['購入した設備・御利益', `${formatNumber(game.totalPurchases)}個`],
    ['救済の欠片', `${formatNumber(game.luckyEventsClicked)}回・最大${game.maxBuffCombo}コンボ・連鎖完走${game.luckyChainsCompleted}回`],
    ['救済から得た満足', `${formatNumber(game.totalLuckyRewards)}満足`],
    ['体験した救済の種類', `${game.luckyEventTypesSeen.length}種類`],
    ['再布教', `${game.prestigeCount}回・救済印${game.virtueMarks}個（使用可能${availableMarks}）`],
    ['恒久教義', `${game.purchasedDoctrineIds.length}個`],
    ['記録されたプレイ時間', formatDuration(game.playSeconds)],
    ['留守番報酬', `${game.offlineSessions}回・最長${formatDuration(game.longestOfflineSeconds)}`],
    ['満足計画を始めた日', new Date(game.startedAt).toLocaleDateString('ja-JP')],
  ]

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card stats-modal" role="dialog" aria-modal="true" aria-labelledby="stats-title">
        <p className="modal-eyebrow">SATISFACTION CULT RECORDS</p>
        <h2 id="stats-title">満足教・活動記録</h2>
        <div className="stats-grid">
          {rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        <button className="secondary-button" type="button" onClick={onClose} autoFocus>ゲームに戻る</button>
      </section>
    </div>
  )
}
