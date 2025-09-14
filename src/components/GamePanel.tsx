import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import GameCanvas, { type GameCanvasRef } from './GameCanvas'
import './GamePanel.css'

interface GamePanelProps {
  embedUrl?: string;
  onLevelLoaded?: () => void;
}

interface GamePanelRef {
  loadNewLevel: (embedUrl: string) => void;
}

interface GameState {
  score: number
  lives: number
  coins: number
  status: 'loading' | 'ready' | 'playing' | 'paused' | 'game-over' | 'victory'
}

const GamePanel = forwardRef<GamePanelRef, GamePanelProps>(({ embedUrl, onLevelLoaded }, ref) => {
  const gameCanvasRef = useRef<GameCanvasRef>(null)
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    coins: 0,
    status: 'ready'
  })
  const [currentLevelInfo, setCurrentLevelInfo] = useState<{ id?: string, source: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Handle loading new level when embedUrl changes
  useEffect(() => {
    if (embedUrl && gameCanvasRef.current) {
      console.log('🎮 Loading game with embed URL:', embedUrl)

      // Check if it's a JSON URL or contains level data
      if (embedUrl.includes('.json') || embedUrl.includes('/api/levels/')) {
        // Direct JSON URL
        loadLevelFromUrl(embedUrl)
      } else if (embedUrl.includes('data_url=')) {
        // Extract JSON URL from embed URL
        const urlParams = new URLSearchParams(embedUrl.split('?')[1])
        const dataUrl = urlParams.get('data_url')
        if (dataUrl) {
          loadLevelFromUrl(dataUrl)
        } else {
          setError('Invalid embed URL: no data_url parameter found')
        }
      } else {
        // Try to parse as level ID
        const levelId = extractLevelId(embedUrl)
        if (levelId) {
          loadLevelFromId(levelId)
        } else {
          setError('Unable to parse level information from embed URL')
        }
      }
    }
  }, [embedUrl])

  // Extract level ID from various URL formats
  const extractLevelId = (url: string): string | null => {
    // Try different patterns
    const patterns = [
      /\/embed\/([^\/\?]+)/,  // /embed/levelId
      /\/play\/([^\/\?]+)/,   // /play/levelId
      /\/levels\/([^\/\?]+)/, // /levels/levelId
      /[?&]id=([^&]+)/,       // ?id=levelId or &id=levelId
      /[?&]level=([^&]+)/     // ?level=levelId or &level=levelId
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  // Load level from JSON URL
  const loadLevelFromUrl = async (jsonUrl: string) => {
    try {
      setError(null)
      await gameCanvasRef.current?.loadLevel({ jsonUrl })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load level from URL'
      setError(errorMessage)
      console.error('Failed to load level from URL:', error)
    }
  }

  // Load level from level ID
  const loadLevelFromId = async (levelId: string) => {
    try {
      setError(null)
      await gameCanvasRef.current?.loadLevel({ levelId })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load level by ID'
      setError(errorMessage)
      console.error('Failed to load level by ID:', error)
    }
  }

  // Handle game state changes from GameCanvas
  const handleGameStateChange = (newState: GameState) => {
    setGameState(newState)
  }

  // Handle level loaded from GameCanvas
  const handleLevelLoaded = (levelInfo: { id?: string, source: string }) => {
    setCurrentLevelInfo(levelInfo)
    setError(null)
    onLevelLoaded?.()
    console.log('🎮 Level loaded:', levelInfo)
  }

  // Handle errors from GameCanvas
  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  // Game control handlers
  const handlePause = () => {
    gameCanvasRef.current?.pauseGame()
  }

  const handleResume = () => {
    gameCanvasRef.current?.resumeGame()
  }

  const handleRestart = () => {
    gameCanvasRef.current?.resetGame()
    setError(null)
  }

  // Function to load new level (exposed via ref)
  const loadNewLevel = async (embedUrl: string) => {
    console.log('🔄 Loading new level:', embedUrl)

    if (embedUrl.includes('.json') || embedUrl.includes('/api/levels/')) {
      await loadLevelFromUrl(embedUrl)
    } else {
      const levelId = extractLevelId(embedUrl)
      if (levelId) {
        await loadLevelFromId(levelId)
      } else {
        setError('Unable to parse level information from URL')
      }
    }
  }

  // Expose the loadNewLevel function via ref
  useImperativeHandle(ref, () => ({
    loadNewLevel
  }), [])

  // Format game status for display
  const formatStatus = (status: GameState['status']): string => {
    switch (status) {
      case 'loading': return 'Loading...'
      case 'ready': return 'Ready'
      case 'playing': return 'Playing'
      case 'paused': return 'Paused'
      case 'game-over': return 'Game Over'
      case 'victory': return 'Victory!'
      default: return 'Ready'
    }
  }

  return (
    <div className="game-panel">
      <div className="game-header">
        <div className="game-title">
          <h2>🎮 Mario Game Engine</h2>
          <span className={`game-status ${gameState.status}`}>
            {formatStatus(gameState.status)}
          </span>
        </div>
        <div className="game-info">
          <span className="game-score">Score: {gameState.score.toLocaleString()}</span>
          <span className="game-lives">Lives: {gameState.lives}</span>
          <span className="game-coins">Coins: {gameState.coins}</span>
        </div>
        <div className="game-controls">
          <button className="control-btn" onClick={handleRestart}>
            <span>🔄</span>
            Restart
          </button>
          <button
            className="control-btn"
            onClick={handlePause}
            disabled={gameState.status !== 'playing'}
          >
            <span>⏸️</span>
            Pause
          </button>
          <button
            className="control-btn"
            onClick={handleResume}
            disabled={gameState.status !== 'paused'}
          >
            <span>▶️</span>
            Resume
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="game-error">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {/* Level info display */}
      {currentLevelInfo && (
        <div className="level-info">
          <span>🗺️ Level: {currentLevelInfo.id || 'Unknown'} ({currentLevelInfo.source})</span>
        </div>
      )}

      <div className="game-content">
        <GameCanvas
          ref={gameCanvasRef}
          onGameStateChange={handleGameStateChange}
          onLevelLoaded={handleLevelLoaded}
          onError={handleError}
          width={1024}
          height={576}
        />
      </div>
    </div>
  )
})

GamePanel.displayName = 'GamePanel'

export default GamePanel