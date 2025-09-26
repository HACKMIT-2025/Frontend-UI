import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import './GamePanel.css'

interface GamePanelProps {
  embedUrl?: string;
  jsonUrl?: string;
  levelId?: string;
  onLevelLoaded?: () => void;
}

interface GamePanelRef {
  loadNewLevel: (levelId: string) => void;
}


const GamePanel = forwardRef<GamePanelRef, GamePanelProps>(({ levelId, jsonUrl, onLevelLoaded }, ref) => {
  const [error, setError] = useState<string | null>(null)
  const [iframeUrl, setIframeUrl] = useState<string>('')

  // Build iframe URL for cloud gaming engine - prioritize ID mode
  useEffect(() => {
    const baseUrl = 'https://frontend-mario.vercel.app/embed'

    if (levelId) {
      // Use ID mode - direct level ID
      const url = `${baseUrl}?id=${levelId}`
      setIframeUrl(url)
      setError(null)
      onLevelLoaded?.()
      console.log('🎮 Loading game with Level ID:', levelId)
      console.log('🔗 Embed URL (ID mode):', url)
    } else if (jsonUrl) {
      // Fallback to JSON URL mode (legacy support)
      const url = `${baseUrl}?json=${encodeURIComponent(jsonUrl)}`
      setIframeUrl(url)
      setError(null)
      onLevelLoaded?.()
      console.log('🎮 Loading game with JSON URL:', jsonUrl)
      console.log('🔗 Embed URL (JSON mode):', url)
    } else {
      // Default URL without specific map
      setIframeUrl(baseUrl)
      console.log('🎮 Loading default game')
    }
  }, [levelId, jsonUrl, onLevelLoaded])

  // Initialize with default URL on component mount
  useEffect(() => {
    if (!levelId && !jsonUrl && !iframeUrl) {
      const baseUrl = 'https://frontend-mario.vercel.app/embed'
      setIframeUrl(baseUrl)
      console.log('🎮 Initialized with default game')
    }
  }, [])




  // Function to load new level (exposed via ref) - now using ID mode
  const loadNewLevel = (newLevelId: string) => {
    console.log('🔄 Loading new level with ID:', newLevelId)
    const baseUrl = 'https://frontend-mario.vercel.app/embed'
    const url = `${baseUrl}?id=${newLevelId}`
    setIframeUrl(url)
    setError(null)
    onLevelLoaded?.()
  }

  // Expose the loadNewLevel function via ref
  useImperativeHandle(ref, () => ({
    loadNewLevel
  }), [])


  return (
    <div className="game-panel">
      {/* Error display */}
      {error && (
        <div className="game-error">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      <div className="game-content">
        {iframeUrl && (
          <iframe
            src={iframeUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#000'
            }}
            title="Mario Game"
            allow="gamepad"
          />
        )}
        {!iframeUrl && (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '18px'
            }}
          >
            Loading game...
          </div>
        )}
      </div>
    </div>
  )
})

GamePanel.displayName = 'GamePanel'

export default GamePanel