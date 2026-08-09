import type { MemorialDefinition } from '../config/memorials'
import { assetPath } from '../utils/assetPath'

interface MemorialModalProps {
  memorial: MemorialDefinition
  onClose: () => void
}

export const MemorialModal = ({ memorial, onClose }: MemorialModalProps) => (
  <div className="modal-backdrop memorial-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="memorial-modal" role="dialog" aria-modal="true" aria-labelledby="memorial-title">
      <figure>
        <img src={assetPath(memorial.imagePath)} alt={memorial.description} />
      </figure>
      <footer>
        <div>
          <small>CONFIDENTIAL MESSAGE RECEIVED</small>
          <h2 id="memorial-title">{memorial.name}</h2>
          <p>{memorial.description}</p>
        </div>
        <button type="button" onClick={onClose}>秘蔵記録を閉じる</button>
      </footer>
    </section>
  </div>
)
