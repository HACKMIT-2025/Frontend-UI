import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import './GamePanel.css'

interface GamePanelProps {
  levelDataUrl?: string;
  onLevelLoaded?: () => void;
}

interface GamePanelRef {
  loadNewLevel: (dataUrl: string) => void;
}

const GamePanel = forwardRef<GamePanelRef, GamePanelProps>(({ levelDataUrl, onLevelLoaded }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [gameScore, setGameScore] = useState(0)
  const [gameStatus, setGameStatus] = useState('Ready')
  const [, setCurrentLevelUrl] = useState<string | null>(null)

  useEffect(() => {
    // Set the iframe source to the embedded Mario game
    let gameUrl = 'https://frontend-mario.vercel.app/embed'

    if (levelDataUrl) {
      // Use the level data URL if provided
      gameUrl += `?data=${encodeURIComponent(levelDataUrl)}`
      setCurrentLevelUrl(levelDataUrl)
    }

    if (iframeRef.current) {
      iframeRef.current.src = gameUrl
    }
  }, [levelDataUrl])

  useEffect(() => {
    // Listen for PostMessage events from the embedded game
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://frontend-mario.vercel.app') {
        return // Only accept messages from the Mario game origin
      }

      const { type, data } = event.data

      switch (type) {
        case 'SCORE_UPDATE':
          setGameScore(data.score)
          break
        case 'GAME_START':
          setGameStatus('Playing')
          break
        case 'GAME_OVER':
          setGameStatus('Game Over')
          break
        case 'GAME_WIN':
          setGameStatus('Victory!')
          break
        case 'GAME_PAUSE':
          setGameStatus('Paused')
          break
        case 'GAME_RESUME':
          setGameStatus('Playing')
          break
        case 'LEVEL_LOADED':
          setGameStatus('Level Loaded')
          if (onLevelLoaded) onLevelLoaded()
          break
        default:
          console.log('Unknown message from game:', event.data)
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [onLevelLoaded])

  // Function to send messages to the embedded game
  const sendGameMessage = (type: string, data?: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type, ...data }, 'https://frontend-mario.vercel.app')
    }
  }

  const handlePause = () => {
    sendGameMessage('PAUSE_GAME')
  }

  const handleResume = () => {
    sendGameMessage('RESUME_GAME')
  }

  const handleRestart = () => {
    sendGameMessage('RESET_GAME')
    setGameScore(0)
    setGameStatus('Ready')
  }

  const loadNewLevel = (dataUrl: string) => {
    // Send the data URL to the embedded game
    sendGameMessage('SET_LEVEL_DATA_URL', { dataUrl })
    setCurrentLevelUrl(dataUrl)
    setGameStatus('Loading Level...')
  }

  // Expose the loadNewLevel function via ref
  useImperativeHandle(ref, () => ({
    loadNewLevel
  }))

  return (
    <div className="game-panel">
      <div className="game-header">
        <div className="game-title">
          <h2>🎮 Mario Game Engine</h2>
          <span className={`game-status ${gameStatus.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
            {gameStatus}
          </span>
        </div>
        <div className="game-info">
          <span className="game-score">Score: {gameScore.toLocaleString()}</span>
        </div>
        <div className="game-controls">
          <button className="control-btn" onClick={handleRestart}>
            <span>🔄</span>
            Restart
          </button>
          <button className="control-btn" onClick={handlePause}>
            <span>⏸️</span>
            Pause
          </button>
          <button className="control-btn" onClick={handleResume}>
            <span>▶️</span>
            Resume
          </button>
        </div>
      </div>
      <div className="game-content">
        <iframe
          ref={iframeRef}
          title="Mario Game"
          className="game-iframe"
          frameBorder="0"
          allowFullScreen
          allow="gamepad; autoplay"
        />
      </div>
    </div>
  )
})

GamePanel.displayName = 'GamePanel'

export default GamePanel