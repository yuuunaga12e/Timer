import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [bgImage, setBgImage] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [title, setTitle] = useState('Focus Timer')
  const [soundType, setSoundType] = useState('beep')

  useEffect(() => {
    const savedBg = localStorage.getItem('timer_bg')
    if (savedBg) setBgImage(savedBg)

    const savedTitle = localStorage.getItem('timer_title')
    if (savedTitle) setTitle(savedTitle)

    const savedSound = localStorage.getItem('timer_sound')
    if (savedSound) setSoundType(savedSound)
  }, [])

  useEffect(() => {
    let intervalId: number | undefined
    if (isRunning && timeLeft > 0) {
      intervalId = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(intervalId)
            setIsRunning(false)
            playSound(soundType)
            return 0
          }
          return prevTime - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalId)
    }
    return () => clearInterval(intervalId)
  }, [isRunning, timeLeft, soundType])

  const playSound = (type: string) => {
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
        // Gentle Chime: Higher pitch, long decay
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now) // A5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1)

        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05) // Soft attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.0) // Long release

        osc.start(now)
        osc.stop(now + 2.0)
      } else if (type === 'digital') {
        // Digital Alarm: Square wave, short pulses
        osc.type = 'square'
        osc.frequency.setValueAtTime(660, now) // E5

        // Pulse pattern
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.setValueAtTime(0.1, now + 0.1)
        gainNode.gain.setValueAtTime(0, now + 0.1)
        gainNode.gain.setValueAtTime(0, now + 0.2)
        gainNode.gain.setValueAtTime(0.1, now + 0.2)
        gainNode.gain.setValueAtTime(0.1, now + 0.3)
        gainNode.gain.setValueAtTime(0, now + 0.3)

        osc.start(now)
        osc.stop(now + 0.4)
      } else {
        // Simple Beep (Default)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now) // A5
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.5)

        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5)

        osc.start(now)
        osc.stop(now + 0.5)
      }
    } catch (error) {
      console.error('Audio playback failed:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    if (timeLeft > 0) setIsRunning(true)
  }
  const handleStop = () => setIsRunning(false)
  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(0)
  }

  const handleAddFiveMinutes = () => {
    setTimeLeft((prevTime) => {
      const newTime = prevTime + 5 * 60
      return newTime > 90 * 60 ? 90 * 60 : newTime
    })
  }

  const handleRemoveFiveMinutes = () => {
    setTimeLeft((prevTime) => {
      const newTime = prevTime - 5 * 60
      return newTime < 0 ? 0 : newTime
    })
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


  return (
    <div
      className="timer-container"
      style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
    >
      <div className={`overlay ${bgImage ? 'has-bg' : ''}`}>
        <button
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
        >
          ⚙️
        </button>

        {showSettings && (
          <div className="settings-panel">
            <h3>Settings</h3>
            <div className="setting-item">
              <label>Title:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  localStorage.setItem('timer_title', e.target.value)
                }}
                placeholder="Enter title..."
              />
            </div>
            <div className="setting-item">
              <label>Alarm Sound:</label>
              <select
                value={soundType}
                onChange={(e) => {
                  setSoundType(e.target.value)
                  localStorage.setItem('timer_sound', e.target.value)
                  playSound(e.target.value) // Preview sound
                }}
                style={{
                  padding: '6px',
                  width: '100%',
                  borderRadius: '4px',
                  border: '1px solid var(--notion-border)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="beep">Simple Beep</option>
                <option value="chime">Gentle Chime</option>
                <option value="digital">Digital Alarm</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Background Image:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <div className="setting-item">
              <button
                className="clear-bg-btn"
                onClick={() => {
                  setBgImage('')
                  localStorage.removeItem('timer_bg')
                }}
              >
                Clear Background
              </button>
            </div>
          </div>
        )}

        <h1>{title}</h1>
        <div className="time-display">{formatTime(timeLeft)}</div>
        <div className="controls">
          <div className="adjust-buttons">
            <button onClick={handleRemoveFiveMinutes} disabled={isRunning || timeLeft === 0}>-5 min</button>
            <button onClick={handleAddFiveMinutes} disabled={isRunning}>+5 min</button>
          </div>
          <div className="action-buttons">
            {!isRunning ? (
              <button className="start-btn" onClick={handleStart} disabled={timeLeft === 0}>Start</button>
            ) : (
              <button className="stop-btn" onClick={handleStop}>Stop</button>
            )}
            <button onClick={handleReset}>Reset</button>
          </div>
        </div>
      </div>
    </div >
  )
}

export default App
