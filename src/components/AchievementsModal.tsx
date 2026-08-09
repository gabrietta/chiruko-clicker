import { ACHIEVEMENTS } from '../config/achievements'
import {
  CHARACTER_SKINS,
  getCosmeticRewardsForAchievement,
  isCosmeticUnlocked,
  STAGE_THEMES,
} from '../config/cosmetics'
import { getDoctrineEffect } from '../config/doctrines'
import { getMemorialRewardsForAchievement, MEMORIALS } from '../config/memorials'
import { getAchievementProgress } from '../game/achievements'
import type { GameState } from '../types/game'
import { formatNumber } from '../utils/format'
import { assetPath } from '../utils/assetPath'
import { useState } from 'react'

interface AchievementsModalProps {
  game: GameState
  onClose: () => void
  onSelectCosmetic: (kind: 'character' | 'theme', cosmeticId: string) => void
  onOpenMemorial: (memorialId: string) => void
}

const CATEGORY_LABELS = {
  all: 'すべて',
  satisfaction: '累計満足',
  clicks: 'クリック',
  facilities: '設備',
  miracles: '救済',
  prestige: '再布教',
  time: '時間・放置',
} as const

type AchievementCategory = keyof typeof CATEGORY_LABELS

const getAchievementCategory = (metric: string): AchievementCategory => {
  if (metric === 'totalSatisfaction') return 'satisfaction'
  if (metric === 'manualClicks' || metric === 'bestClickCombo') return 'clicks'
  if (metric === 'totalOwned' || metric === 'uniqueItems' || metric === 'itemOwned' || metric === 'upgradesOwned') return 'facilities'
  if (metric === 'luckyEvents' || metric === 'luckyCombo' || metric === 'luckyChains' || metric === 'luckyVarieties') return 'miracles'
  if (metric === 'prestigeCount' || metric === 'virtueMarks' || metric === 'doctrinesOwned') return 'prestige'
  if (metric === 'playSeconds' || metric === 'offlineSessions' || metric === 'longestOffline') return 'time'
  return 'facilities'
}

