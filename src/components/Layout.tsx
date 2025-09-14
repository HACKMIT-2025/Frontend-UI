import React, { useState, useRef } from 'react'
import GamePanel from './GamePanel'
import ChatPanel from './ChatPanel'
import './Layout.css'

const Layout: React.FC = () => {
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState<string | null>(null)
  const gamePanelRef = useRef<any>(null)

  const handleLevelGenerated = (embedUrl: string) => {
    setCurrentEmbedUrl(embedUrl)
    // If the game panel has a method to load new levels, call it
    if (gamePanelRef.current && gamePanelRef.current.loadNewLevel) {
      gamePanelRef.current.loadNewLevel(embedUrl)
    }
  }

  const handleLevelLoaded = () => {
    console.log('Level loaded in game panel')
  }

  return (
    <div className="layout">
      <div className="game-section">
        <GamePanel
          ref={gamePanelRef}
          embedUrl={currentEmbedUrl || undefined}
          onLevelLoaded={handleLevelLoaded}
        />
      </div>
      <div className="divider"></div>
      <div className="chat-section">
        <ChatPanel onLevelGenerated={handleLevelGenerated} />
      </div>
    </div>
  )
}

export default Layout