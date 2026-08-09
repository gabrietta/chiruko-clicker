import type { DoctrineDefinition, DoctrineEffectType } from '../types/game'

// 再布教後も残る恒久強化です。救済印は累計数を保ったまま、未使用分だけを消費します。
export const DOCTRINES: DoctrineDefinition[] = [
  {
    id: 'gentle-hand',
    name: 'やさしい御手',
    description: 'ひとさわりの獲得量が1.5倍になる。',
    flavor: '力ではなく、慈しみで満たすべし。',
    icon: '撫',
    cost: 1,
    effectType: 'clickMultiplier',
    effectValue: 1.5,
  },
  {
    id: 'unceasing-prayer',
    name: '絶えない祈り',
    description: 'すべての自動生産が1.25倍になる。',
    flavor: '祈りは自動化されても、ありがたさは変わりません。',
    icon: '祈',
    cost: 1,
    effectType: 'productionMultiplier',
    effectValue: 1.25,
  },
  {
    id: 'long-vigil',
    name: '長い留守番',
    description: 'オフライン収益の上限が8時間から16時間になる。',
    flavor: '机のすみは、留守のあいだも静かに働いています。',
    icon: '留',
    cost: 2,
    effectType: 'offlineCapMultiplier',
    effectValue: 2,
    requires: ['unceasing-prayer'],
  },
  {
    id: 'beckoning-star',
    name: '招く星印',
    description: '救済の欠片が20%早く現れる。',
    flavor: '見つけるのではありません。向こうから来てもらうのです。',
    icon: '星',
    cost: 3,
    effectType: 'luckyFrequencyMultiplier',
    effectValue: 0.8,
    requires: ['gentle-hand'],
  },
  {
    id: 'lingering-miracle',
    name: '長引く奇跡',
    description: '救済効果の持続時間が25%長くなる。',
    flavor: '奇跡にも、ほんの少しだけ延長をお願いしました。',
    icon: '刻',
    cost: 4,
    effectType: 'luckyDurationMultiplier',
    effectValue: 1.25,
    requires: ['beckoning-star'],
  },
  {
    id: 'echoing-virtue',
    name: '徳の共鳴',
    description: '実績1個ごとの自動生産ボーナスが1%から2%になる。',
    flavor: '埋まった杯の数だけ、世界がよく響きます。',
    icon: '徳',
    cost: 5,
    effectType: 'achievementBonusMultiplier',
    effectValue: 2,
    requires: ['unceasing-prayer'],
  },
  {
    id: 'first-offering',
    name: '最初の寄進',
    description: '再布教後、5,000満足を持って始められる。',
    flavor: 'ゼロからではありません。お気持ちからです。',
    icon: '初',
    cost: 6,
    effectType: 'startingSatisfaction',
    effectValue: 5_000,
    requires: ['long-vigil'],
  },
  {
    id: 'satisfaction-network',
    name: '満足教義ネットワーク',
    description: 'すべての自動生産がさらに1.75倍になる。',
    flavor: '教義は曖昧でも、回線だけは太く。',
    icon: '網',
    cost: 10,
    effectType: 'productionMultiplier',
    effectValue: 1.75,
    requires: ['lingering-miracle', 'echoing-virtue'],
  },
]

export const getDoctrineEffect = (
  purchasedIds: string[],
  effectType: DoctrineEffectType,
  fallback = 1,
) => DOCTRINES.reduce((value, doctrine) => (
  doctrine.effectType === effectType && purchasedIds.includes(doctrine.id)
    ? effectType === 'startingSatisfaction'
      ? value + doctrine.effectValue
      : value * doctrine.effectValue
    : value
), effectType === 'startingSatisfaction' ? 0 : fallback)

export const getSpentVirtueMarks = (purchasedIds: string[]) =>
  DOCTRINES.reduce((total, doctrine) => (
    purchasedIds.includes(doctrine.id) ? total + doctrine.cost : total
  ), 0)

export const areDoctrineRequirementsMet = (purchasedIds: string[], doctrine: DoctrineDefinition) =>
  (doctrine.requires ?? []).every((id) => purchasedIds.includes(id))
