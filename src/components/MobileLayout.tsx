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

  const handleMapUpload = async (file: File) => {
    setUploadedFileName(file.name)
    setShowUploadModal(false)
    setShowAILoader(true)

    try {
      const result = await mapProcessing.processMap(file, (step: string, message: string) => {
        console.log(`Processing step: ${step} - ${message}`)
      })

      // Store result for when AI loader completes
      ;(window as any).mapProcessingResult = result
    } catch (error) {
      console.error('Map processing failed:', error)
      setShowAILoader(false)
      setShowUploadModal(true)
    }
  }

  const handleAILoaderComplete = () => {
    const result = (window as any).mapProcessingResult
    setShowAILoader(false)

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

          <div className="upload-instructions">
            <h3>绘图指南：</h3>
            <div className="instruction-item">⬡ <strong>六边形</strong> = 起始点</div>
            <div className="instruction-item">✕ <strong>十字/X</strong> = 终点</div>
            <div className="instruction-item">▲ <strong>三角形</strong> = 尖刺/危险</div>
            <div className="instruction-item">● <strong>圆形</strong> = 金币/收集品</div>
            <div className="instruction-item">■ <strong>其他形状</strong> = 平台/墙壁</div>
          </div>

          <button
            className="upload-button"
            onClick={() => setShowUploadModal(true)}
          >
            <span className="upload-icon">📤</span>
            <span>上传地图照片</span>
          </button>
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
              jsonUrl={currentLevelData?.jsonUrl}
              embedUrl={currentLevelData?.embedUrl}
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
      />
    </div>
  )
}

export default MobileLayout