import type { UpgradeDefinition } from '../types/game'

// 御利益（買い切りアップグレード）は、この配列へ追加します。
export const UPGRADES: UpgradeDefinition[] = [
  { id: 'petting-license', name: 'なでなで免許皆伝', description: 'ひとさわりの効果が2倍になる。', flavor: '優しく、しかし確実に。', cost: 120, icon: '撫', effectType: 'clickMultiplier', effectValue: 2, unlock: { type: 'itemOwned', itemId: 'petting', target: 5 } },
  { id: 'double-dip', name: '聖菓二度づけ', description: 'あまいおやつの生産が2倍になる。', flavor: '衛生面は教義で解決。', cost: 650, icon: '菓', effectType: 'itemProductionMultiplier', effectValue: 2, itemId: 'sweet-treat', unlock: { type: 'itemOwned', itemId: 'sweet-treat', target: 5 } },
  { id: 'premium-futon', name: '雲上ふかふか加工', description: 'ふかふかおふとんの生産が2倍になる。', flavor: '起きる理由が見つからない。', cost: 3_500, icon: '眠', effectType: 'itemProductionMultiplier', effectValue: 2, itemId: 'soft-futon', unlock: { type: 'itemOwned', itemId: 'soft-futon', target: 5 } },
  { id: 'doll-certified', name: '教祖直筆の認定印', description: 'ちる子ちゃん人形の生産が2倍になる。', flavor: '認定印はたぶん本人の字。', cost: 18_000, icon: '印', effectType: 'itemProductionMultiplier', effectValue: 2, itemId: 'chiruko-doll', unlock: { type: 'itemOwned', itemId: 'chiruko-doll', target: 5 } },
  { id: 'desktop-autostart', name: 'スタートアップ登録', description: 'デスクトップアクセサリの生産が2倍になる。', flavor: 'PC起動とともに救済開始。', cost: 95_000, icon: '起', effectType: 'itemProductionMultiplier', effectValue: 2, itemId: 'desktop-accessory', unlock: { type: 'itemOwned', itemId: 'desktop-accessory', target: 5 } },
  { id: 'doctrine-v1', name: '教義 ver.0.1', description: 'すべての自動生産が1.25倍になる。', flavor: '内容は「満足は大事」の一行だけ。', cost: 240_000, icon: '典', effectType: 'globalProductionMultiplier', effectValue: 1.25, unlock: { type: 'totalSatisfaction', target: 100_000 } },
  { id: 'believer-training', name: '信者研修ビデオ', description: '満足教の信者の生産が2倍になる。', flavor: '全12巻・途中に休憩あり。', cost: 680_000, icon: '習', effectType: 'itemProductionMultiplier', effectValue: 2, itemId: 'believer', unlock: { type: 'itemOwned', itemId: 'believer', target: 5 } },
  { id: 'altar-led', name: '祭壇LED装飾', description: '満足教の祭壇の生産が2倍になる。', flavor: '荘厳さは光量に比例する。', cost: 4_200_000, icon: '光', effectType: 'itemProductionMultiplier', effectValue: 2, itemId: 'altar', unlock: { type: 'itemOwned', itemId: 'altar', target: 3 } },
  { id: 'giant-polish', name: '巨大像つや出し奉仕', description: '巨大ちる子像の生産が2倍になる。', flavor: 'おでこだけ異様に輝く。', cost: 32_000_000, icon: '磨', effectType: 'itemProductionMultiplier', effectValue: 2, itemId: 'giant-statue', unlock: { type: 'itemOwned', itemId: 'giant-statue', target: 2 } },
  { id: 'touch-ritual', name: '連打の儀式', description: 'ひとさわりの効果がさらに3倍になる。', flavor: '腱鞘炎は徳ではありません。', cost: 1_500_000, icon: '連', effectType: 'clickMultiplier', effectValue: 3, unlock: { type: 'totalSatisfaction', target: 750_000 } },
  { id: 'neo-saitama-network', name: 'ネオサイタマ布教網', description: 'すべての自動生産が1.5倍になる。', flavor: '住所は非公開、回線は高速。', cost: 9_500_000, icon: '網', effectType: 'globalProductionMultiplier', effectValue: 1.5, unlock: { type: 'totalSatisfaction', target: 5_000_000 } },
  { id: 'second-gospel', name: '第二満足福音', description: 'すべての自動生産が1.75倍になる。', flavor: '周回した者だけが読める余白。', cost: 25_000_000, icon: '福', effectType: 'globalProductionMultiplier', effectValue: 1.75, unlock: { type: 'prestige', target: 1 } },
]
