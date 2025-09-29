import React, { useState, useRef } from 'react'
import GamePanel from './GamePanel'
import MapUploadModal from './MapUploadModal'
import AICodeGeneratorLoader from './AICodeGeneratorLoader'
import mapProcessing from '../services/mapProcessing'
import './MobileLayout.css'

const MobileLayout: React.FC = () => {
  const [currentLevelData, setCurrentLevelData] = useState<{
    jsonUrl?: string,
    embedUrl?: string,
    levelId?: string
  } | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(true)
  const [showAILoader, setShowAILoader] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [gameLoaded, setGameLoaded] = useState(false)
  const gamePanelRef = useRef<any>(null)

  // Debug info
  console.log('📱 MobileLayout rendered')
  console.log('📱 showUploadModal:', showUploadModal)
  console.log('📱 gameLoaded:', gameLoaded)
  console.log('📱 User agent:', navigator.userAgent)
  console.log('📱 Screen width:', window.innerWidth)

  const handleMapUpload = async (file: File) => {
    setUploadedFileName(file.name)
    setShowUploadModal(false)
    setShowAILoader(true)

    try {
      // Start processing and store result when done
      const result = await mapProcessing.processMap(file, (step: string, message: string) => {
        console.log(`Processing step: ${step} - ${message}`)
      })

      // Store result for when AI loader completes
      ;(window as any).mapProcessingResult = result
      ;(window as any).processingComplete = true
    } catch (error) {
      console.error('Map processing failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      ;(window as any).mapProcessingResult = { success: false, error: errorMessage }
      ;(window as any).processingComplete = true
    }
  }

  const handleAILoaderComplete = () => {
    const result = (window as any).mapProcessingResult
    setShowAILoader(false)

    console.log('🔍 Mobile HandleAILoaderComplete - result:', result)
    console.log('🔍 Mobile result?.success:', result?.success)
    console.log('🔍 Mobile result.level_id:', result.level_id)
    console.log('🔍 Mobile Condition check:', result?.success && result.level_id)

    if (result?.success && result.level_id) {
      // Generate URLs using ID mode (same as ChatPanel.tsx)
        const correctEmbedUrl = `https://frontend-mario.vercel.app/embed?id=${result.level_id}`;

      const levelData = {
        jsonUrl: correctEmbedUrl,
        embedUrl: correctEmbedUrl,
        levelId: result.level_id
      }

      setCurrentLevelData(levelData)
      setGameLoaded(true)

      // Load level in game panel
      if (gamePanelRef.current && gamePanelRef.current.loadNewLevel) {
        gamePanelRef.current.loadNewLevel(levelData.levelId)
      }
    } else {
      // Show error and go back to upload
      alert('上传处理失败，请重试')
      setShowUploadModal(true)
    }
  }

  const handleBackToUpload = () => {
    setGameLoaded(false)
    setCurrentLevelData(null)
    setShowUploadModal(true)
  }

  return (
    <div className="mobile-layout">
      {!gameLoaded ? (
        // Initial upload screen
        <div className="upload-screen">
          <div className="upload-header">
            <h1>🎮 Mario Map Creator</h1>
            <p>上传你的手绘马里奥地图</p>
          </div>


          <div style={{ margin: '1rem 0' }}>
            <button
              className="upload-button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('📱 Mobile upload button clicked!')
                console.log('📱 Event:', e)
                setShowUploadModal(true)
              }}
              onTouchStart={(e) => {
                console.log('📱 Touch start on upload button')
                console.log('📱 Touch event:', e)
              }}
              onTouchEnd={(e) => {
                console.log('📱 Touch end on upload button')
                console.log('📱 Touch event:', e)
              }}
              style={{
                minHeight: '60px',
                minWidth: '200px',
                fontSize: '18px',
                zIndex: 9999,
                position: 'relative'
              }}
            >
              <span className="upload-icon">📤</span>
              <span>上传地图照片</span>
            </button>

            {/* Test button */}
            <button
              onClick={() => {
                console.log('📱 Test button clicked!')
                alert('Test button works!')
              }}
              style={{
                backgroundColor: 'red',
                color: 'white',
                padding: '1rem',
                border: 'none',
                borderRadius: '8px',
                marginTop: '1rem',
                display: 'block',
                zIndex: 9999
              }}
            >
              测试按钮
            </button>
          </div>
        </div>
      ) : (
        // Fullscreen game view
        <div className="fullscreen-game">
          <div className="game-header">
            <button className="back-button" onClick={handleBackToUpload}>
              ← 返回上传
            </button>
            <h2>你的马里奥关卡</h2>
            <div className="level-info">
              {currentLevelData?.levelId && (
                <span>ID: {currentLevelData.levelId}</span>
              )}
            </div>
          </div>

          <div className="game-container">
            <GamePanel
              ref={gamePanelRef}
              levelId={currentLevelData?.levelId}
              jsonUrl={currentLevelData?.jsonUrl}
              embedUrl={currentLevelData?.embedUrl}
              isMobile={true}
              onLevelLoaded={() => console.log('Mobile level loaded')}
            />
          </div>

          <div className="game-controls">
            <div className="control-hint">
              <span>使用屏幕虚拟按键或键盘控制马里奥</span>
            </div>
          </div>
        </div>
      )}

      <MapUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleMapUpload}
        isProcessing={false}
      />

      <AICodeGeneratorLoader
        isVisible={showAILoader}
        onComplete={handleAILoaderComplete}
        uploadedFileName={uploadedFileName}
        autoComplete={false}
      />
    </div>
  )
}

export default MobileLayout