import type { WorshipPolicy } from '../types/game'

export interface WorshipPolicyDefinition {
  id: WorshipPolicy
  name: string
  description: string
  flavor: string
  clickMultiplier: number
  productionMultiplier: number
}

export const WORSHIP_POLICIES: WorshipPolicyDefinition[] = [
  {
    id: 'balanced',
    name: '穏やかな礼拝',
    description: 'ひとさわりも自動生産も、いつもの調子。',
    flavor: '迷ったら、まずは穏やかに。',
    clickMultiplier: 1,
    productionMultiplier: 1,
  },
  {
    id: 'hands-on',
    name: 'おでこ奉仕',
    description: 'ひとさわりが10%強化される代わりに、自動生産が5%下がる。',
    flavor: '手を動かす信仰にも、休憩は必要ですわ。',
    clickMultiplier: 1.1,
    productionMultiplier: 0.95,
  },
  {
    id: 'vigil',
    name: '夜間見守り',
    description: '自動生産が10%強化される代わりに、ひとさわりが5%下がる。',
    flavor: '眠っているあいだも、机のすみを見守ります。',
    clickMultiplier: 0.95,
    productionMultiplier: 1.1,
  },
]

export const getWorshipPolicy = (id: WorshipPolicy) =>
  WORSHIP_POLICIES.find((policy) => policy.id === id) ?? WORSHIP_POLICIES[0]

export const isWorshipPolicy = (value: unknown): value is WorshipPolicy =>
  typeof value === 'string' && WORSHIP_POLICIES.some((policy) => policy.id === value)
