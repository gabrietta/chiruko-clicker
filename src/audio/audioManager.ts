import type { AudioPreferences } from '../types/game'
import { getVoiceClipPath } from './voiceClips'

// 実際の音素材を使う場合は public/assets/audio に置き、ここへパスを書きます。
// null の間は軽量なブラウザ生成音（ボイスのみ音声合成）で代用します。
export const AUDIO_PATHS = {
  click: null,
  purchase: null,
  achievement: null,
  lucky: null,
  voice: null,
  bgm: null,
} as const satisfies Record<string, string | null>

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  masterEnabled: true,
  clickEnabled: true,
  effectsEnabled: true,
  voiceEnabled: false,
  bgmEnabled: false,
  volume: 0.55,
}

let preferences = DEFAULT_AUDIO_PREFERENCES
let context: AudioContext | null = null
let bgmTimer: number | null = null
let bgmAudio: HTMLAudioElement | null = null
let lastVoiceAt = 0

const getContext = () => {
  if (!context) context = new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

const tone = (frequency: number, duration: number, volume: number, delay = 0, type: OscillatorType = 'sine') => {
  if (!preferences.masterEnabled) return
  const audioContext = getContext()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const start = audioContext.currentTime + delay
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * preferences.volume), start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(audioContext.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

const playFile = (path: string | null, volume = 1) => {
  if (!path || !preferences.masterEnabled) return false
  const audio = new Audio(path)
  audio.volume = Math.max(0, Math.min(1, preferences.volume * volume))
  void audio.play().catch(() => undefined)
  return true
}

const stopBgm = () => {
  if (bgmTimer !== null) window.clearInterval(bgmTimer)
  bgmTimer = null
  if (bgmAudio) {
    bgmAudio.pause()
    bgmAudio = null
  }
}

const startBgm = () => {
  stopBgm()
  if (!preferences.masterEnabled || !preferences.bgmEnabled) return
  if (AUDIO_PATHS.bgm) {
    bgmAudio = new Audio(AUDIO_PATHS.bgm)
    bgmAudio.loop = true
    bgmAudio.volume = preferences.volume * 0.2
    void bgmAudio.play().catch(() => undefined)
    return
  }

  const notes = [261.63, 329.63, 392, 493.88, 392, 329.63]
  let step = 0
  const playStep = () => {
    if (!preferences.bgmEnabled || !preferences.masterEnabled) return
    tone(notes[step % notes.length], 0.75, 0.025, 0, 'sine')
    if (step % 2 === 0) tone(notes[step % notes.length] / 2, 1.2, 0.018, 0, 'triangle')
    step += 1
  }
  playStep()
  bgmTimer = window.setInterval(playStep, 900)
}

export const setAudioPreferences = (next: AudioPreferences) => {
  const bgmChanged = next.bgmEnabled !== preferences.bgmEnabled ||
    next.masterEnabled !== preferences.masterEnabled ||
    next.volume !== preferences.volume
  preferences = next
  if (bgmChanged) startBgm()
}

export const unlockAudio = () => {
  if (!preferences.masterEnabled) return
  getContext()
  if (preferences.bgmEnabled && bgmTimer === null && !bgmAudio) startBgm()
}

export const playClickSound = () => {
  if (!preferences.masterEnabled || !preferences.clickEnabled) return
  if (!playFile(AUDIO_PATHS.click, 0.5)) tone(620 + Math.random() * 80, 0.055, 0.055, 0, 'triangle')
}

export const playEffectSound = (kind: 'purchase' | 'achievement' | 'lucky' | 'prestige') => {
  if (!preferences.masterEnabled || !preferences.effectsEnabled) return
  const file = kind === 'purchase' ? AUDIO_PATHS.purchase : kind === 'lucky' ? AUDIO_PATHS.lucky : AUDIO_PATHS.achievement
  if (playFile(file, 0.8)) return
  const notes = kind === 'prestige' ? [261, 392, 523, 784] : kind === 'lucky' ? [660, 880, 1100] : kind === 'achievement' ? [440, 554, 659] : [392, 523]
  notes.forEach((note, index) => tone(note, 0.18 + index * 0.03, 0.07, index * 0.065, 'triangle'))
}

export const playVoice = (text: string) => {
  if (!preferences.masterEnabled || !preferences.voiceEnabled || Date.now() - lastVoiceAt < 4_000) return
  lastVoiceAt = Date.now()
  if (playFile(getVoiceClipPath(text) ?? AUDIO_PATHS.voice, 0.8)) return
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 1.08
  utterance.pitch = 1.35
  utterance.volume = preferences.volume * 0.7
  window.speechSynthesis.speak(utterance)
}
