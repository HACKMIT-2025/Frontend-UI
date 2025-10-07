import React, { useState, useRef, useEffect } from 'react'
import GamePanel from './GamePanel'
import MapUploadModal from './MapUploadModal'
import AICodeGeneratorLoader from './AICodeGeneratorLoader'
import DrawingGuideModal from './DrawingGuideModal'
import mapProcessing from '../services/mapProcessing'
import { gameAPI } from '../services/api'
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
  const [showGuideModal, setShowGuideModal] = useState(false)
  const gamePanelRef = useRef<any>(null)

  // Debug info
  console.log('📱 MobileLayout rendered')
  console.log('📱 showUploadModal:', showUploadModal)
  console.log('📱 gameLoaded:', gameLoaded)
  console.log('📱 User agent:', navigator.userAgent)
  console.log('📱 Screen width:', window.innerWidth)

  const handleMapUpload = async (files: File | File[]) => {
    // Mobile only supports single file
    const file = Array.isArray(files) ? files[0] : files

    if (!file) return

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

  const handleAILoaderComplete = async () => {
    const result = (window as any).mapProcessingResult
    setShowAILoader(false)

    console.log('🔍 Mobile HandleAILoaderComplete - result:', result)
    console.log('🔍 Mobile result?.success:', result?.success)
    console.log('🔍 Mobile result.level_id:', result.level_id)
    console.log('🔍 Mobile Condition check:', result?.success && result.level_id)

    if (result?.success && result.level_id) {
      try {
        // 手机模式：自动保存到数据库（public）
        console.log('📱 Auto-publishing level to database...')
        await gameAPI.saveLevel(
          `Mobile Level ${new Date().toLocaleString()}`,
          result.levelData || result.rawData,
          'medium'
        )
        console.log('📱 Level published to database successfully')

        // 直接跳转到游戏页面，而不是在 iframe 中加载
        const gameUrl = `https://frontend-mario.vercel.app/embed?id=${result.level_id}&mobile=true`
        console.log('📱 Redirecting to game page:', gameUrl)

        // 直接跳转
        window.location.href = gameUrl
      } catch (error) {
        console.error('📱 Error publishing level:', error)
        // 即使保存失败，也尝试跳转到游戏
        const gameUrl = `https://frontend-mario.vercel.app/embed?id=${result.level_id}&mobile=true`
        window.location.href = gameUrl
      }
    } else {
      // Show error and go back to upload
      console.error('📱 Upload processing failed:', result)
      alert('Upload processing failed, please try again')
      setShowUploadModal(true)
    }
  }

  const handleBackToUpload = () => {
    setGameLoaded(false)
    setCurrentLevelData(null)
    setShowUploadModal(true)
  }

  // Show guide modal on first visit unless user opted out
  useEffect(() => {
    const dontShowAgain = localStorage.getItem('dontShowDrawingGuide')
    if (!dontShowAgain) {
      setShowGuideModal(true)
    }
  }, [])

  const handleCloseGuideModal = () => {
    setShowGuideModal(false)
  }

  // Debug gameLoaded state changes
  useEffect(() => {
    console.log('📱 gameLoaded changed to:', gameLoaded)
    console.log('📱 currentLevelData:', currentLevelData)
  }, [gameLoaded, currentLevelData])

  return (
    <div className="mobile-layout">
      {!gameLoaded ? (
        // Initial upload screen
        <div className="upload-screen">
          <div className="upload-header">
            <h1>🎮 Mario Map Creator</h1>
            <p>Upload your hand-drawn Mario map</p>
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
              <span>Upload Map Photo</span>
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
              ← Back to Upload
            </button>
            <h2>Your Mario Level</h2>
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
              <span>Use on-screen controls or keyboard to control Mario</span>
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

      <DrawingGuideModal
        isOpen={showGuideModal}
        onClose={handleCloseGuideModal}
      />
    </div>
  )
}

export default MobileLayout