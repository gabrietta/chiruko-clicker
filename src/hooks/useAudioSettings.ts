import { useEffect, useState } from 'react'
import { DEFAULT_AUDIO_PREFERENCES, setAudioPreferences } from '../audio/audioManager'
import type { AudioPreferences } from '../types/game'

const AUDIO_SAVE_KEY = 'chiruko-audio-preferences-v1'

const loadPreferences = (): AudioPreferences => {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUDIO_SAVE_KEY) ?? '{}') as Partial<AudioPreferences>
    return { ...DEFAULT_AUDIO_PREFERENCES, ...parsed }
  } catch {
    return DEFAULT_AUDIO_PREFERENCES
  }
}

export const useAudioSettings = () => {
  const [audioPreferences, setPreferences] = useState<AudioPreferences>(loadPreferences)

  useEffect(() => {
    localStorage.setItem(AUDIO_SAVE_KEY, JSON.stringify(audioPreferences))
    setAudioPreferences(audioPreferences)
  }, [audioPreferences])

  const updateAudioPreferences = (patch: Partial<AudioPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }))
  }

  return { audioPreferences, updateAudioPreferences }
}
