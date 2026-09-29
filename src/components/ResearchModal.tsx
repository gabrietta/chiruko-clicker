import { useEffect, useRef, useState } from 'react'
import { RESEARCH_BRANCHES, RESEARCH_DURATIONS } from '../config/research'
import { getResearchNext } from '../game/research'
import type { GameState } from '../types/game'
import { formatNumber } from '../utils/format'

interface Props { game: GameState; onClose: () => void; onStart: (branch: number) => void; onClaim: () => void }
const duration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hours && `${hours}時間`, minutes && `${minutes}分`, (secs || (!hours && !minutes)) && `${secs}秒`].filter(Boolean).join('')
}
const bonus = (branch: number, level: number) => branch === 0 ? `生産 +${level * 10}%`
  : branch === 1 ? `ひとさわり +${level * 25}%` : `留守番上限 +${level * 2}時間`

export const ResearchModal = ({ game, onClose, onStart, onClaim }: Props) => {
  const panel = useRef<HTMLElement>(null)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => focused?.focus()
  }, [])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const project = game.researchProject
  const remaining = project ? Math.min(RESEARCH_DURATIONS[project.level], Math.max(0, Math.ceil((project.finishAt - now) / 1000))) : 0
  const progress = project ? Math.max(0, Math.min(100, (1 - remaining / RESEARCH_DURATIONS[project.level]) * 100)) : 0
  return <div className="modal-backdrop research-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={panel} className="modal-card research-modal" role="dialog" aria-modal="true" aria-labelledby="research-title" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose() }
      if (event.key === 'Tab') {
        const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
        const first = buttons[0]; const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }}>
      <button className="modal-close" type="button" onClick={onClose} aria-label="研究所を閉じる">×</button>
      <p className="modal-eyebrow">SATISFACTION COSMOS LABORATORY</p>
      <h2 id="research-title">満足宇宙研究所</h2>
      <p>満足を研究費にして、まだ見ぬ宇宙へ。一度にひとつ研究でき、閉じている間も進みます。成果を受け取ると永久強化され、再布教しても解放・成果・研究の進行が残ります。</p>
      {!game.researchUnlocked && <p className="research-locked">Sora4を50個所有すると解放（現在 {game.inventory['sora-4'] ?? 0}/50）。過去の五十景達成も対象です。</p>}
      <div className="research-balance">現在の満足 <b>{formatNumber(game.satisfaction)}</b><span>星図 {game.researchCompleted}/12</span></div>
      {project && <div className="research-running">
        <strong>{RESEARCH_BRANCHES[project.branch].name}・第{project.level + 1}段階</strong>
        <span>{remaining > 0 ? `残り ${duration(remaining)}` : '観測完了！ 新しい星が見つかりました。'}</span>
        <progress max={100} value={progress} aria-label="研究の進捗" />
        <button type="button" disabled={remaining > 0 || game.anomalyFrozen} onClick={onClaim}>{remaining > 0 ? '研究中・成果をお待ちください' : '成果を受け取る'}</button>
      </div>}
      {game.researchCompleted === 12 && <p className="research-complete" role="status">✦ 満足宇宙の星図、完成 ✦<br />「宇宙の果てにも、あなたの満足が届きましたわ。」</p>}
      <div className="research-map">
        {RESEARCH_BRANCHES.map((branch, branchIndex) => {
          const level = game.researchLevels[branchIndex]
          const next = getResearchNext(game.researchLevels, branchIndex)
          const isActive = project?.branch === branchIndex
          return <article key={branch.id} className={`research-branch ${isActive ? 'observing' : ''}`}>
            <h3>{branch.name}</h3><p>{branch.description}</p>
            <div className="research-levels" aria-label={`${branch.name} ${level}/4段階完了`}>
              {[0, 1, 2, 3].map((star) => <span className={star < level ? 'complete' : isActive && star === level ? 'observing' : ''} key={star}>{star < level ? '◆' : '◇'} {star + 1}</span>)}
            </div>
            <small>{bonus(branchIndex, level)}{next && <> → {bonus(branchIndex, level + 1)}</>}</small>
            {next ? <>
              <p className="research-cost">第{next.level + 1}段階 · {duration(next.duration)}<br />研究費 {formatNumber(next.cost)}満足</p>
              <button type="button" aria-label={`${branch.name}の第${next.level + 1}段階を研究する`} disabled={!game.researchUnlocked || Boolean(project) || game.satisfaction < next.cost || game.anomalyFrozen} onClick={() => onStart(branchIndex)}>
                {!game.researchUnlocked ? 'Sora4を50個で解放' : project ? isActive ? '研究中' : 'ほかの研究を完了してください' : game.satisfaction < next.cost ? '満足が足りません' : '研究を始める'}
              </button>
            </> : <><em>星図完成</em><p className="research-flavor">{branch.flavor}</p></>}
          </article>
        })}
      </div>
      <p className="research-lore">救済の欠片をつかまえると、研究が最大30秒短縮。研究費は開始時だけ支払い、開始後は取り消せません。完成後の「成果を受け取る」で強化が有効になります。</p>
    </section>
  </div>
}
