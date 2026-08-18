import { useEffect, useState } from 'react'
import { useRef } from 'react'
import { completeTutorial } from '../game/tutorial'
const steps = [
  { target: 'chiruko', text: 'まずはちる子をタップして、満足を増やしましょう。', action: 'tap' },
  { target: 'satisfaction', text: 'ここに今の満足が表示されます。', action: 'next' },
  { target: 'shop', text: '満足が貯まったら設備を購入。自動生産が増えます。', action: 'done' },
] as const

export const TutorialOverlay = ({ manualClicks, onClose }: { manualClicks: number; onClose: () => void }) => {
  const [step, setStep] = useState(0)
  const baseline = useRef(manualClicks)
  const current = steps[step]
  useEffect(() => {
    if (step === 0 && manualClicks > baseline.current) setStep(1)
  }, [manualClicks, step])
  useEffect(() => {
    const target = document.querySelector(`[data-tutorial-target="${current.target}"]`) || document.querySelector(`[data-tutorial-fallback="${current.target}"]`)
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    const highlight = document.querySelector('.tutorial-highlight') as HTMLElement | null
    const update = () => { const rect = target?.getBoundingClientRect(); if (rect && highlight) { highlight.style.left = `${rect.left - 8}px`; highlight.style.top = `${rect.top - 8}px`; highlight.style.width = `${rect.width + 16}px`; highlight.style.height = `${rect.height + 16}px` } }
    update(); window.addEventListener('resize', update); window.addEventListener('scroll', update, true); window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update)
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { completeTutorial(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update) }
  }, [current.target, onClose])
  const finish = () => { completeTutorial(); onClose() }
  return <div className="tutorial-layer" aria-live="polite">
    <div className="tutorial-highlight" data-target={current.target} />
    <section className="tutorial-panel" role="dialog" aria-label="はじめての案内">
      <small>{step + 1} / 3</small><p>{current.text}</p>
      {current.action === 'tap' ? <em>ちる子をタップすると次へ進みます</em> : <button type="button" onClick={() => current.action === 'done' ? finish() : setStep(step + 1)}>{current.action === 'done' ? '完了' : '次へ'}</button>}
      <button type="button" className="tutorial-skip" onClick={finish}>スキップ</button>
    </section>
  </div>
}
