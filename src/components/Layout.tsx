import React, { useState, useRef } from 'react'
import GamePanel from './GamePanel'
import ChatPanel from './ChatPanel'
import './Layout.css'

const Layout: React.FC = () => {
  const [currentLevelData, setCurrentLevelData] = useState<{
    jsonUrl?: string,
    embedUrl?: string,
    levelId?: string
  } | null>(null)
  const gamePanelRef = useRef<any>(null)

  const handleLevelGenerated = (levelData: {
    jsonUrl?: string,
    embedUrl?: string,
    levelId?: string
  }) => {
    setCurrentLevelData(levelData)
    console.log('🔄 Level data received in Layout:', levelData)

    // Load level using JSON URL (preferred) or fallback to embed URL
    if (gamePanelRef.current && gamePanelRef.current.loadNewLevel) {
      // Pass the JSON URL directly for native game loading
      const urlToLoad = levelData.jsonUrl || levelData.embedUrl
      if (urlToLoad) {
        gamePanelRef.current.loadNewLevel(urlToLoad)
      }
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
          jsonUrl={currentLevelData?.jsonUrl}
          embedUrl={currentLevelData?.embedUrl}
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