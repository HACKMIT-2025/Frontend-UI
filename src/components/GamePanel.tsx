import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import './GamePanel.css'

interface GamePanelProps {
  embedUrl?: string;
  jsonUrl?: string;
  onLevelLoaded?: () => void;
}

interface GamePanelRef {
  loadNewLevel: (jsonUrl: string) => void;
}


const GamePanel = forwardRef<GamePanelRef, GamePanelProps>(({ jsonUrl, onLevelLoaded }, ref) => {
  const [error, setError] = useState<string | null>(null)
  const [iframeUrl, setIframeUrl] = useState<string>('')

  // Build iframe URL for cloud gaming engine
  useEffect(() => {
    const baseUrl = 'https://frontend-mario.vercel.app/embed'

    if (jsonUrl) {
      // When JSON URL is provided, use embed mode with JSON parameter
      const url = `${baseUrl}?json=${encodeURIComponent(jsonUrl)}`
      setIframeUrl(url)
      setError(null)
      onLevelLoaded?.()
      console.log('🎮 Loading game with JSON URL:', jsonUrl)
      console.log('🔗 Embed URL:', url)
    } else {
      // Default URL without specific map
      setIframeUrl(baseUrl)
      console.log('🎮 Loading default game')
    }
  }, [jsonUrl, onLevelLoaded])

  // Initialize with default URL on component mount
  useEffect(() => {
    if (!jsonUrl && !iframeUrl) {
      const baseUrl = 'https://frontend-mario.vercel.app/embed'
      setIframeUrl(baseUrl)
      console.log('🎮 Initialized with default game')
    }
  }, [])




  // Function to load new level (exposed via ref)
  const loadNewLevel = (newJsonUrl: string) => {
    console.log('🔄 Loading new level with JSON:', newJsonUrl)
    const baseUrl = 'https://frontend-mario.vercel.app/embed'
    const url = `${baseUrl}?json=${encodeURIComponent(newJsonUrl)}`
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