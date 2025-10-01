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
          <p className="subtitle">Powered by advanced OpenCV computer vision technology for accurate shape recognition!</p>
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
              <h4>Hexagon = Starting Point</h4>
              <p>Draw a 6-sided shape where Mario begins. Keep the shape clear with 6 evenly-spaced sides.</p>
            </div>
          </div>

          <div className="shape-item">
            <div className="shape-icon cross">✕</div>
            <div className="shape-info">
              <h4>Cross/X = End Point</h4>
              <p>Draw an X or cross shape to mark the level's finish. Two diagonal lines should clearly intersect.</p>
            </div>
          </div>

          <div className="shape-item">
            <div className="shape-icon triangle">▲</div>
            <div className="shape-info">
              <h4>Triangle = Spikes/Hazards</h4>
              <p>Draw triangles for dangerous obstacles. Angles between 30-120 degrees, three clear sides.</p>
            </div>
          </div>

          <div className="shape-item">
            <div className="shape-icon circle">●</div>
            <div className="shape-info">
              <h4>Circle = Coins/Collectibles</h4>
              <p>Draw circles or dots for collectible coins. Keep them round and avoid making them too flat.</p>
            </div>
          </div>

          <div className="shape-item">
            <div className="shape-icon rectangle">■</div>
            <div className="shape-info">
              <h4>Other Shapes = Platforms/Walls</h4>
              <p>Draw rectangles, lines, or any other shapes for solid platforms and walls.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "💡 Pro Tips - Improve Recognition Accuracy",
      content: (
        <div className="tips-section">
          <div className="tip-item">
            <span className="tip-icon">🖊️</span>
            <p><strong>Use thick, dark lines</strong> - Bold markers work better than thin pens, at least 2-3mm width</p>
          </div>

          <div className="tip-item">
            <span className="tip-icon">📄</span>
            <p><strong>Pure white background</strong> - Use clean white paper for best contrast, avoid colored or grid paper</p>
          </div>

          <div className="tip-item">
            <span className="tip-icon">📏</span>
            <p><strong>Keep shapes separated</strong> - Maintain spacing between shapes, avoid overlapping. Minimum area 100 pixels</p>
          </div>

          <div className="tip-item">
            <span className="tip-icon">📸</span>
            <p><strong>Good, even lighting</strong> - Take photos in bright, uniform lighting, avoid shadows and glare</p>
          </div>

          <div className="tip-item">
            <span className="tip-icon">🎯</span>
            <p><strong>Size matters</strong> - Larger shapes are easier to detect accurately. Hexagons and crosses should be at least coin-sized</p>
          </div>

          <div className="tip-item">
            <span className="tip-icon">✏️</span>
            <p><strong>Shape standards</strong> - Hexagons need 6 clear sides, crosses need diagonal intersection, triangles need 3 distinct sides</p>
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
            <p>1. Draw a <strong>hexagon</strong> (⬡) on the left for the start</p>
            <p>2. Add <strong>rectangles</strong> (■) as platforms and ground</p>
            <p>3. Place <strong>circles</strong> (●) as collectible coins</p>
            <p>4. Add <strong>triangles</strong> (▲) as dangerous spikes</p>
            <p>5. Draw a <strong>cross</strong> (✕) on the right for the end</p>
          </div>
          <div className="technical-details">
            <h4>⚙️ Technical Details:</h4>
            <p>• <strong>Hexagon Detection</strong>: 6 sides, roughly equal length, ~120° angles</p>
            <p>• <strong>Cross Detection</strong>: 8-12 vertices, extending evenly in 4 directions</p>
            <p>• <strong>Triangle Detection</strong>: 3 vertices, angles 30-120°, reasonable side ratios</p>
            <p>• <strong>Circle Detection</strong>: Circularity &gt; 0.6 (circularity = 4π×area/perimeter²)</p>
          </div>
          <p className="final-tip">
            <strong>Remember:</strong> The AI works best with clear, well-drawn shapes on clean white paper!
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