import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { playClickSound, playEffectSound, playVoice, unlockAudio } from './audio/audioManager'
import { AchievementsModal } from './components/AchievementsModal'
import { MainStage } from './components/MainStage'
import { MemorialModal } from './components/MemorialModal'
import { NewsTicker } from './components/NewsTicker'
import { OfflineModal } from './components/OfflineModal'
import { PrestigeModal } from './components/PrestigeModal'
import { SettingsModal } from './components/SettingsModal'
import { Shop } from './components/Shop'
import { StatsModal } from './components/StatsModal'
import { WorldPanel } from './components/WorldPanel'
import { ACHIEVEMENTS } from './config/achievements'
import { GAME_CONFIG, SHOP_ITEMS } from './config/gameConfig'
import { getActiveSeason } from './config/seasons'
import { UPGRADES } from './config/upgrades'
import { DOCTRINES, getDoctrineEffect } from './config/doctrines'
import { getWorshipPolicy } from './config/worshipPolicies'
import { MEMORIALS } from './config/memorials'
import {
  getAchievementMultiplier,
  getGlobalProductionUpgradeMultiplier,
  getItemCost,
  getVirtueMarkMultiplier,
} from './game/calculations'
import { useAudioSettings } from './hooks/useAudioSettings'
import { useGame } from './hooks/useGame'
import { formatNumber } from './utils/format'
import { clearDiagnosticLogs, diagnosticsFilename, logDiagnostic, makeDiagnostics } from './game/diagnostics'
import { getSleepyChirukoSlots } from './game/calculations'

function App() {
  const {
    game, clickPower, satisfactionPerSecond, offlineReport, saveLabel, latestAchievement,
    luckyEventVisible, activeBuffs, chainRemaining, clickCharacter, purchaseItem, purchaseUpgrade,
    purchaseDoctrine, selectCosmetic, claimLuckyEvent, prestige, dismissOfflineReport,
    dismissLatestAchievement, markMemorialViewed, resetGame, resumeFromAnomaly, exportSave, importSave,
    claimDailyOmen, setWorshipPolicy, sendSleepyChiruko, wakeSleepyChiruko,
  } = useGame()
  const { audioPreferences, updateAudioPreferences } = useAudioSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [prestigeOpen, setPrestigeOpen] = useState(false)
  const [activeMemorialId, setActiveMemorialId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [lastPurchasedId, setLastPurchasedId] = useState<string | null>(null)
  const season = getActiveSeason()
  useEffect(() => {
    const onError = (event: ErrorEvent) => { let source = event.filename; try { const url = new URL(source); source = `${url.origin}${url.pathname}` } catch { source = source.slice(0, 500) }; logDiagnostic('window-error', 'runtime', { message: event.message, source, line: event.lineno }, 'error') }
    const onRejection = (event: PromiseRejectionEvent) => logDiagnostic('unhandled-rejection', 'runtime', event.reason, 'error')
    window.addEventListener('error', onError); window.addEventListener('unhandledrejection', onRejection)
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection) }
  }, [])
  const exportDiagnostics = async (): Promise<'success' | 'cancel' | 'failure'> => {
    try {
      logDiagnostic('diagnostics-export-request', 'diagnostics')
      const data = makeDiagnostics(game, { productionPerSecond: satisfactionPerSecond, clickPower, totalEquipment: Object.values(game.inventory).reduce((sum, count) => sum + count, 0), sleepySlots: getSleepyChirukoSlots(game.inventory) })
      const text = JSON.stringify(data, null, 2); const filename = diagnosticsFilename(); const file = new File([text], filename, { type: 'application/json' })
      const share = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean; share?: (data: { files: File[]; title: string }) => Promise<void> }
      if (share.canShare?.({ files: [file] }) && share.share) { try { await share.share({ files: [file], title: 'ちる子診断データ' }); logDiagnostic('diagnostics-export-success', 'diagnostics', { method: 'share' }); return 'success' } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return 'cancel' } }
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.style.display = 'none'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      logDiagnostic('diagnostics-export-success', 'diagnostics', { method: 'download' }); return 'success'
    } catch (error) { logDiagnostic('diagnostics-export-failure', 'diagnostics', error, 'error'); return 'failure' }
  }

  useEffect(() => {
    if (!latestAchievement) return
    playEffectSound('achievement')
    const timer = window.setTimeout(dismissLatestAchievement, 4200)
    return () => window.clearTimeout(timer)
  }, [dismissLatestAchievement, latestAchievement])

  useEffect(() => {
    if (offlineReport || activeMemorialId) return
    const unviewedMemorial = MEMORIALS.find((memorial) =>
      game.unlockedAchievementIds.includes(memorial.achievementId) &&
      !game.viewedMemorialIds.includes(memorial.id),
    )
    if (unviewedMemorial) setActiveMemorialId(unviewedMemorial.id)
  }, [activeMemorialId, game.unlockedAchievementIds, game.viewedMemorialIds, offlineReport])

  const nextGoal = useMemo(() => SHOP_ITEMS.map((item) => ({ item, cost: getItemCost(item, game.inventory[item.id] ?? 0) }))
    .filter(({ cost }) => cost > game.satisfaction).sort((a, b) => a.cost - b.cost)[0] ?? null,
  [game.inventory, game.satisfaction])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }

  const handleCharacterClick = () => {
    unlockAudio()
    playClickSound()
    return clickCharacter()
  }

  const handlePurchase = (itemId: string, quantity: number) => {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId)
    if (!item || !purchaseItem(itemId, quantity)) return
    playEffectSound('purchase')
    playVoice('お迎え、ありがとうございますわ。')
    setLastPurchasedId(itemId)
    showToast(`${item.name}を${quantity}個お迎えしました`)
    window.setTimeout(() => setLastPurchasedId(null), 460)
  }

  const handleUpgrade = (upgradeId: string) => {
    const upgrade = UPGRADES.find((candidate) => candidate.id === upgradeId)
    if (!upgrade || !purchaseUpgrade(upgradeId)) return
    playEffectSound('achievement')
    playVoice('御利益を授けましょう。')
    showToast(`御利益「${upgrade.name}」を授かりました`)
  }

  const handleDoctrine = (doctrineId: string) => {
    const doctrine = DOCTRINES.find((candidate) => candidate.id === doctrineId)
    if (!doctrine || !purchaseDoctrine(doctrineId)) return
    playEffectSound('achievement')
    playVoice('この教義は、次の世界にも残りますわ。')
    showToast(`恒久教義「${doctrine.name}」を授かりました`)
  }

  const handleLuckyEvent = () => {
    const result = claimLuckyEvent()
    if (!result.message) return
    playEffectSound('lucky')
    showToast(result.message)
  }

  const handlePrestige = () => {
    const gain = prestige()
    if (gain <= 0) return
    playEffectSound('prestige')
    playVoice('もう一度、世界を満たしましょう。')
    setPrestigeOpen(false)
    showToast(`再布教！ 救済印を${gain}個獲得しました`)
  }

  const achievementCount = game.unlockedAchievementIds.length
  const achievementPercent = Math.round((achievementCount / ACHIEVEMENTS.length) * 100)
  const achievementMultiplier = getAchievementMultiplier(
    achievementCount,
    game.purchasedDoctrineIds,
  )
  const coreProductionMultiplier = season.productionMultiplier *
    getVirtueMarkMultiplier(game.virtueMarks) *
    getDoctrineEffect(game.purchasedDoctrineIds, 'productionMultiplier') *
    getGlobalProductionUpgradeMultiplier(game.purchasedUpgradeIds) *
    getWorshipPolicy(game.worshipPolicy).productionMultiplier

  return (
    <div className="app-shell busy-edition" onPointerDown={unlockAudio}>
      <header className="top-bar">
        <div className="brand-lockup" aria-label={GAME_CONFIG.title}><span className="brand-mark" aria-hidden="true">✦</span><div><p className="brand-kicker">ZANNEN-IN CHIRUKO · SATISFACTION CULT</p><h1>{GAME_CONFIG.title}</h1></div></div>
        <div className="header-actions">
          <button className="achievement-header-button" type="button" onClick={() => setAchievementsOpen(true)} aria-label={`実績図鑑を開く。${achievementCount}/${ACHIEVEMENTS.length}解除済み`}><span className="achievement-ring" style={{ '--progress': `${achievementPercent * 3.6}deg` } as React.CSSProperties}><b aria-hidden="true">杯</b></span><span><small>実績</small><strong>{achievementCount}/{ACHIEVEMENTS.length}</strong></span></button>
          <button className="sound-quick-button" type="button" onClick={() => updateAudioPreferences({ masterEnabled: !audioPreferences.masterEnabled })} aria-label={audioPreferences.masterEnabled ? 'すべての音を消す' : '音を有効にする'} title={audioPreferences.masterEnabled ? '音あり' : 'ミュート'}>{audioPreferences.masterEnabled ? '♪' : '×'}</button>
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="設定を開く" title="設定"><span aria-hidden="true">⚙</span></button>
        </div>
      </header>

      <NewsTicker game={game} perSecond={satisfactionPerSecond} />

      {game.anomalyFrozen && (
        <aside className="anomaly-warning" role="alert">
          <span className="anomaly-warning-mark" aria-hidden="true">!</span>
          <div>
            <strong>ちる子からの安全確認です（BANではありません）</strong>
            <p>{game.anomalyReason || '満足の流れに不自然な揺らぎを感じました。'}</p>
            <small>セーブデータは消えていません。設定から、満足を減らさずすぐに再開できます。</small>
          </div>
          <button className="anomaly-warning-action" type="button" onClick={() => setSettingsOpen(true)}>設定を開いて再開</button>
        </aside>
      )}

      <main className="game-grid three-panel-grid">
        <MainStage satisfaction={game.satisfaction} totalSatisfaction={game.totalSatisfaction} manualClicks={game.manualClicks} inventory={game.inventory} achievementCount={achievementCount} achievementBonusPercent={Math.round((achievementMultiplier - 1) * 100)} clickPower={clickPower} perSecond={satisfactionPerSecond} nextGoal={nextGoal} luckyEventVisible={luckyEventVisible} activeBuffs={activeBuffs} chainRemaining={chainRemaining} clickCombo={game.clickCombo} selectedCharacterSkin={game.selectedCharacterSkin} selectedStageTheme={game.selectedStageTheme} onCharacterClick={handleCharacterClick} onLuckyEvent={handleLuckyEvent} onOpenAchievements={() => setAchievementsOpen(true)} onDialogue={playVoice} onPurchaseItem={(itemId) => handlePurchase(itemId, 1)} />
        <WorldPanel game={game} perSecond={satisfactionPerSecond} achievementMultiplier={achievementMultiplier} productionMultiplier={coreProductionMultiplier} season={season} onOpenStats={() => setStatsOpen(true)} onOpenPrestige={() => setPrestigeOpen(true)} onClaimOmen={() => { if (claimDailyOmen()) { playEffectSound('achievement'); showToast('本日のお告げを達成しました') } }} onSetWorshipPolicy={(policy) => { if (setWorshipPolicy(policy)) showToast('礼拝方針を変更しました') }} onSendSleepyChiruko={() => { if (sendSleepyChiruko()) showToast('ミニちる子を机のすみに寝かせました') }} onWakeSleepyChiruko={() => { const reward = wakeSleepyChiruko(); if (reward > 0) { playEffectSound('lucky'); showToast(`居眠りから${formatNumber(reward)}満足が戻りました`) } }} />
        <Shop game={game} lastPurchasedId={lastPurchasedId} achievementMultiplier={achievementMultiplier} productionMultiplier={coreProductionMultiplier} onPurchase={handlePurchase} onPurchaseUpgrade={handleUpgrade} />
      </main>

      <footer className="status-footer"><span className="footer-seal" aria-hidden="true">満</span><span>満足教・ネオサイタマ仮設支部</span><span className="footer-divider" aria-hidden="true" /><span>{saveLabel}</span><span className="footer-divider" aria-hidden="true" /><span>{season.name}</span><span className="footer-spacer" /><span>累計 {formatNumber(game.totalSatisfaction)} 満足</span><span className="footer-divider" aria-hidden="true" /><button type="button" onClick={() => setStatsOpen(true)}>活動記録</button></footer>

      {toast && <div className="purchase-toast" role="status"><span aria-hidden="true">✦</span> {toast}</div>}
      {latestAchievement && <button type="button" className="achievement-toast" onClick={() => { dismissLatestAchievement(); setAchievementsOpen(true) }} aria-label={`新しい実績「${latestAchievement.name}」。実績図鑑を開く`}><span className="toast-medal" aria-hidden="true">{latestAchievement.icon}</span><span><small>ACHIEVEMENT UNLOCKED</small><strong>{latestAchievement.name}</strong><em>{latestAchievement.flavor}</em></span></button>}
      {offlineReport && <OfflineModal report={offlineReport} onClose={dismissOfflineReport} />}
      {achievementsOpen && <AchievementsModal game={game} onClose={() => setAchievementsOpen(false)} onSelectCosmetic={(kind, id) => {
        if (selectCosmetic(kind, id)) showToast('徳のご褒美を着せ替えました')
      }} onOpenMemorial={(id) => { setAchievementsOpen(false); setActiveMemorialId(id) }} />}
      {statsOpen && <StatsModal game={game} clickPower={clickPower} perSecond={satisfactionPerSecond} onClose={() => setStatsOpen(false)} />}
      {prestigeOpen && <PrestigeModal game={game} onClose={() => setPrestigeOpen(false)} onPrestige={handlePrestige} onPurchaseDoctrine={handleDoctrine} />}
      {settingsOpen && <SettingsModal audioPreferences={audioPreferences} onUpdateAudio={updateAudioPreferences} onClose={() => setSettingsOpen(false)} onReset={() => { resetGame(); setSettingsOpen(false); showToast('セーブデータを初期化しました') }} anomalyFrozen={game.anomalyFrozen} anomalyReason={game.anomalyReason} onResumeAnomaly={() => { const resumed = resumeFromAnomaly(); if (resumed) { setSettingsOpen(false); showToast('履歴を整え、安全確認を解除して再開しました') }; return resumed }} onExportSave={exportSave} onImportSave={importSave} onExportDiagnostics={exportDiagnostics} onClearDiagnostics={clearDiagnosticLogs} />}
      {activeMemorialId && (() => {
        const memorial = MEMORIALS.find((candidate) => candidate.id === activeMemorialId)
        if (!memorial) return null
        return <MemorialModal memorial={memorial} onClose={() => { markMemorialViewed(memorial.id); setActiveMemorialId(null) }} />
      })()}
    </div>
  )
}

export default App
