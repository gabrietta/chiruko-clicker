import { GAME_CONFIG } from '../config/gameConfig'
import type { OfflineReport } from '../types/game'
import { formatDuration, formatNumber } from '../utils/format'
import { assetPath } from '../utils/assetPath'

interface OfflineModalProps {
  report: OfflineReport
  onClose: () => void
}

export const OfflineModal = ({ report, onClose }: OfflineModalProps) => (
  <div className="modal-backdrop" role="presentation">
    <section className="modal-card offline-modal" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <img className="offline-art" src={assetPath(GAME_CONFIG.characterImages.sleep)} alt="すやすや眠るちる子" />
      <div className="modal-copy">
        <p className="modal-eyebrow">WELCOME BACK</p>
        <h2 id="offline-title">おかえりなさい</h2>
        <p>
          留守にしていた{formatDuration(report.elapsedSeconds)}のあいだも、
          ちる子の満足は静かに育っていました。
          {report.wasCapped && `（留守中の計算は現在の上限、${formatDuration(report.elapsedSeconds)}までです）`}
        </p>
        <div className="offline-gain">
          <span>留守中にたまった満足</span>
          <strong>+{formatNumber(report.earned)}</strong>
        </div>
        <button className="primary-button" type="button" onClick={onClose} autoFocus>
          満足を受け取る
        </button>
      </div>
    </section>
  </div>
)
