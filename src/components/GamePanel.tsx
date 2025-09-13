import React, { useEffect, useRef } from 'react'
import './GamePanel.css'

const GamePanel: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = '../Frontend_Mario/mario-game/game.html'
    }
  }, [])

  return (
    <div className="game-panel">
      <div className="game-header">
        <div className="game-title">
          <h2>🎮 Mario Game Engine</h2>
          <span className="game-status">Running</span>
        </div>
        <div className="game-controls">
          <button className="control-btn" onClick={() => window.location.reload()}>
            <span>🔄</span>
            Restart
          </button>
          <button className="control-btn">
            <span>⚙️</span>
            Settings
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
        />
      </div>
    </div>
  )
}

export default GamePanel