export const AchievementsModal = ({ game, onClose, onSelectCosmetic, onOpenMemorial }: AchievementsModalProps) => {
  const [category, setCategory] = useState<AchievementCategory>('all')
  const unlocked = new Set(game.unlockedAchievementIds)
  const count = unlocked.size
  const bonusPerAchievement = getDoctrineEffect(
    game.purchasedDoctrineIds,
    'achievementBonusMultiplier',
  )

  return (
    <div className="modal-backdrop achievements-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="achievements-modal" role="dialog" aria-modal="true" aria-labelledby="achievements-title">
        <header className="achievements-modal-header">
          <div>
            <p className="modal-eyebrow">SATISFACTION CULT ARCHIVES</p>
            <h2 id="achievements-title">満足教・徳目図鑑</h2>
            <p>解除した実績1個につき、自動生産が{bonusPerAchievement}%強化されます。</p>
          </div>
          <div className="achievement-total">
            <span>解除済み</span>
            <strong>{count}<small> / {ACHIEVEMENTS.length}</small></strong>
            <em>徳補正 +{count * bonusPerAchievement}%</em>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="実績図鑑を閉じる">×</button>
        </header>

        <div className="achievement-progress-track" aria-hidden="true">
          <span style={{ width: `${(count / ACHIEVEMENTS.length) * 100}%` }} />
        </div>

        <nav className="achievement-category-tabs" aria-label="実績カテゴリ">
          {(Object.keys(CATEGORY_LABELS) as AchievementCategory[]).map((key) => (
            <button type="button" className={category === key ? 'selected' : ''} onClick={() => setCategory(key)} key={key}>
              {CATEGORY_LABELS[key]}
              {key !== 'all' && <small>{ACHIEVEMENTS.filter((achievement) => getAchievementCategory(achievement.metric) === key).length}</small>}
            </button>
          ))}
        </nav>

        <section className="virtue-rewards" aria-labelledby="virtue-rewards-title">
          <header><div><small>VIRTUE REWARDS</small><h3 id="virtue-rewards-title">徳のご褒美</h3></div><p>実績で解放した姿と観測室を選べます。</p></header>
          <div className="cosmetic-groups">
            <div className="cosmetic-group">
              <strong>ちる子の姿</strong>
              <div>
                {CHARACTER_SKINS.map((skin) => {
                  const unlockedSkin = isCosmeticUnlocked(game, skin)
                  const selected = game.selectedCharacterSkin === skin.id
                  return (
                    <button
                      type="button"
                      className={selected ? 'selected' : ''}
                      disabled={!unlockedSkin}
                      onClick={() => onSelectCosmetic('character', skin.id)}
                      title={unlockedSkin ? skin.description : '対応する実績で解放'}
                      key={skin.id}
                    >
                      {skin.imagePath && <img src={assetPath(skin.imagePath)} alt="" />}
                      <span>{unlockedSkin ? skin.name : '？？？'}</span>
                      <em>{selected ? '使用中' : unlockedSkin ? '選ぶ' : '未解放'}</em>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="cosmetic-group theme-group">
              <strong>観測室</strong>
              <div>
                {STAGE_THEMES.map((theme) => {
                  const unlockedTheme = isCosmeticUnlocked(game, theme)
                  const selected = game.selectedStageTheme === theme.id
                  return (
                    <button
                      type="button"
                      className={`theme-swatch theme-${theme.id} ${selected ? 'selected' : ''}`}
                      disabled={!unlockedTheme}
                      onClick={() => onSelectCosmetic('theme', theme.id)}
                      title={unlockedTheme ? theme.description : '対応する実績で解放'}
                      key={theme.id}
                    >
                      <i aria-hidden="true" />
                      <span>{unlockedTheme ? theme.name : '？？？'}</span>
                      <em>{selected ? '使用中' : unlockedTheme ? '選ぶ' : '未解放'}</em>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="memorial-gallery">
            <strong>秘蔵記録</strong>
            <div>
              {MEMORIALS.map((memorial) => {
                const isUnlocked = unlocked.has(memorial.achievementId)
                return (
                  <button
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => onOpenMemorial(memorial.id)}
                    title={isUnlocked ? memorial.description : '対応する実績で解放'}
                    key={memorial.id}
                  >
                    {isUnlocked
                      ? <img src={assetPath(memorial.imagePath)} alt="" />
                      : <span className="memorial-placeholder" aria-hidden="true">?</span>}
                    <span>{isUnlocked ? memorial.name : '？？？？？'}</span>
                    <em>{isUnlocked ? 'もう一度見る' : '未解放'}</em>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <div className="achievement-grid">
          {ACHIEVEMENTS.filter((achievement) => category === 'all' || getAchievementCategory(achievement.metric) === category).map((achievement) => {
            const isUnlocked = unlocked.has(achievement.id)
            const progress = Math.min(getAchievementProgress(game, achievement), achievement.target)
            const isSecret = achievement.hidden && !isUnlocked
            const percent = Math.min(100, (progress / achievement.target) * 100)
            const rewards = getCosmeticRewardsForAchievement(achievement.id)
            const memorialRewards = getMemorialRewardsForAchievement(achievement.id)

            return (
              <article className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`} key={achievement.id}>
                <div className="achievement-icon" aria-hidden="true">{isSecret ? '?' : achievement.icon}</div>
                <div className="achievement-card-copy">
                  <h3>{isSecret ? '？？？？？' : achievement.name}</h3>
                  <p>{isSecret ? '条件は満足の霧に包まれている。' : achievement.description}</p>
                  <em>{isUnlocked ? achievement.flavor : `${formatNumber(progress)} / ${formatNumber(achievement.target)}`}</em>
                  {!isSecret && rewards.length > 0 && <span className="achievement-cosmetic-reward">ご褒美：{rewards.map((reward) => reward.name).join('・')}</span>}
                  {isUnlocked && memorialRewards.length > 0 && <span className="achievement-cosmetic-reward">秘蔵記録「{memorialRewards.map((reward) => reward.name).join('・')}」を受領</span>}
                </div>
                <div className="achievement-card-progress" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
                {isUnlocked && <span className="achievement-stamp" aria-hidden="true">解除</span>}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
