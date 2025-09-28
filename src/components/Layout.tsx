import React, { useState, useRef, useEffect } from 'react'
import GamePanel from './GamePanel'
import ChatPanel from './ChatPanel'
import DrawingGuideModal from './DrawingGuideModal'
import './Layout.css'

const Layout: React.FC = () => {
  const [currentLevelData, setCurrentLevelData] = useState<{
    jsonUrl?: string,
    embedUrl?: string,
    levelId?: string
  } | null>(null)
  const gamePanelRef = useRef<any>(null)
  const [showGuideModal, setShowGuideModal] = useState(false)

  const handleLevelGenerated = (levelData: {
    jsonUrl?: string,
    embedUrl?: string,
    levelId?: string
  }) => {
    console.log('🔄 Layout handleLevelGenerated called with:', levelData)
    setCurrentLevelData(levelData)
    console.log('🔄 Level data received in Layout:', levelData)

    // Load level using ID mode (preferred) or fallback to URL mode
    if (gamePanelRef.current && gamePanelRef.current.loadNewLevel) {
      console.log('✅ GamePanel ref is available')
      if (levelData.levelId) {
        // Use ID mode - pass level ID directly
        console.log('🎮 About to call loadNewLevel with ID:', levelData.levelId)
        gamePanelRef.current.loadNewLevel(levelData.levelId)
        console.log('🎮 Loading level with ID:', levelData.levelId)
      } else {
        // Fallback to URL mode for legacy support
        const urlToLoad = levelData.jsonUrl || levelData.embedUrl
        if (urlToLoad) {
          console.log('🎮 About to call loadNewLevel with URL:', urlToLoad)
          gamePanelRef.current.loadNewLevel(urlToLoad)
          console.log('🎮 Loading level with URL:', urlToLoad)
        } else {
          console.log('❌ No levelId or URL to load')
        }
      }
    } else {
      console.log('❌ GamePanel ref is not available or loadNewLevel method missing')
    }
  }

  const handleLevelLoaded = () => {
    console.log('Level loaded in game panel')
  }

  // Show guide modal on every visit unless user opted out
  useEffect(() => {
    const dontShowAgain = localStorage.getItem('dontShowDrawingGuide')
    if (!dontShowAgain) {
      setShowGuideModal(true)
    }
  }, [])

  const handleCloseGuideModal = () => {
    setShowGuideModal(false)
  }

  return (
    <div className="layout">
      <div className="game-section">
        <GamePanel
          ref={gamePanelRef}
          levelId={currentLevelData?.levelId}
          jsonUrl={currentLevelData?.jsonUrl}
          embedUrl={currentLevelData?.embedUrl}
          onLevelLoaded={handleLevelLoaded}
        />
      </div>
      <div className="divider"></div>
      <div className="chat-section">
        <ChatPanel onLevelGenerated={handleLevelGenerated} />
      </div>

      <DrawingGuideModal
        isOpen={showGuideModal}
        onClose={handleCloseGuideModal}
      />
    </div>
  )
}

export default Layout