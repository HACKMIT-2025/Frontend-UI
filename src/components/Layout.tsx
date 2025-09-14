import React, { useState, useRef } from 'react'
import GamePanel from './GamePanel'
import ChatPanel from './ChatPanel'
import './Layout.css'

const Layout: React.FC = () => {
  const [currentLevelDataUrl, setCurrentLevelDataUrl] = useState<string | null>(null)
  const gamePanelRef = useRef<any>(null)

  const handleLevelGenerated = (dataUrl: string) => {
    setCurrentLevelDataUrl(dataUrl)
    // If the game panel has a method to load new levels, call it
    if (gamePanelRef.current && gamePanelRef.current.loadNewLevel) {
      gamePanelRef.current.loadNewLevel(dataUrl)
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
          levelDataUrl={currentLevelDataUrl || undefined}
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