import { GameEngine } from '../GameEngine'
import type { GameConfig } from '../GameEngine'
import { LevelBuilder } from '../LevelBuilder'

/**
 * GameAPI - Complete API interface for the Mario Game Engine
 * This provides a simplified interface for building and controlling games
 */
export class GameAPI {
  private engine: GameEngine
  private builder: LevelBuilder
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement | string, config?: GameConfig) {
    console.log('[GameAPI] Constructor called with:', { canvas, config })

    // Accept either canvas element or canvas ID
    if (typeof canvas === 'string') {
      console.log(`[GameAPI] Looking for canvas element with ID: ${canvas}`)
      const element = document.getElementById(canvas) as HTMLCanvasElement
      if (!element) {
        console.error(`[GameAPI] Canvas element with ID "${canvas}" not found`)
        throw new Error(`Canvas element with ID "${canvas}" not found`)
      }
      console.log('[GameAPI] Canvas element found')
      this.canvas = element
    } else {
      console.log('[GameAPI] Canvas element provided directly')
      this.canvas = canvas
    }

    // Initialize engine and builder
    console.log('[GameAPI] Creating GameEngine...')
    this.engine = new GameEngine(this.canvas, config)
    console.log('[GameAPI] GameEngine created successfully')

    console.log('[GameAPI] Creating LevelBuilder...')
    this.builder = new LevelBuilder(this.engine)
    console.log('[GameAPI] LevelBuilder created successfully')

    // Log initialization
    this.log('GameAPI initialized')
    console.log('[GameAPI] Initialization complete')
  }

  // ==================== LEVEL BUILDING API ====================

  /**
   * Add a platform to the level
   */
  addPlatform(x: number, y: number, width: number, height: number, type = 'normal'): this {
    this.builder.addPlatform(x, y, width, height, type)
    this.log(`Platform added at (${x}, ${y}) size: ${width}x${height} type: ${type}`)
    return this
  }

  /**
   * Add a polygon to the level
   */
  addPolygon(contours: number[][], type = 'polygon'): this {
    this.builder.addPolygon(contours, type)
    this.log(`Polygon added with ${contours.length} vertices`)
    return this
  }

  /**
   * Add an enemy to the level
   */
  addEnemy(x: number, y: number, type = 'goomba'): this {
    this.builder.addEnemy(x, y, type)
    this.log(`Enemy (${type}) added at (${x}, ${y})`)
    return this
  }

  /**
   * Add a coin to the level
   */
  addCoin(x: number, y: number): this {
    this.builder.addCoin(x, y)
    this.log(`Coin added at (${x}, ${y})`)
    return this
  }

  /**
   * Add a power-up to the level
   */
  addPowerUp(x: number, y: number, type = 'mushroom'): this {
    this.builder.addPowerUp(x, y, type)
    this.log(`PowerUp (${type}) added at (${x}, ${y})`)
    return this
  }

  /**
   * Set the player starting position
   */
  setPlayerStart(x: number, y: number): this {
    this.builder.setPlayerStart(x, y)
    this.log(`Player start position set to (${x}, ${y})`)
    return this
  }

  // ==================== HELPER METHODS ====================

  /**
   * Add a pipe
   */
  addPipe(x: number, y: number, height = 100, isGoal = false): this {
    this.builder.addPipe(x, y, height, isGoal)
    this.log(`Pipe added at (${x}, ${y}) height: ${height}${isGoal ? ' (GOAL)' : ''}`)
    return this
  }

  /**
   * Add a goal pipe (victory condition)
   */
  addGoalPipe(x: number, y: number, height = 100): this {
    return this.addPipe(x, y, height, true)
  }

  /**
   * Add a block
   */
  addBlock(x: number, y: number, type = 'brick'): this {
    this.builder.addBlock(x, y, type)
    this.log(`Block (${type}) added at (${x}, ${y})`)
    return this
  }

  /**
   * Add a row of coins
   */
  addCoinRow(startX: number, y: number, count: number, spacing = 40): this {
    this.builder.addCoinRow(startX, y, count, spacing)
    this.log(`Coin row added: ${count} coins at y=${y}`)
    return this
  }

  /**
   * Add platform stairs
   */
  addPlatformStairs(startX: number, startY: number, steps: number, stepWidth = 32, stepHeight = 32): this {
    this.builder.addPlatformStairs(startX, startY, steps, stepWidth, stepHeight)
    this.log(`Platform stairs added: ${steps} steps`)
    return this
  }

  /**
   * Add a gap with platforms
   */
  addGapWithPlatforms(startX: number, y: number, gapWidth: number, platformCount: number, platformWidth = 80, spacing = 120): this {
    this.builder.addGapWithPlatforms(startX, y, gapWidth, platformCount, platformWidth, spacing)
    this.log(`Gap with ${platformCount} platforms added`)
    return this
  }

  /**
   * Generate ground
   */
  generateGround(startX: number, endX: number, y: number): this {
    this.addPlatform(startX, y, endX - startX, 76, 'platform')
    return this
  }

  /**
   * Generate multiple platforms
   */
  generatePlatforms(count: number, startX: number, startY: number, spacingX: number, spacingY: number): this {
    for (let i = 0; i < count; i++) {
      const x = startX + i * spacingX
      const y = startY + (Math.sin(i) * spacingY)
      this.addPlatform(x, y, 80, 20)
    }
    this.log(`Generated ${count} platforms`)
    return this
  }

  /**
   * Generate enemies
   */
  generateEnemies(count: number, startX: number, endX: number, y: number): this {
    for (let i = 0; i < count; i++) {
      const x = startX + Math.random() * (endX - startX)
      const type = Math.random() > 0.5 ? 'goomba' : 'koopa'
      this.addEnemy(x, y, type)
    }
    this.log(`Generated ${count} enemies`)
    return this
  }

  // ==================== LEVEL CONTROL ====================

  /**
   * Build the current level
   */
  buildLevel(): this {
    this.builder.build()
    this.log('Level built')
    return this
  }

  /**
   * Clear the current level
   */
  clearLevel(): this {
    this.builder.clear()
    this.log('Level cleared')
    return this
  }

  /**
   * Load a preset level
   */
  loadPreset(preset: string): this {
    this.builder.loadPreset(preset)
    this.log(`Preset level loaded: ${preset}`)
    return this
  }

  /**
   * Import level from JSON
   */
  importJSON(json: string): this {
    this.builder.importJSON(json)
    this.log('Level imported from JSON')
    return this
  }

  /**
   * Export level to JSON
   */
  exportJSON(): string {
    const json = this.builder.exportJSON()
    this.log('Level exported to JSON')
    return json
  }

  /**
   * Generate level from AI/image recognition data
   */
  generateFromImageData(imageData: any[]): this {
    this.builder.generateFromImageData(imageData)
    this.log(`Level generated from ${imageData.length} image objects`)
    return this
  }

  // ==================== GAME CONTROL ====================

  /**
   * Start the game
   */
  async startGame(): Promise<this> {
    await this.engine.start()
    this.log('Game started')
    return this
  }

  /**
   * Pause/resume the game
   */
  pauseGame(): this {
    this.engine.pause()
    this.log('Game paused/resumed')
    return this
  }

  /**
   * Reset the game
   */
  resetGame(): this {
    this.engine.reset()
    this.log('Game reset')
    return this
  }

  // ==================== GETTERS ====================

  /**
   * Get the game engine instance
   */
  getEngine(): GameEngine {
    return this.engine
  }

  /**
   * Get current player score
   */
  getScore(): number {
    return this.engine.getScore ? this.engine.getScore() : 0
  }

  /**
   * Get platforms for debugging
   */
  getPlatforms(): any[] {
    return this.engine.getPlatforms ? this.engine.getPlatforms() : []
  }

  /**
   * Get entities for debugging
   */
  getEntities(): any[] {
    return this.engine.getEntities ? this.engine.getEntities() : []
  }

  /**
   * Get the level builder instance
   */
  getBuilder(): LevelBuilder {
    return this.builder
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  // ==================== UTILITY ====================

  /**
   * Log messages (can be disabled in production)
   */
  private log(message: string): void {
    if (typeof console !== 'undefined' && console.log) {
      console.log(`[GameAPI] ${message}`)
    }
  }

  /**
   * Enable/disable logging
   */
  setLogging(_enabled: boolean): this {
    // Logging control can be implemented here if needed
    // Currently logs are always enabled in development
    return this
  }

  // ==================== PRESET LEVELS ====================

  /**
   * Load classic level
   */
  loadClassicLevel(): this {
    return this.clearLevel()
      .generateGround(0, 3000, 500)
      .addPlatform(300, 400, 100, 20)
      .addPlatform(500, 350, 100, 20)
      .addPlatform(700, 300, 100, 20)
      .addPipe(900, 400)
      .addPipe(1100, 350, 150)
      .addPlatformStairs(1300, 500, 5)
      .addCoinRow(320, 350, 5)
      .addCoinRow(520, 300, 5)
      .addCoinRow(720, 250, 5)
      .addEnemy(400, 450, 'goomba')
      .addEnemy(600, 450, 'koopa')
      .addEnemy(800, 450, 'goomba')
      .addPowerUp(550, 300, 'mushroom')
      .addPowerUp(1400, 250, 'flower')
      .addPowerUp(1800, 200, 'star')
      .setPlayerStart(100, 400)
      .buildLevel()
  }

  /**
   * Load underground level
   */
  loadUndergroundLevel(): this {
    return this.clearLevel()
      .addPlatform(0, 550, 3000, 50, 'underground')
      .addPlatform(0, 0, 3000, 100, 'underground')
      .addPipe(100, 450)
      .generatePlatforms(10, 300, 350, 250, 100)
      .generateEnemies(4, 300, 2500, 500)
      .addPowerUp(750, 400, 'mushroom')
      .addPowerUp(1250, 150, 'flower')
      .addPowerUp(1750, 400, 'star')
      .addPipe(2600, 450)
      .setPlayerStart(200, 450)
      .buildLevel()
  }

  /**
   * Load sky level
   */
  loadSkyLevel(): this {
    return this.clearLevel()
      .addPlatform(0, 550, 200, 50, 'platform')
      .addPlatform(2800, 550, 200, 50, 'platform')
      .generatePlatforms(20, 200, 400, 130, 100)
      .addEnemy(500, 300, 'firebar')
      .addEnemy(1000, 250, 'firebar')
      .addEnemy(1500, 300, 'firebar')
      .addPowerUp(800, 200, 'star')
      .addPowerUp(1600, 200, 'flower')
      .setPlayerStart(50, 450)
      .buildLevel()
  }

  /**
   * Generate a random level
   */
  generateRandomLevel(): this {
    this.clearLevel()

    // Ground
    this.generateGround(0, 3000, 500)

    // Random platforms
    const platformCount = 8 + Math.floor(Math.random() * 7)
    for (let i = 0; i < platformCount; i++) {
      const x = 200 + Math.random() * 2600
      const y = 200 + Math.random() * 200
      const width = 60 + Math.random() * 60
      this.addPlatform(x, y, width, 20, 'platform')
    }

    // Random coins
    const coinGroups = 3 + Math.floor(Math.random() * 4)
    for (let i = 0; i < coinGroups; i++) {
      const x = 200 + Math.random() * 2600
      const y = 150 + Math.random() * 200
      const count = 3 + Math.floor(Math.random() * 5)
      this.addCoinRow(x, y, count)
    }

    // Random enemies
    const enemyCount = 4 + Math.floor(Math.random() * 6)
    this.generateEnemies(enemyCount, 300, 2700, 450)

    // Random power-ups
    const powerUpCount = 2 + Math.floor(Math.random() * 2)
    const powerUpTypes = ['mushroom', 'flower', 'star']
    for (let i = 0; i < powerUpCount; i++) {
      const x = 400 + Math.random() * 2200
      const y = 200 + Math.random() * 150
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
      this.addPowerUp(x, y, type)
    }

    // Random pipes
    const pipeCount = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < pipeCount; i++) {
      const x = 500 + Math.random() * 2000
      const height = 100 + Math.random() * 100
      this.addPipe(x, 500 - height, height)
    }

    this.setPlayerStart(100, 400)
    this.buildLevel()

    this.log('Random level generated')
    return this
  }
}

// Export as default for easy importing
export default GameAPI