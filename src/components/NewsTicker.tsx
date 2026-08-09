import { useEffect, useMemo, useState } from 'react'
import type { GameState } from '../types/game'
import { getActiveSeason } from '../config/seasons'
import { formatNumber } from '../utils/format'

interface NewsTickerProps {
  game: GameState
  perSecond: number
}

export const NewsTicker = ({ game, perSecond }: NewsTickerProps) => {
  const [messageIndex, setMessageIndex] = useState(0)

  const messages = useMemo(() => {
    const result = [
      '満足通信：教祖、「今日の小さな満足に感謝いたしましょう」と机のすみから声明。',
      '下北沢の古着屋で黒と金の服が品薄に。満足教との関連は不明。',
      'ネオサイタマ支部、ヤンヤンつけボーを暫定的な聖菓に認定。',
      '教祖の年齢は本日も自称17歳。関係者は静かにうなずく。',
      '速報：魅力的なおでこへの過度な連打に注意喚起。',
    ]

    if (game.manualClicks >= 50) result.push(`市民、教祖をすでに${formatNumber(game.manualClicks)}回なでたと供述。`)
    if (perSecond >= 1) result.push(`満足指数、毎秒${formatNumber(perSecond)}を突破。自動化の波が押し寄せる。`)
    if ((game.inventory['desktop-accessory'] ?? 0) > 0) result.push('PCのすみで小さな労働者を目撃。タスクバー付近へ逃走。')
    if ((game.inventory['sora-2'] ?? 0) > 0) result.push('Sora2、満足教の活動記録を同期音声つき大作映像へ。教義の場面だけ生成に失敗。')
    if ((game.inventory.believer ?? 0) > 0) result.push(`満足教の信者、現在${formatNumber(game.inventory.believer)}名。教義は引き続き策定中。`)
    if ((game.inventory.altar ?? 0) > 0) result.push('祭壇から謎の稼働音。荘厳さと生産効率の両立に成功か。')
    if ((game.inventory['giant-statue'] ?? 0) > 0) result.push('巨大ちる子像、ネオサイタマの新たな待ち合わせ場所に。')
    if ((game.inventory['ramen-sanctum'] ?? 0) > 0) result.push('深夜のラーメン聖堂、午前11時から営業していることが判明。')
    if ((game.inventory['cult-broadcast'] ?? 0) > 0) result.push('満足教広報局、「内容は後ほど」とする特別番組を24時間放送。')
    if ((game.inventory['neo-cathedral'] ?? 0) > 0) result.push('ネオサイタマ大聖堂が完成。所在地を尋ねる声には沈黙。')
    if ((game.inventory['dimension-gate'] ?? 0) > 0) result.push('次元ゲートの向こうから「こちらはもう満足です」との通信。')
    if ((game.inventory['cosmic-chiruko'] ?? 0) > 0) result.push('宇宙ちる子布教船が出航。帰還予定は教義と同じく未定。')
    if ((game.inventory['sora-3'] ?? 0) > 0) result.push('架空のSora3、布教映像から布教世界そのものを生成したとの未確認情報。')
    if (game.luckyEventsClicked > 0) result.push(`きらめく「救済の欠片」、これまでに${game.luckyEventsClicked}回確保。`)
    if (game.purchasedUpgradeIds.length > 0) result.push(`御利益の授与、累計${game.purchasedUpgradeIds.length}件。ありがたさの測定は難航。`)
    if (game.prestigeCount > 0) result.push(`満足世界、これまでに${game.prestigeCount}回再構築。住民は「前より速い」と証言。`)
    result.push(`${getActiveSeason().name}を開催中。季節限定の補正は自動で適用されます。`)
    return result
  }, [game.inventory, game.luckyEventsClicked, game.manualClicks, game.prestigeCount, game.purchasedUpgradeIds.length, perSecond])

  useEffect(() => {
    const timer = window.setInterval(
      () => setMessageIndex((current) => current + 1),
      7_500,
    )
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="news-ticker" aria-live="polite">
      <span className="news-label"><i aria-hidden="true" /> 満足通信</span>
      <div className="news-window">
        <p key={messageIndex}>{messages[messageIndex % messages.length]}</p>
      </div>
      <span className="news-code">MSK-7144</span>
    </div>
  )
}
