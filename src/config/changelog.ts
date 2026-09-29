export interface ChangelogEntry {
  date: string
  title: string
  items: readonly string[]
}

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: '2026-09-29',
    title: '満足宇宙研究所を開設',
    items: ['Sora4を50個集めると、3系統12段階の恒久研究が解禁', '研究中は救済の欠片をつかまえて観測時間を短縮可能', 'スマートフォンでも上部の欠片回収ボタンから参加可能'],
  },
  {
    date: '2026-08-25',
    title: '銀河への道のりを拡張',
    items: ['終盤に新しい設備を3種類追加', '設定から更新履歴を確認できるようにしました'],
  },
  {
    date: '2026-08-24',
    title: '見やすさとちる子の動き',
    items: ['説明文の文字を読みやすく調整', 'ちる子スキンに表情・寝息アニメーションを追加'],
  },
  {
    date: '2026-08-19',
    title: '居眠りミニちる子の修正',
    items: ['起こしても満足が戻らない場合がある不具合を修正', '不具合調査用データの書き出しを追加'],
  },
] as const
