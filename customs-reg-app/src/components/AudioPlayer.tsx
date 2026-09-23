import { useEffect, useState, useRef } from 'react'

interface AudioPlayerProps {
  title: string
  text: string
  lang: 'en' | 'bm'
}

export function AudioPlayer({ title, text, lang }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(1.0)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Clean speech when regulation changes
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      setIsPaused(false)
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [title, text, lang])

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null
  }

  const handlePlay = () => {
    if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }

    window.speechSynthesis.cancel()

    // Clean markdown/special characters for clear audio narration
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#`]/g, '')
      .replace(/\s+/g, ' ')

    const fullNarration = `${title}. ${cleanText}`
    const utter = new SpeechSynthesisUtterance(fullNarration)
    utter.rate = rate
    utter.lang = lang === 'bm' ? 'ms-MY' : 'en-US'

    // Try to find natural matching voice
    const voices = window.speechSynthesis.getVoices()
    if (lang === 'bm') {
      const msVoice = voices.find(
        (v) =>
          v.lang.startsWith('ms') ||
          v.lang.startsWith('id') ||
          v.name.toLowerCase().includes('malay') ||
          v.name.toLowerCase().includes('indonesia'),
      )
      if (msVoice) utter.voice = msVoice
    } else {
      const enVoice = voices.find(
        (v) =>
          (v.lang.startsWith('en') && v.name.includes('Natural')) ||
          v.lang === 'en-GB' ||
          v.lang === 'en-US' ||
          v.lang === 'en-MY',
      )
      if (enVoice) utter.voice = enVoice
    }

    utter.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    utter.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }

    utter.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }

    utterRef.current = utter
    window.speechSynthesis.speak(utter)
  }

  const handlePause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }

  const handleRateCycle = () => {
    const nextRate = rate === 1.0 ? 1.25 : rate === 1.25 ? 1.5 : 1.0
    setRate(nextRate)
    if (isPlaying) {
      handlePlay()
    }
  }

  return (
    <div className="audio-player">
      {!isPlaying && !isPaused ? (
        <button
          type="button"
          className="audio-btn play-btn"
          onClick={handlePlay}
          title={lang === 'bm' ? 'Dengar teks audio' : 'Listen to audio narration'}
        >
          <span className="audio-icon" aria-hidden="true">
            🎧
          </span>
          <span>{lang === 'bm' ? 'Dengar' : 'Listen'}</span>
        </button>
      ) : (
        <div className="audio-controls">
          {isPlaying ? (
            <button
              type="button"
              className="audio-btn pause-btn"
              onClick={handlePause}
              title={lang === 'bm' ? 'Jeda audio' : 'Pause audio'}
            >
              ⏸️ <span>{lang === 'bm' ? 'Jeda' : 'Pause'}</span>
            </button>
          ) : (
            <button
              type="button"
              className="audio-btn resume-btn"
              onClick={handlePlay}
              title={lang === 'bm' ? 'Sambung audio' : 'Resume audio'}
            >
              ▶️ <span>{lang === 'bm' ? 'Sambung' : 'Resume'}</span>
            </button>
          )}

          <button
            type="button"
            className="audio-btn stop-btn"
            onClick={handleStop}
            title={lang === 'bm' ? 'Henti audio' : 'Stop audio'}
          >
            ⏹️
          </button>

          <button
            type="button"
            className="audio-btn rate-btn"
            onClick={handleRateCycle}
            title={lang === 'bm' ? 'Kelajuan audio' : 'Playback speed'}
          >
            {rate}x
          </button>
        </div>
      )}
    </div>
  )
}
