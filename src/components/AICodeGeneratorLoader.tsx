import React, { useState, useEffect } from 'react'
import './AICodeGeneratorLoader.css'

interface AICodeGeneratorLoaderProps {
  isVisible: boolean
  onComplete: () => void
  uploadedFileName?: string
}

const AICodeGeneratorLoader: React.FC<AICodeGeneratorLoaderProps> = ({
  isVisible,
  onComplete,
  uploadedFileName = "map_sketch.jpg"
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [currentCode, setCurrentCode] = useState('')
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  const steps = [
    {
      title: "🔍 Image Analysis",
      description: "Scanning uploaded image for geometric shapes...",
      duration: 1500,
      codes: [
        `import cv2\nimport numpy as np\n\nimg = cv2.imread('${uploadedFileName}')\ngray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)`,
        `# Preprocessing image...\nblurred = cv2.GaussianBlur(gray, (5, 5), 0)\nthresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)`,
        `# Finding contours...\ncontours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)\nprint(f"Found {len(contours)} potential shapes")`
      ]
    },
    {
      title: "🔶 Shape Detection",
      description: "Identifying hexagons, crosses, triangles, and circles...",
      duration: 2000,
      codes: [
        `class ShapeDetector:\n    def __init__(self):\n        self.shapes = []\n        self.confidence_threshold = 0.85`,
        `def is_hexagon(self, contour):\n    perimeter = cv2.arcLength(contour, True)\n    epsilon = 0.02 * perimeter\n    approx = cv2.approxPolyDP(contour, epsilon, True)\n    return len(approx) == 6`,
        `def is_triangle(self, contour):\n    # Analyzing triangle properties...\n    area = cv2.contourArea(contour)\n    if area < 100: return False\n    return self._validate_triangle_angles(contour)`,
        `# Processing detected shapes:\n✓ Hexagons: 1 found (Start Point)\n✓ Crosses: 1 found (End Point)\n✓ Triangles: 3 found (Spikes)\n✓ Circles: 5 found (Coins)`
      ]
    },
    {
      title: "🎮 Game Logic Generation",
      description: "Generating Mario level physics and game mechanics...",
      duration: 2500,
      codes: [
        `class GameEngine {\n  constructor() {\n    this.entities = [];\n    this.physics = new PhysicsEngine();\n    this.renderer = new Renderer();\n  }`,
        `// Creating player entity...\nconst mario = new Player({\n  x: startPosition.x,\n  y: startPosition.y,\n  sprite: 'mario_small',\n  lives: 3\n});`,
        `// Generating platforms...\nfor (const platform of rigidBodies) {\n  const entity = new Platform({\n    x: platform.x * SCALE_FACTOR,\n    y: platform.y * SCALE_FACTOR,\n    width: platform.width,\n    height: platform.height\n  });\n  this.entities.push(entity);\n}`,
        `// Adding spikes and hazards...\nfor (const spike of spikes) {\n  const hazard = new Spike({\n    position: spike.coordinates,\n    damage: 1,\n    collisionType: 'LETHAL'\n  });\n  this.entities.push(hazard);\n}`,
        `// Implementing collision detection...\nthis.physics.addCollisionHandler('player', 'platform', (player, platform) => {\n  player.onGround = true;\n  player.velocity.y = 0;\n});`
      ]
    },
    {
      title: "🌟 Level Optimization",
      description: "Optimizing level data and generating game assets...",
      duration: 1800,
      codes: [
        `// Level optimization pipeline...\nconst optimizer = new LevelOptimizer();\noptimizer.simplifyGeometry(platforms);\noptimizer.generateCollisionMesh();`,
        `// Texture generation...\nconst textureAtlas = new TextureAtlas();\ntextureAtlas.generateSprites(levelData);\ntextureAtlas.optimize();`,
        `// Audio system initialization...\nconst audioManager = new AudioManager();\naudioManager.loadSFX(['jump', 'coin', 'death']);\naudioManager.loadMusic('overworld_theme');`,
        `// Final level compilation...\nconst levelJson = {\n  id: generateLevelId(),\n  startPosition: hexagonCoords,\n  endPosition: crossCoords,\n  entities: compiledEntities,\n  physics: physicsConfig\n};`
      ]
    },
    {
      title: "🚀 Deployment Ready",
      description: "Level successfully generated and ready to play!",
      duration: 1000,
      codes: [
        `// Level validation complete ✓\n// Physics simulation: STABLE\n// Collision detection: OPTIMIZED\n// Game balance: VERIFIED`,
        `✓ Start point: Hexagon detected\n✓ End point: Cross detected  \n✓ Collectibles: ${Math.floor(Math.random() * 8) + 3} coins placed\n✓ Hazards: ${Math.floor(Math.random() * 5) + 2} spikes positioned`,
        `🎮 Your Mario level is ready!\n📊 Performance Score: ${Math.floor(Math.random() * 15) + 85}%\n🎯 Difficulty Rating: ${['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)]}\n\n🚀 Loading game engine...`
      ]
    }
  ]

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0)
      setProgress(0)
      setElapsedTime(0)
      return
    }

    // Random duration between 3-5 seconds
    const totalDuration = Math.floor(Math.random() * 2000) + 3000 // 3000-5000ms

    let progressTimer: number
    let codeTimer: number
    let timeTimer: number
    let stepTimer: number

    // Time counter
    const startTime = Date.now()
    const updateTime = () => {
      if (isVisible) {
        setElapsedTime(Date.now() - startTime)
        timeTimer = setTimeout(updateTime, 100)
      }
    }
    updateTime()

    // Progress animation - smooth from 0 to 100%
    const progressInterval = 50 // Update every 50ms
    let currentProgressValue = 0
    const progressIncrement = (100 * progressInterval) / totalDuration

    const updateProgress = () => {
      if (isVisible && currentProgressValue < 100) {
        currentProgressValue = Math.min(100, currentProgressValue + progressIncrement)
        setProgress(currentProgressValue)
        progressTimer = setTimeout(updateProgress, progressInterval)
      }
    }
    updateProgress()

    // Code animation - cycle through all codes
    let allCodes: string[] = []
    steps.forEach(step => {
      allCodes.push(...step.codes)
    })

    let codeIndex = 0
    const codeInterval = Math.floor(totalDuration / allCodes.length)

    const showNextCode = () => {
      if (codeIndex < allCodes.length && isVisible) {
        setCurrentCode(allCodes[codeIndex])
        // Update step based on code progress
        const stepIndex = Math.floor((codeIndex / allCodes.length) * steps.length)
        setCurrentStep(Math.min(stepIndex, steps.length - 1))

        codeIndex++
        if (codeIndex < allCodes.length) {
          codeTimer = setTimeout(showNextCode, codeInterval)
        }
      }
    }
    showNextCode()

    // Complete after duration
    stepTimer = setTimeout(() => {
      setProgress(100)
      setCurrentStep(steps.length - 1)
      setTimeout(() => {
        onComplete()
      }, 300)
    }, totalDuration)

    return () => {
      clearTimeout(stepTimer)
      clearTimeout(progressTimer)
      clearTimeout(codeTimer)
      clearTimeout(timeTimer)
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const milliseconds = Math.floor((ms % 1000) / 10)
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`
  }

  return (
    <div className="ai-loader-overlay">
      <div className="ai-loader-container">
        {/* Header */}
        <div className="ai-loader-header">
          <div className="ai-loader-title">
            <div className="ai-icon">🤖</div>
            <h2>AI Mario Level Generator</h2>
            <div className="loading-indicator">
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
            </div>
          </div>
          <div className="ai-stats">
            <div className="stat-item">
              <span className="stat-label">Processing</span>
              <span className="stat-value">{uploadedFileName}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Elapsed</span>
              <span className="stat-value">{formatTime(elapsedTime)}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="progress-section">
          <div className="progress-info">
            <div className="current-step">
              <span className="step-number">{currentStep + 1}/{steps.length}</span>
              <span className="step-title">{steps[currentStep]?.title}</span>
            </div>
            <div className="progress-percent">{Math.floor(progress)}%</div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
            <div className="progress-glow"></div>
          </div>
          <div className="step-description">{steps[currentStep]?.description}</div>
        </div>

        {/* Code Terminal */}
        <div className="code-terminal">
          <div className="terminal-header">
            <div className="terminal-controls">
              <span className="control-dot red"></span>
              <span className="control-dot yellow"></span>
              <span className="control-dot green"></span>
            </div>
            <div className="terminal-title">AI_LEVEL_GENERATOR.py</div>
          </div>
          <div className="terminal-body">
            <div className="code-content">
              <pre>
                <code>
                  <span className="typing-animation">{currentCode}</span>
                  <span className="cursor">|</span>
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* Neural Network Visualization */}
        <div className="neural-network">
          <div className="network-title">Neural Network Activity</div>
          <div className="network-nodes">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`network-node ${i % 3 === currentStep % 3 ? 'active' : ''}`}
                style={{
                  animationDelay: `${i * 100}ms`,
                  left: `${(i % 4) * 25}%`,
                  top: `${Math.floor(i / 4) * 40}%`
                }}
              ></div>
            ))}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="network-connection"
                style={{
                  left: `${(i % 3) * 30 + 10}%`,
                  top: `${Math.floor(i / 3) * 45 + 20}%`,
                  animationDelay: `${i * 150}ms`
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AICodeGeneratorLoader