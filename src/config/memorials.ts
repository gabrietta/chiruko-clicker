export interface MemorialDefinition {
  id: string
  achievementId: string
  name: string
  description: string
  imagePath: string
}

export const THANK_YOU_ACHIEVEMENT_ID = 'satisfaction-500-trillion'
export const THANK_YOU_SATISFACTION = 500_000_000_000_000
export const DEVOTION_ACHIEVEMENT_ID = 'satisfaction-5-kei'
export const DEVOTION_SATISFACTION = 50_000_000_000_000_000
export const WORLD_CULT_ACHIEVEMENT_ID = 'satisfaction-world-cult'
export const WORLD_CULT_SATISFACTION = 1_000_000_000_000_000_000_000_000

// 記念絵を増やすときは、この配列へ1項目追加します。
export const MEMORIALS: MemorialDefinition[] = [
  {
    id: 'thank-you-for-playing',
    achievementId: THANK_YOU_ACHIEVEMENT_ID,
    name: '教祖からの特別通信',
    description: '満足界の最深部から届いた、教祖直筆の極秘通信。',
    imagePath: '/assets/memorials/chiruko-thank-you.png',
  },
  {
    id: 'devoted-believer',
    achievementId: DEVOTION_ACHIEVEMENT_ID,
    name: '敬虔な信者、ですね',
    description: '満足の果てまで歩いた貴方へ、教祖から届いた親愛の証。',
    imagePath: '/assets/memorials/chiruko-5kei.png',
  },
  {
    id: 'world-satisfaction-cult',
    achievementId: WORLD_CULT_ACHIEVEMENT_ID,
    name: '掌中の満足世界',
    description: '世界を満足で包みきった貴方へ。教祖が星々の先まで見届ける、宇宙布教の証。',
    imagePath: '/assets/memorials/chiruko-manzokukyou.png',
  },
]

export const getMemorialRewardsForAchievement = (achievementId: string) =>
  MEMORIALS.filter((memorial) => memorial.achievementId === achievementId)
