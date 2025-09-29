import React, { useState, useRef } from 'react'
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
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📱 File input change event triggered')
    console.log('📱 Files:', e.target.files)
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      console.log('📱 File selected:', e.target.files[0].name)
      handleFile(e.target.files[0])
    } else {
      console.log('❌ No file selected')
    }
  }

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile)
    }
  }

  const handleButtonClick = () => {
    console.log('📱 Mobile upload button clicked')
    console.log('📱 Input ref:', inputRef.current)
    if (inputRef.current) {
      inputRef.current.click()
      console.log('📱 Input click triggered')
    } else {
      console.log('❌ Input ref is null')
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
                <input
                  ref={inputRef}
                  type="file"
                  className="file-input"
                  multiple={false}
                  onChange={handleChange}
                  accept="image/*,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  capture="environment"
                />

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
                  <button className="browse-btn" onClick={handleButtonClick}>
                    Browse Files
                  </button>
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