import { CHANGELOG } from '../config/changelog'

interface ChangelogModalProps {
  onClose: () => void
}

export const ChangelogModal = ({ onClose }: ChangelogModalProps) => (
  <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal-card changelog-modal" role="dialog" aria-modal="true" aria-labelledby="changelog-title">
      <p className="modal-eyebrow">SATISFACTION CULT LOG</p>
      <h2 id="changelog-title">更新履歴</h2>
      <div className="changelog-list">
        {CHANGELOG.map((entry) => (
          <article className="changelog-entry" key={entry.date}>
            <time dateTime={entry.date}>{entry.date}</time>
            <h3>{entry.title}</h3>
            <ul>
              {entry.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
      <button className="secondary-button" type="button" onClick={onClose} autoFocus>ゲームに戻る</button>
    </section>
  </div>
)
