import React, { useState, useRef } from 'react'
// import Cropper from 'react-easy-crop'
// import type { Area } from 'react-easy-crop'
// import { gameAPI } from '../services/api'
import './MapUploadModal.css'

interface MapUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (files: File | File[]) => void
  isProcessing: boolean
  allowMultiple?: boolean  // Whether to allow multiple file upload
}

const MapUploadModal: React.FC<MapUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isProcessing,
  allowMultiple = false
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Detect if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768

  // Cropper disabled - always use direct upload
  // useEffect(() => {
  //   if (!allowMultiple) return
  //   if (selectedFiles.length === 1) {
  //     setShowCropper(true)
  //   } else if (selectedFiles.length > 1) {
  //     setShowCropper(false)
  //   }
  // }, [selectedFiles.length, allowMultiple])

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Check if we already have files and should append
      const appendMode = selectedFiles.length > 0 && allowMultiple
      handleFiles(Array.from(e.dataTransfer.files), appendMode)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📂 handleChange triggered')
    console.log('📂 Files selected:', e.target.files?.length)
    e.preventDefault()
    if (e.target.files && e.target.files.length > 0) {
      // Check if we already have files and should append
      const appendMode = selectedFiles.length > 0 && allowMultiple
      console.log('📂 appendMode:', appendMode, '(selectedFiles.length:', selectedFiles.length, ', allowMultiple:', allowMultiple, ')')
      handleFiles(Array.from(e.target.files), appendMode)

      // Reset input value to allow selecting the same file again
      if (appendMode) {
        console.log('📂 Resetting input value for append mode')
        e.target.value = ''
      }
    }
  }

  const handleButtonClick = () => {
    inputRef.current?.click()
  }

  const handleAddMore = () => {
    console.log('➕ Add More button clicked')
    console.log('➕ Current selectedFiles:', selectedFiles.length)
    console.log('➕ inputRef.current:', inputRef.current)
    // Trigger file input to add more images
    // Note: This may not work on all mobile devices
    inputRef.current?.click()
    console.log('➕ inputRef.current.click() called')
  }

  const handleAddMoreMobile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files), true) // Always append mode
      e.target.value = '' // Reset input to allow selecting again (fixes Chrome mobile issue)
    }
  }

  const handleFiles = (files: File[], appendMode = false) => {
    console.log('📥 handleFiles called with', files.length, 'files, appendMode:', appendMode)
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    console.log('📥 Image files filtered:', imageFiles.length)

    if (imageFiles.length === 0) {
      console.log('❌ No image files found')
      return
    }

    // If not allowing multiple, only take the first file
    const filesToProcess = allowMultiple ? imageFiles : [imageFiles[0]]
    console.log('📥 Files to process:', filesToProcess.length, '(allowMultiple:', allowMultiple, ')')

    // Append mode: add to existing files
    if (appendMode && allowMultiple) {
      setSelectedFiles(prev => [...prev, ...filesToProcess])

      // Load previews for new files only
      const loadPromises = filesToProcess.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
      })

      Promise.all(loadPromises).then(newUrls => {
        setPreviewUrls(prev => [...prev, ...newUrls])
        // showCropper is auto-managed by useEffect based on selectedFiles.length
      })
    } else {
      // Replace mode: clear and set new files
      setSelectedFiles(filesToProcess)

      // Load previews for all files
      const loadPromises = filesToProcess.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
      })

      Promise.all(loadPromises).then(urls => {
        setPreviewUrls(urls)
        // showCropper is auto-managed by useEffect based on selectedFiles.length
      })
    }
  }

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // Cropper functions removed - direct upload only
  // const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
  //   setCroppedAreaPixels(croppedAreaPixels)
  // }, [])
  //
  // const createCroppedImage = async (): Promise<File | null> => { ... }

  const handleUpload = async () => {
    console.log('🔘 handleUpload called, selectedFiles.length:', selectedFiles.length)
    try {
      setIsScanning(true)

      if (selectedFiles.length === 0) {
        console.log('❌ No files selected')
        setIsScanning(false)
        return
      }

      // Multiple files - upload directly for level pack
      if (allowMultiple && selectedFiles.length > 1) {
        console.log(`📤 Uploading ${selectedFiles.length} files for level pack creation...`)
        console.log('📤 Calling onUpload with files:', selectedFiles.map(f => f.name))
        onUpload(selectedFiles)
        console.log('📤 onUpload called successfully, closing modal...')
        onClose()
        return
      }

      // Single file - direct upload without cropping or enhancement
      if (selectedFiles.length === 1) {
        console.log('📤 Uploading single file directly:', selectedFiles[0].name)
        onUpload(selectedFiles[0])
        console.log('📤 onUpload called successfully, closing modal...')
        onClose()
        return
      }

      // No files selected
      console.log('❌ No files to upload')
      setIsScanning(false)
    } catch (error) {
      console.error('Error in handleUpload:', error)
      setIsScanning(false)
    }
  }


  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {!isProcessing && !isScanning && (
          <button className="modal-close" onClick={onClose}>
            <span>✕</span>
          </button>
        )}

        <div className="modal-content">
          {isProcessing || isScanning ? (
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
              <h2 className="processing-title">{isScanning ? 'Enhancing Document' : 'Analyzing Your Map'}</h2>
              <p className="processing-subtitle">
                {isScanning ? 'Converting to high-contrast black & white...' : 'OpenCV detecting shapes and boundaries...'}
              </p>
              <div className="processing-steps">
                <div className={`step ${isScanning ? 'active' : 'completed'}`}>
                  <span className="step-icon">⚫⚪</span>
                  <span>B&W Enhancement</span>
                </div>
                <div className={`step ${isProcessing && !isScanning ? 'active' : ''}`}>
                  <span className="step-icon">📐</span>
                  <span>Detecting shapes (⬡✕▲●)</span>
                </div>
                <div className="step">
                  <span className="step-icon">🎮</span>
                  <span>Generating level</span>
                </div>
              </div>
            </div>
          ) : previewUrls.length > 0 ? (
            <div className="preview-container">
              <h2 className="modal-title">
                {allowMultiple && selectedFiles.length > 1
                  ? `🎮 Review Your ${selectedFiles.length} Maps`
                  : '🎮 Review Your Map'}
              </h2>

              {/* Cropper disabled - always show preview */}
              {/* Multi-image preview grid */}
              {allowMultiple && selectedFiles.length > 1 ? (
                <div className="multi-images-preview-grid">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="multi-image-preview-item">
                      <img src={url} alt={`Map ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-preview-image"
                        onClick={() => removeImage(index)}
                        title="Remove this image"
                      >
                        ×
                      </button>
                      <span className="image-number">{index + 1}</span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Single image preview */
                <div className="preview-image-container">
                  <img src={previewUrls[0]} alt="Map preview" className="preview-image" />
                  <div className="preview-overlay">
                    <div className="preview-grid"></div>
                  </div>
                </div>
              )}

              <div className="preview-info">
                {allowMultiple && selectedFiles.length > 1 ? (
                  <>
                    <div className="info-item">
                      <span className="info-icon">📚</span>
                      <span className="info-text">{selectedFiles.length} images selected</span>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">🎯</span>
                      <span className="info-text">Will create {selectedFiles.length}-level pack</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="info-item">
                      <span className="info-icon">📄</span>
                      <span className="info-text">{selectedFiles[0]?.name}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">📏</span>
                      <span className="info-text">
                        {selectedFiles[0] && `${(selectedFiles[0].size / 1024).toFixed(1)} KB`}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => {
                  console.log('🔄 Choose Different clicked')
                  setPreviewUrls([])
                  setSelectedFiles([])
                }}>
                  Choose Different
                </button>
                {allowMultiple && (
                  <>
                    {/* Desktop: button with onClick */}
                    <button
                      className="btn-add-more desktop-only"
                      onClick={(e) => {
                        console.log('🖱️ Add More button CLICKED (desktop)')
                        console.log('🖱️ Event:', e)
                        handleAddMore()
                      }}
                      onMouseDown={(e) => console.log('🖱️ Add More MOUSEDOWN', e)}
                      onMouseUp={(e) => console.log('🖱️ Add More MOUSEUP', e)}
                    >
                      <span className="btn-icon">➕</span>
                      Add More
                    </button>
                    {/* Mobile: label with hidden input */}
                    <label htmlFor="add-more-input" className="btn-add-more mobile-only">
                      <span className="btn-icon">➕</span>
                      Add More
                      <input
                        id="add-more-input"
                        type="file"
                        accept="image/*"
                        multiple={allowMultiple}
                        onChange={handleAddMoreMobile}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </>
                )}
                <button
                  className="btn-primary"
                  onClick={(e) => {
                    console.log('🚀 Process Map button CLICKED')
                    console.log('🚀 Event:', e)
                    console.log('🚀 selectedFiles.length:', selectedFiles.length)
                    handleUpload()
                  }}
                  onMouseDown={(e) => console.log('🚀 Process Map MOUSEDOWN', e)}
                  onMouseUp={(e) => console.log('🚀 Process Map MOUSEUP', e)}
                >
                  <span className="btn-icon">🚀</span>
                  {allowMultiple && selectedFiles.length > 1
                    ? `Process ${selectedFiles.length} Maps`
                    : 'Process Map'}
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
                <div className="shape-hints">
                  <small>⬡ Hexagon=Start | ✕ Cross=End | ▲ Triangle=Spike | ● Circle=Coin | ■ Other=Platform</small>
                </div>
              </div>

              {/* Drag and drop zone */}
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
                  multiple={allowMultiple}
                  onChange={handleChange}
                  accept="image/*"
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
                </div>
              </div>

              {/* Upload button section - separate from drag zone */}
              <div className="upload-button-section">
                <span className="upload-or">or</span>
                {isMobile ? (
                  /* Mobile-friendly upload options */
                  <label
                    htmlFor="mobile-file-input"
                    className="mobile-upload-btn"
                  >
                    📷 Choose Image
                    <input
                      id="mobile-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFiles([e.target.files[0]])
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  /* Desktop beautiful Browse Files button */
                  <button className="browse-btn" onClick={handleButtonClick}>
                    Browse Files
                  </button>
                )}
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapUploadModal