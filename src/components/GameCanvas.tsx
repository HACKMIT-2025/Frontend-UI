import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { GameAPI } from '../game/engine'
import { LevelLoader, type LevelLoadResult } from '../game/levelLoader'

export interface GameCanvasRef {
  loadLevel: (options: {
    jsonUrl?: string
    levelId?: string
    jsonData?: any
  }) => Promise<void>
  pauseGame: () => void
  resumeGame: () => void
  resetGame: () => void
  getGameState: () => {
    score: number
    lives: number
    coins: number
    isPlaying: boolean
    isPaused: boolean
  }
}

interface GameCanvasProps {
  onGameStateChange?: (state: {
    score: number
    lives: number
    coins: number
    status: 'loading' | 'ready' | 'playing' | 'paused' | 'game-over' | 'victory'
  }) => void
  onLevelLoaded?: (levelInfo: { id?: string, source: string }) => void
  onError?: (error: string) => void
  width?: number
  height?: number
}

const GameCanvas = forwardRef<GameCanvasRef, GameCanvasProps>(({
  onGameStateChange,
  onLevelLoaded,
  onError,
  width = 1024,
  height = 576
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameAPIRef = useRef<GameAPI | null>(null)
  const animationFrameRef = useRef<number>()
  const isInitializedRef = useRef<boolean>(false)

  // Build game from level data
  const buildGameFromLevelData = useCallback(async (levelResult: LevelLoadResult) => {
    const gameAPI = gameAPIRef.current
    if (!gameAPI) throw new Error('Game API not initialized')

    const levelData = levelResult.data
    console.log('🏗️ Building game from level data...', levelData)

    // Clear existing level
    gameAPI.clearLevel()

    // Set player starting position
    if (levelData.starting_points && levelData.starting_points.length > 0) {
      const startPoint = levelData.starting_points[0]
      gameAPI.setPlayerStart(startPoint.coordinates[0], startPoint.coordinates[1])
      console.log(`👨 Player start: (${startPoint.coordinates[0]}, ${startPoint.coordinates[1]})`)
    } else {
      gameAPI.setPlayerStart(100, 400)
    }

    // Add end points (goals)
    if (levelData.end_points && levelData.end_points.length > 0) {
      const endPoint = levelData.end_points[0]
      gameAPI.addGoalPipe?.(endPoint.coordinates[0], endPoint.coordinates[1])
      console.log(`🏁 Goal pipe: (${endPoint.coordinates[0]}, ${endPoint.coordinates[1]})`)
    }

    // Add rigid bodies (platforms and walls)
    if (levelData.rigid_bodies && levelData.rigid_bodies.length > 0) {
      levelData.rigid_bodies.forEach((body, index) => {
        if (body.contour_points && body.contour_points.length >= 3) {
          try {
            let polygonType = 'polygon'
            if (body.contour_points.length === 3) polygonType = 'triangle'
            else if (body.contour_points.length === 5) polygonType = 'pentagon'
            else if (body.contour_points.length === 6) polygonType = 'hexagon'

            gameAPI.addPolygon?.(body.contour_points, polygonType)
            console.log(`🔷 Added ${polygonType} (${body.contour_points.length} points)`)
          } catch (error) {
            console.warn(`⚠️ Failed to add polygon ${index}:`, error)
          }
        }
      })
    }

    // Add coins
    if (levelData.coins && levelData.coins.length > 0) {
      levelData.coins.forEach((coin) => {
        gameAPI.addCoin(coin.x, coin.y)
      })
      console.log(`🪙 Added ${levelData.coins.length} coins`)
    }

    // Add enemies
    if (levelData.enemies && levelData.enemies.length > 0) {
      levelData.enemies.forEach((enemy) => {
        gameAPI.addEnemy(enemy.x, enemy.y, enemy.type)
      })
      console.log(`👾 Added ${levelData.enemies.length} enemies`)
    }

    // Build and start the level
    await gameAPI.buildLevel()
    await gameAPI.startGame()
    console.log('✅ Level built and game started successfully')
  }, [])

  // Setup game event listeners
  const setupGameEventListeners = useCallback((gameAPI: GameAPI) => {
    // Monitor game state changes
    const checkGameState = () => {
      if (!gameAPI) return

      try {
        const gameState = {
          score: gameAPI.getScore() || 0,
          lives: 3, // Default since API doesn't expose this
          coins: 0, // Default since API doesn't expose this
          isPlaying: true, // Assume playing after start
          isPaused: false // Default state
        }

        let status: 'loading' | 'ready' | 'playing' | 'paused' | 'game-over' | 'victory' = 'playing'

        onGameStateChange?.({
          ...gameState,
          status
        })
      } catch (error) {
        console.warn('Error checking game state:', error)
      }

      animationFrameRef.current = requestAnimationFrame(checkGameState)
    }

    checkGameState()
  }, [onGameStateChange])

  // Load default level on initialization
  const loadDefaultLevel = useCallback(async () => {
    try {
      onGameStateChange?.({ score: 0, lives: 3, coins: 0, status: 'loading' })

      const levelResult = await LevelLoader.loadLevel()
      await buildGameFromLevelData(levelResult)

      onLevelLoaded?.(levelResult)
      onGameStateChange?.({ score: 0, lives: 3, coins: 0, status: 'ready' })
    } catch (error) {
      console.error('Failed to load default level:', error)
      onError?.(error instanceof Error ? error.message : 'Failed to load default level')
    }
  }, [onGameStateChange, onLevelLoaded, onError, buildGameFromLevelData])

  // Initialize game engine only once
  useEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return

    const initialize = async () => {
      try {
        console.log('🎮 Initializing Game Engine...')

        const gameAPI = new GameAPI(canvasRef.current!, {
          width,
          height,
          gravity: 0.5,
          fps: 60
        })

        gameAPIRef.current = gameAPI
        isInitializedRef.current = true

        // Set up game event listeners
        setupGameEventListeners(gameAPI)

        // Load default level
        await loadDefaultLevel()

        console.log('✅ Game Engine initialized successfully')

      } catch (error) {
        console.error('❌ Failed to initialize Game Engine:', error)
        onError?.(error instanceof Error ? error.message : 'Game initialization failed')
      }
    }

    initialize()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      // Don't null out gameAPIRef or set initialized to false here
      // as it will cause re-initialization
    }
  }, [setupGameEventListeners, loadDefaultLevel, width, height, onError])

  // Expose API methods through ref
  useImperativeHandle(ref, () => ({
    async loadLevel(options: {
      jsonUrl?: string
      levelId?: string
      jsonData?: any
    }) {
      try {
        onGameStateChange?.({ score: 0, lives: 3, coins: 0, status: 'loading' })

        const levelResult = await LevelLoader.loadLevel({
          jsonUrl: options.jsonUrl,
          levelId: options.levelId,
          jsonData: options.jsonData
        })

        await buildGameFromLevelData(levelResult)
        onLevelLoaded?.(levelResult)

        onGameStateChange?.({ score: 0, lives: 3, coins: 0, status: 'ready' })
      } catch (error) {
        console.error('Failed to load level:', error)
        onError?.(error instanceof Error ? error.message : 'Failed to load level')
      }
    },

    pauseGame() {
      gameAPIRef.current?.pauseGame()
    },

    resumeGame() {
      // Resume is handled by pauseGame() toggle in the current API
      gameAPIRef.current?.pauseGame()
    },

    resetGame() {
      gameAPIRef.current?.resetGame()
    },

    getGameState() {
      const gameAPI = gameAPIRef.current
      if (!gameAPI) {
        return { score: 0, lives: 3, coins: 0, isPlaying: false, isPaused: false }
      }

      return {
        score: gameAPI.getScore() || 0,
        lives: 3, // Default since API doesn't expose this
        coins: 0, // Default since API doesn't expose this
        isPlaying: true, // Default assumption
        isPaused: false // Default assumption
      }
    }
  }), [onGameStateChange, onLevelLoaded, onError, buildGameFromLevelData])

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="game-canvas"
        style={{
          border: '1px solid #ccc',
          backgroundColor: '#87CEEB',
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  )
})

GameCanvas.displayName = 'GameCanvas'

export default GameCanvas