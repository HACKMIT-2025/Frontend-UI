import React, { useEffect, useState } from 'react'
import './DrawingGuideModal.css'

interface DrawingGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

const DrawingGuideModal: React.FC<DrawingGuideModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: "🎮 Welcome to Mario Map Creator!",
      content: (
        <div className="welcome-step">
          <p>Transform your hand-drawn sketches into playable Mario levels!</p>
          <p>Our AI will recognize your drawings and create interactive game levels instantly.</p>
        </div>
      )
    },
    {
      title: "📝 Drawing Guide - Shapes & Meanings",
      content: (
        <div className="shapes-guide">
          <div className="shape-item">
            <div className="shape-icon hexagon">⬡</div>
            <div className="shape-info">
              <h4>Hexagon = Start Point</h4>
              <p>Draw a 6-sided shape where Mario begins the level</p>
            </div>
          </div>

          <div className="shape-item">
            <div className="shape-icon cross">✕</div>
            <div className="shape-info">
              <h4>Cross/X = End Point</h4>
              <p>Draw an X or cross shape where the level ends</p>
            </div>
          </div>

          <div className="shape-item">
            <div className="shape-icon triangle">▲</div>
            <div className="shape-info">
              <h4>Triangle = Spikes/Hazards</h4>
              <p>Draw triangles for dangerous obstacles that hurt Mario</p>
            </div>
          </div>

          <div className="shape-item">
            <div className="shape-icon circle">●</div>
            <div className="shape-info">
              <h4>Circle = Coins/Collectibles</h4>
              <p>Draw circles for coins Mario can collect</p>
            </div>
          </div>

          <div className="shape-item">
            <div className="shape-icon rectangle">■</div>
            <div className="shape-info">
              <h4>Other Shapes = Platforms/Walls</h4>
              <p>Draw rectangles, lines, or any other shapes for solid platforms</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "💡 Pro Tips for Better Recognition",
      content: (
        <div className="tips-section">
          <div className="tip-item">
            <span className="tip-icon">🖊️</span>
            <p><strong>Use thick, dark lines</strong> - Bold markers work better than thin pens</p>
          </div>

          <div className="tip-item">
            <span className="tip-icon">📄</span>
            <p><strong>White background</strong> - Use clean white paper for best contrast</p>
          </div>

          <div className="tip-item">
            <span className="tip-icon">📏</span>
            <p><strong>Make shapes clear</strong> - Keep shapes well-separated and avoid overlapping</p>
          </div>

          <div className="tip-item">
            <span className="tip-icon">📸</span>
            <p><strong>Good lighting</strong> - Take photos in bright, even lighting</p>
          </div>

          <div className="tip-item">
            <span className="tip-icon">🎯</span>
            <p><strong>Size matters</strong> - Larger shapes are easier to detect accurately</p>
          </div>
        </div>
      )
    },
    {
      title: "🚀 Ready to Create?",
      content: (
        <div className="ready-step">
          <p>Now you're ready to create amazing Mario levels!</p>
          <div className="example-layout">
            <h4>Example Layout:</h4>
            <p>1. Draw a hexagon (⬡) on the left for start</p>
            <p>2. Add rectangles (■) as platforms</p>
            <p>3. Place circles (●) as collectible coins</p>
            <p>4. Add triangles (▲) as dangerous spikes</p>
            <p>5. Draw a cross (✕) on the right for the end</p>
          </div>
          <p className="final-tip">
            <strong>Remember:</strong> The AI works best with clear, well-drawn shapes on white paper!
          </p>
        </div>
      )
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    onClose()
  }

  // Reset to first step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>×</button>

        <div className="modal-header">
          <h2>{steps[currentStep].title}</h2>
          <div className="step-indicator">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="modal-body">
          {steps[currentStep].content}
        </div>

        <div className="modal-footer">
          <button
            className="nav-button prev"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            ← Previous
          </button>

          <span className="step-counter">
            {currentStep + 1} / {steps.length}
          </span>

          {currentStep < steps.length - 1 ? (
            <button className="nav-button next" onClick={nextStep}>
              Next →
            </button>
          ) : (
            <button className="nav-button start" onClick={handleClose}>
              Start Creating! 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default DrawingGuideModal