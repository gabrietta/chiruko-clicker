export const TUTORIAL_KEY = 'chiruko-tutorial-completed-v1'
export const hasCompletedTutorial = () => { try { return localStorage.getItem(TUTORIAL_KEY) === '1' } catch { return true } }
export const completeTutorial = () => { try { localStorage.setItem(TUTORIAL_KEY, '1') } catch { /* ignore */ } }
export const shouldAutoStartTutorial = (saveKey: string) => {
  try {
    if (localStorage.getItem(TUTORIAL_KEY) === '1') return false
    if (localStorage.getItem(saveKey)) { localStorage.setItem(TUTORIAL_KEY, '1'); return false }
    return true
  } catch { return false }
}
