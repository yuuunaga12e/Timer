import { useState, useEffect, useCallback } from 'react'
import './App.css'

type TimerMode = 'focus' | 'break' | 'idle' | 'done'

function App() {
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [bgImage, setBgImage] = useState<string>('')
  const [doneBgImage, setDoneBgImage] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [title, setTitle] = useState('Focus Timer')
  const [soundType, setSoundType] = useState('beep')

  const [mode, setMode] = useState<TimerMode>('idle')
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [totalSets, setTotalSets] = useState(4)
  const [currentSet, setCurrentSet] = useState(1)

  useEffect(() => {
    const savedBg = localStorage.getItem('timer_bg')
    if (savedBg) setBgImage(savedBg)
    const savedDoneBg = localStorage.getItem('timer_done_bg')
    if (savedDoneBg) setDoneBgImage(savedDoneBg)
    const savedTitle = localStorage.getItem('timer_title')
    if (savedTitle) setTitle(savedTitle)
    const savedSound = localStorage.getItem('timer_sound')
    if (savedSound) setSoundType(savedSound)
    const savedFocus = localStorage.getItem('timer_focus_min')
    if (savedFocus) setFocusMinutes(Number(savedFocus))
    const savedBreak = localStorage.getItem('timer_break_min')
    if (savedBreak) setBreakMinutes(Number(savedBreak))
    const savedSets = localStorage.getItem('timer_total_sets')
    if (savedSets) setTotalSets(Number(savedSets))
  }, [])

  const playSound = useCallback((type: string) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      osc.connect(gainNode)
      gainNode.connect(ctx.destination)
      const now = ctx.currentTime

      if (type === 'chime') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now)
        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.0)
        osc.start(now)
        osc.stop(now + 2.0)
      } else if (type === 'digital') {
        osc.type = 'square'
        osc.frequency.setValueAtTime(660, now)
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.setValueAtTime(0, now + 0.1)
        gainNode.gain.setValueAtTime(0.1, now + 0.2)
        gainNode.gain.setValueAtTime(0, now + 0.3)
        osc.start(now)
        osc.stop(now + 0.4)
      } else if (type === 'break_chime') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(523, now)
        osc.frequency.exponentialRampToValueAtTime(659, now + 0.3)
        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05)
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
        osc.start(now)
        osc.stop(now + 1.5)
      } else {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now)
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.5)
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
        osc.start(now)
        osc.stop(now + 0.5)
      }
    } catch (error) {
      console.error('Audio playback failed:', error)
    }
  }, [])

  useEffect(() => {
    let intervalId: number | undefined
    if (isRunning && timeLeft > 0) {
      intervalId = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1)
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [isRunning, timeLeft])

  useEffect(() => {
    if (isRunning && timeLeft === 0 && mode !== 'idle' && mode !== 'done') {
      setIsRunning(false)
      if (mode === 'focus') {
        playSound('break_chime')
        if (currentSet >= totalSets) {
          setMode('done')
          playSound(soundType)
        } else {
          setMode('break')
          setTimeLeft(breakMinutes * 60)
          setTimeout(() => setIsRunning(true), 1000)
        }
      } else if (mode === 'break') {
        playSound(soundType)
        setCurrentSet(prev => prev + 1)
        setMode('focus')
        setTimeLeft(focusMinutes * 60)
        setTimeout(() => setIsRunning(true), 1000)
      }
    }
  }, [timeLeft, isRunning, mode, currentSet, totalSets, breakMinutes, focusMinutes, playSound, soundType])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleStartSession = () => {
    setMode('focus')
    setCurrentSet(1)
    setTimeLeft(focusMinutes * 60)
    setIsRunning(true)
  }

  const handlePause = () => setIsRunning(false)
  const handleResume = () => { if (timeLeft > 0) setIsRunning(true) }

  const handleReset = () => {
    setIsRunning(false)
    setMode('idle')
    setTimeLeft(0)
    setCurrentSet(1)
  }

  const handleSkip = () => {
    setIsRunning(false)
    setTimeLeft(0)
    if (mode === 'focus') {
      if (currentSet >= totalSets) { setMode('done') }
      else {
        setMode('break')
        setTimeLeft(breakMinutes * 60)
        setTimeout(() => setIsRunning(true), 500)
      }
    } else if (mode === 'break') {
      setCurrentSet(prev => prev + 1)
      setMode('focus')
      setTimeLeft(focusMinutes * 60)
      setTimeout(() => setIsRunning(true), 500)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setBgImage(result)
        localStorage.setItem('timer_bg', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDoneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setDoneBgImage(result)
        localStorage.setItem('timer_done_bg', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const getModeLabel = () => {
    switch (mode) {
      case 'focus': return 'FOCUS'
      case 'break': return 'BREAK'
      case 'done': return 'COMPLETE'
      default: return ''
    }
  }

  const getModeClass = () => {
    switch (mode) {
      case 'focus': return 'mode-focus'
      case 'break': return 'mode-break'
      case 'done': return 'mode-done'
      default: return ''
    }
  }

  const getTotalSeconds = () => {
    if (mode === 'focus') return focusMinutes * 60
    if (mode === 'break') return breakMinutes * 60
    return 1
  }

  const progress = mode !== 'idle' && mode !== 'done'
    ? ((getTotalSeconds() - timeLeft) / getTotalSeconds()) * 100
    : (mode === 'done' ? 100 : 0)

  const circumference = 2 * Math.PI * 90

  const renderSetDots = () => {
    const dots = []
    for (let i = 1; i <= totalSets; i++) {
      let cls = 'dot'
      if (i < currentSet || mode === 'done') cls += ' done'
      else if (i === currentSet && (mode === 'focus' || mode === 'break')) cls += ` current ${getModeClass()}`
      dots.push(<div key={i} className={cls} />)
    }
    return dots
  }

  const isActive = mode === 'focus' || mode === 'break'
  const showDoneBg = mode === 'done' && doneBgImage

  return (
    <div
      className={`app ${getModeClass()}`}
      style={showDoneBg ? { backgroundImage: `url(${doneBgImage})` } : (bgImage ? { backgroundImage: `url(${bgImage})` } : {})}
    >
      <div className={`glass-layer ${(showDoneBg || bgImage) ? 'has-bg' : ''}`}>

        {/* Settings button */}
        <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Settings panel */}
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-header">
              <h3>Settings</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="setting-group">
              <label>Title</label>
              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); localStorage.setItem('timer_title', e.target.value) }} placeholder="Enter title..." />
            </div>
            <div className="setting-row">
              <div className="setting-group half">
                <label>Focus (min)</label>
                <input type="number" min="1" max="90" value={focusMinutes} onChange={(e) => { const v = Number(e.target.value); setFocusMinutes(v); localStorage.setItem('timer_focus_min', String(v)) }} disabled={isActive} />
              </div>
              <div className="setting-group half">
                <label>Break (min)</label>
                <input type="number" min="1" max="30" value={breakMinutes} onChange={(e) => { const v = Number(e.target.value); setBreakMinutes(v); localStorage.setItem('timer_break_min', String(v)) }} disabled={isActive} />
              </div>
            </div>
            <div className="setting-group">
              <label>Sets</label>
              <input type="number" min="1" max="10" value={totalSets} onChange={(e) => { const v = Number(e.target.value); setTotalSets(v); localStorage.setItem('timer_total_sets', String(v)) }} disabled={isActive} />
            </div>
            <div className="setting-group">
              <label>Sound</label>
              <select value={soundType} onChange={(e) => { setSoundType(e.target.value); localStorage.setItem('timer_sound', e.target.value); playSound(e.target.value) }}>
                <option value="beep">Soft Beep</option>
                <option value="chime">Crystal Chime</option>
                <option value="digital">Digital Pulse</option>
              </select>
            </div>
            <div className="setting-group">
              <label>Background</label>
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="setting-group">
              <label>Done Background</label>
              <input type="file" accept="image/*" onChange={handleDoneFileChange} />
            </div>
            <button className="danger-btn" onClick={() => { setBgImage(''); setDoneBgImage(''); localStorage.removeItem('timer_bg'); localStorage.removeItem('timer_done_bg') }}>
              Clear Backgrounds
            </button>
          </div>
        )}

        {/* Title */}
        <p className="app-title">{title}</p>

        {/* Mode badge */}
        {mode !== 'idle' && (
          <div className={`mode-badge ${getModeClass()}`}>
            <span className="mode-dot" />
            {getModeLabel()}
          </div>
        )}

        {/* Timer ring */}
        <div className="ring-container">
          <svg className="ring-svg" viewBox="0 0 200 200">
            <circle className="ring-track" cx="100" cy="100" r="90" />
            <circle
              className={`ring-fill ${getModeClass()}`}
              cx="100" cy="100" r="90"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="ring-inner">
            <span className="timer-digits">{formatTime(timeLeft)}</span>
            {isActive && (
              <span className="set-label">Set {currentSet} of {totalSets}</span>
            )}
          </div>
        </div>

        {/* Set dots */}
        {mode !== 'idle' && (
          <div className="dots-row">{renderSetDots()}</div>
        )}

        {/* Idle */}
        {mode === 'idle' && (
          <div className="controls-area">
            <p className="config-summary">{focusMinutes}m focus · {breakMinutes}m break · {totalSets} sets</p>
            <button className="primary-btn" onClick={handleStartSession}>
              Start Session
            </button>
          </div>
        )}

        {/* Active */}
        {isActive && (
          <div className="controls-area">
            <div className="btn-row">
              {isRunning ? (
                <button className="control-btn pause" onClick={handlePause}>Pause</button>
              ) : (
                <button className="control-btn resume" onClick={handleResume}>Resume</button>
              )}
              <button className="control-btn skip" onClick={handleSkip}>Skip</button>
              <button className="control-btn reset" onClick={handleReset}>Reset</button>
            </div>
          </div>
        )}

        {/* Done */}
        {mode === 'done' && (
          <div className="controls-area done-area">
            <p className="done-title">All {totalSets} sets complete!</p>
            <p className="done-subtitle">
              {focusMinutes * totalSets}m focused · {breakMinutes * (totalSets - 1)}m rested
            </p>
            <div className="btn-row">
              <button className="primary-btn" onClick={handleStartSession}>Go Again</button>
              <button className="control-btn reset" onClick={handleReset}>Home</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
