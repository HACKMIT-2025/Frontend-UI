import React, { useState } from 'react'
import './MapUploadModal.css'

interface MapUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File) => void
  isProcessing: boolean
}

const MapUploadModal: React.FC<MapUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isProcessing
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }


  const handleFile = (file: File) => {
    console.log('📱 handleFile called with:', file.name, file.type, file.size)
    if (file.type.startsWith('image/')) {
      console.log('📱 File is valid image, processing...')
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        console.log('📱 File read completed, setting preview')
        setPreviewUrl(reader.result as string)
      }
      reader.onerror = (error) => {
        console.log('📱 File read error:', error)
      }
      reader.readAsDataURL(file)
    } else {
      console.log('❌ File is not an image:', file.type)
      alert('请选择图片文件')
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
    }
  }


  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {!isProcessing && (
          <button className="modal-close" onClick={onClose}>
            <span>✕</span>
          </button>
        )}

        <div className="modal-content">
          {isProcessing ? (
            <div className="processing-container">
              <div className="processing-animation">
                <div className="scanner-line"></div>
                <div className="corner-brackets">
                  <span className="bracket top-left"></span>
                  <span className="bracket top-right"></span>
                  <span className="bracket bottom-left"></span>
                  <span className="bracket bottom-right"></span>
                </div>
                <div className="pulse-circles">
                  <div className="pulse-circle"></div>
                  <div className="pulse-circle"></div>
                  <div className="pulse-circle"></div>
                </div>
              </div>
              <h2 className="processing-title">Analyzing Your Map</h2>
              <p className="processing-subtitle">Detecting shapes and boundaries...</p>
              <div className="processing-steps">
                <div className="step active">
                  <span className="step-icon">🔍</span>
                  <span>Scanning image</span>
                </div>
                <div className="step">
                  <span className="step-icon">📐</span>
                  <span>Detecting shapes</span>
                </div>
                <div className="step">
                  <span className="step-icon">🎮</span>
                  <span>Generating level</span>
                </div>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="preview-container">
              <h2 className="modal-title">Review Your Map</h2>
              <div className="preview-image-container">
                <img src={previewUrl} alt="Map preview" className="preview-image" />
                <div className="preview-overlay">
                  <div className="preview-grid"></div>
                </div>
              </div>
              <div className="preview-info">
                <div className="info-item">
                  <span className="info-icon">📄</span>
                  <span className="info-text">{selectedFile?.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">📏</span>
                  <span className="info-text">
                    {selectedFile && `${(selectedFile.size / 1024).toFixed(1)} KB`}
                  </span>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => {
                  setPreviewUrl(null)
                  setSelectedFile(null)
                }}>
                  Choose Different
                </button>
                <button className="btn-primary" onClick={handleUpload}>
                  <span className="btn-icon">🚀</span>
                  Process Map
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="upload-header">
                <div className="icon-container">
                  <span className="upload-icon">🗺️</span>
                </div>
                <h2 className="modal-title">Upload Your Hand-Drawn Map</h2>
                <p className="modal-subtitle">
                  Draw your Mario level on paper and upload it here!
                </p>
              </div>

              <div
                className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >

                <div className="drop-zone-content">
                  <div className="upload-animation">
                    <svg className="upload-svg" viewBox="0 0 100 100">
                      <path
                        className="upload-path"
                        d="M50 20 L50 60 M35 45 L50 60 L65 45"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <rect
                        className="upload-border"
                        x="20"
                        y="70"
                        width="60"
                        height="20"
                        rx="5"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <p className="drop-text">
                    Drag & drop your map image here
                  </p>
                  <span className="drop-or">or</span>

                  {/* Simplified mobile-first file upload */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>

                    {/* Method 1: Simple label + input */}
                    <label
                      htmlFor="simple-file-input"
                      style={{
                        backgroundColor: '#52b788',
                        color: 'white',
                        padding: '1rem 2rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        textAlign: 'center',
                        minWidth: '200px',
                        WebkitTapHighlightColor: 'transparent',
                        userSelect: 'none'
                      }}
                      onClick={() => console.log('📱 Label clicked')}
                    >
                      📷 选择图片
                      <input
                        id="simple-file-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          console.log('📱 Simple input change:', e.target.files)
                          if (e.target.files && e.target.files[0]) {
                            console.log('📱 File selected:', e.target.files[0].name)
                            handleFile(e.target.files[0])
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {/* Method 2: Visible file input */}
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: '#888', fontSize: '14px', margin: '0.5rem 0' }}>或直接点击下方按钮：</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          console.log('📱 Visible input change:', e.target.files)
                          if (e.target.files && e.target.files[0]) {
                            console.log('📱 File selected via visible input:', e.target.files[0].name)
                            handleFile(e.target.files[0])
                          }
                        }}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#f0f0f0',
                          border: '2px solid #52b788',
                          borderRadius: '8px',
                          fontSize: '16px',
                          width: '100%',
                          maxWidth: '300px'
                        }}
                      />
                    </div>

                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapUploadModal