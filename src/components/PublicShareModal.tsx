import React, { useState } from 'react'
import './PublicShareModal.css'

interface PublicShareModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (isPublic: boolean, publicName?: string) => void
  levelName: string
}

const PublicShareModal: React.FC<PublicShareModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  levelName
}) => {
  const [wantToShare, setWantToShare] = useState<boolean | null>(null)
  const [publicName, setPublicName] = useState('')

  const handleConfirm = () => {
    if (wantToShare === true) {
      // User wants to share publicly
      onConfirm(true, publicName.trim() || levelName)
    } else {
      // User doesn't want to share publicly
      onConfirm(false)
    }
    onClose()
  }

  const handleSkip = () => {
    onConfirm(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="public-share-modal">
        <div className="modal-header">
          <h2 className="modal-title">🎉 Map Created Successfully!</h2>
          <p className="modal-subtitle">
            Your hand-drawn map has been converted into a playable Mario level!
          </p>
        </div>

        <div className="modal-content">
          {wantToShare === null ? (
            <>
              <div className="share-question">
                <div className="question-icon">🌟</div>
                <h3>Would you like to share your map with the community?</h3>
                <p>
                  Sharing your map publicly will allow other players to discover and play your level.
                  You can always change this setting later.
                </p>
              </div>

              <div className="share-options">
                <button
                  className="btn-share-yes"
                  onClick={() => setWantToShare(true)}
                >
                  <span className="btn-icon">🌍</span>
                  Yes, Share Publicly
                </button>
                <button
                  className="btn-share-no"
                  onClick={() => setWantToShare(false)}
                >
                  <span className="btn-icon">🔒</span>
                  Keep Private
                </button>
              </div>
            </>
          ) : wantToShare ? (
            <>
              <div className="name-input-section">
                <div className="input-header">
                  <h3>Give your map a public name</h3>
                  <p>This name will be shown to other players in the community.</p>
                </div>

                <div className="input-group">
                  <label htmlFor="public-name">Map Name</label>
                  <input
                    id="public-name"
                    type="text"
                    value={publicName}
                    onChange={(e) => setPublicName(e.target.value)}
                    placeholder={levelName}
                    maxLength={50}
                    className="name-input"
                  />
                  <small className="input-hint">
                    {publicName.length}/50 characters
                  </small>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setWantToShare(null)}
                >
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirm}
                >
                  <span className="btn-icon">🚀</span>
                  Share Map
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="private-confirmation">
                <div className="confirmation-icon">🔒</div>
                <h3>Map will be kept private</h3>
                <p>
                  Your map will only be accessible to you. You can always make it public later
                  from your map settings.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setWantToShare(null)}
                >
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirm}
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-skip"
            onClick={handleSkip}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}

export default PublicShareModal