import { useState } from 'react'
import type { AudioPreferences } from '../types/game'

interface SettingsModalProps {
  audioPreferences: AudioPreferences
  onUpdateAudio: (patch: Partial<AudioPreferences>) => void
  onClose: () => void
  onReset: () => void
  anomalyFrozen: boolean
  anomalyReason: string
  onResumeAnomaly: () => boolean
  onExportSave: () => string
  onImportSave: (code: string) => boolean
}

const Toggle = ({ label, note, checked, disabled, onChange }: { label: string; note: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) => (
  <label className={`audio-toggle ${disabled ? 'disabled' : ''}`}>
    <span><strong>{label}</strong><small>{note}</small></span>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    <i aria-hidden="true" />
  </label>
)

export const SettingsModal = ({ audioPreferences, onUpdateAudio, onClose, onReset, anomalyFrozen, anomalyReason, onResumeAnomaly, onExportSave, onImportSave }: SettingsModalProps) => {
  const [saveCode, setSaveCode] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const confirmReset = () => {
    if (window.confirm('現在の満足、設備、実績、周回状況をすべて消去します。本当にリセットしますか？')) onReset()
  }
  const disabled = !audioPreferences.masterEnabled

  const handleExport = async () => {
    const code = onExportSave()
    setSaveCode(code)
    try {
      await navigator.clipboard.writeText(code)
      setSaveMessage('セーブコードを作成し、クリップボードへコピーしました。')
    } catch {
      setSaveMessage('セーブコードを作成しました。下の欄を手動でコピーしてください。')
    }
  }

  const handleImport = () => {
    if (!saveCode.trim()) {
      setSaveMessage('先にセーブコードを貼り付けてください。')
      return
    }
    if (!window.confirm('この端末の現在のセーブデータを、読み込んだデータで置き換えます。続けますか？')) return
    setSaveMessage(onImportSave(saveCode) ? 'セーブデータを読み込みました。' : 'セーブコードが正しくありません。')
  }

  const handleResumeAnomaly = () => {
    if (!window.confirm('安全確認を解除して再開します。これはBANではなく、満足・累計満足・設備・実績・救済印は減りません。続けますか？')) return
    onResumeAnomaly()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <p className="modal-eyebrow">SETTINGS</p><h2 id="settings-title">設定</h2>
        <p>進行状況はこのブラウザへ自動保存されます。音の設定はゲーム進行とは別に保存されます。</p>
        {anomalyFrozen && <div className="settings-section anomaly-recovery-section">
          <strong>安全確認による一時停止（BANではありません）</strong>
          <span>{anomalyReason || '満足の流れに不自然な揺らぎを感じました。'} セーブデータは保持されています。満足を減らさず再開できます。</span>
          <button className="secondary-button" type="button" onClick={handleResumeAnomaly}>安全確認を解除して再開</button>
        </div>}
        <div className="settings-section audio-settings">
          <div className="settings-section-title"><strong>音声・サウンド</strong><span>最初はBGMとボイスのみオフです</span></div>
          <Toggle label="すべての音" note="一括ミュート" checked={audioPreferences.masterEnabled} onChange={(masterEnabled) => onUpdateAudio({ masterEnabled })} />
          <Toggle label="クリック音" note="ちる子をさわった音" checked={audioPreferences.clickEnabled} disabled={disabled} onChange={(clickEnabled) => onUpdateAudio({ clickEnabled })} />
          <Toggle label="効果音" note="購入・実績・救済の欠片" checked={audioPreferences.effectsEnabled} disabled={disabled} onChange={(effectsEnabled) => onUpdateAudio({ effectsEnabled })} />
          <Toggle label="ちる子ボイス" note="仮の音声合成。素材追加で差し替え可能" checked={audioPreferences.voiceEnabled} disabled={disabled} onChange={(voiceEnabled) => onUpdateAudio({ voiceEnabled })} />
          <Toggle label="BGM" note="仮のゆるい電子音。素材追加で差し替え可能" checked={audioPreferences.bgmEnabled} disabled={disabled} onChange={(bgmEnabled) => onUpdateAudio({ bgmEnabled })} />
          <label className={`volume-control ${disabled ? 'disabled' : ''}`}><span>音量 <b>{Math.round(audioPreferences.volume * 100)}%</b></span><input type="range" min="0" max="1" step="0.05" value={audioPreferences.volume} disabled={disabled} onChange={(event) => onUpdateAudio({ volume: Number(event.target.value) })} /></label>
        </div>
        <div className="settings-section"><strong>セーブデータについて</strong><span>別の端末には自動共有されません。ブラウザの保存データを消すと進行も消去されます。</span></div>
        <div className="settings-section save-transfer-section">
          <div className="settings-section-title"><strong>端末間でセーブを移す</strong><span>PC・スマホ・別ブラウザ対応</span></div>
          <p>「書き出す」でコードをコピーし、移行先の設定画面へ貼り付けてください。読み込みは移行先のデータを上書きします。</p>
          <textarea value={saveCode} onChange={(event) => setSaveCode(event.target.value)} placeholder="ここへセーブコードを貼り付け" aria-label="セーブコード" />
          <div className="save-transfer-actions"><button className="secondary-button" type="button" onClick={handleExport}>セーブを書き出す</button><button className="secondary-button" type="button" onClick={handleImport}>セーブを読み込む</button></div>
          {saveMessage && <small className="save-transfer-message" role="status">{saveMessage}</small>}
        </div>
        <div className="settings-actions"><button className="danger-button" type="button" onClick={confirmReset}>全データをリセット</button><button className="secondary-button" type="button" onClick={onClose} autoFocus>ゲームに戻る</button></div>
      </section>
    </div>
  )
}
