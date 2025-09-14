import React, { useState } from 'react'
import './PublishOptions.css'

interface PublishOptionsProps {
  levelId: string
  jsonUrl?: string
  embedUrl?: string
  gameUrl: string
  onPublish: (shouldPublish: boolean, metadata?: { title: string; description: string }) => void
  isPublishing?: boolean
}

const PublishOptions: React.FC<PublishOptionsProps> = ({
  levelId,
  jsonUrl: _jsonUrl,
  embedUrl: _embedUrl,
  gameUrl,
  onPublish,
  isPublishing = false
}) => {
  const [showCustomization, setShowCustomization] = useState(false)
  const [title, setTitle] = useState(`Mario Level ${levelId}`)
  const [description, setDescription] = useState('Hand-drawn Mario level created with AI')

  const handlePublish = () => {
    if (showCustomization) {
      onPublish(true, { title, description })
    } else {
      onPublish(true)
    }
  }

  const handleDecline = () => {
    onPublish(false)
  }

  const handleCustomize = () => {
    setShowCustomization(true)
  }

  if (isPublishing) {
    return (
      <div className="publish-options publishing">
        <div className="publishing-spinner">
          <div className="spinner"></div>
          <span>Publishing your map online...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="publish-options">
      <div className="publish-header">
        <div className="publish-icon">🌐</div>
        <div className="publish-title">Share Your Creation!</div>
      </div>

      <div className="publish-description">
        Would you like to publish your Mario level online so others can discover and play it?
      </div>

      {!showCustomization ? (
        <div className="publish-actions">
          <button className="btn-publish primary" onClick={handlePublish}>
            <span className="btn-icon">✨</span>
            Yes, Publish Online!
          </button>
          <button className="btn-customize" onClick={handleCustomize}>
            <span className="btn-icon">⚙️</span>
            Customize Details
          </button>
          <button className="btn-decline" onClick={handleDecline}>
            <span className="btn-icon">❌</span>
            Keep Private
          </button>
        </div>
      ) : (
        <div className="customization-form">
          <div className="form-group">
            <label htmlFor="level-title">Level Title:</label>
            <input
              id="level-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a catchy title for your level"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="level-description">Description:</label>
            <textarea
              id="level-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your level - what makes it special?"
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button className="btn-publish primary" onClick={handlePublish}>
              <span className="btn-icon">🚀</span>
              Publish Now
            </button>
            <button className="btn-back" onClick={() => setShowCustomization(false)}>
              <span className="btn-icon">←</span>
              Back
            </button>
            <button className="btn-decline" onClick={handleDecline}>
              <span className="btn-icon">❌</span>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="publish-benefits">
        <div className="benefit-item">
          <span className="benefit-icon">🎮</span>
          <span>Others can play your level</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">📊</span>
          <span>Track views and ratings</span>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">🏆</span>
          <span>Join the community gallery</span>
        </div>
      </div>

      <div className="level-preview">
        <div className="preview-label">Level Preview:</div>
        <div className="preview-details">
          <div className="detail-item">
            <span className="detail-label">Level ID:</span>
            <span className="detail-value">{levelId}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Game URL:</span>
            <span className="detail-value url">{gameUrl}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublishOptions