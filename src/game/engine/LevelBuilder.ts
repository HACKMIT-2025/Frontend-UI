import { GameEngine } from './GameEngine'
import { Level } from './level/Level'
import { Player } from './entities/Player'

export interface LevelData {
  platforms: Array<{
    x: number
    y: number
    width: number
    height: number
    type?: string
  }>
  polygons: Array<{
    contours: number[][]
    type?: string
  }>
  enemies: Array<{
    x: number
    y: number
    type: string
  }>
  coins: Array<{
    x: number
    y: number
  }>
  powerUps: Array<{
    x: number
    y: number
    type: string
  }>
  playerStart: {
    x: number
    y: number
  }
}

export class LevelBuilder {
  private engine: GameEngine
  private levelData: LevelData = {
    platforms: [],
    polygons: [],
    enemies: [],
    coins: [],
    powerUps: [],
    playerStart: { x: 100, y: 400 }
  }

  constructor(engine: GameEngine) {
    this.engine = engine
    this.clear()
  }

  public clear(): this {
    this.levelData = {
      platforms: [],
      polygons: [],
      enemies: [],
      coins: [],
      powerUps: [],
      playerStart: { x: 100, y: 400 }
    }
    return this
  }

  public addPlatform(x: number, y: number, width: number, height: number, type = 'normal'): this {
    this.levelData.platforms.push({ x, y, width, height, type })
    return this
  }

  public addPolygon(contours: number[][], type = 'polygon'): this {
    this.levelData.polygons.push({ contours, type })
    return this
  }

  public addEnemy(x: number, y: number, type: string): this {
    this.levelData.enemies.push({ x, y, type })
    return this
  }

  public addCoin(x: number, y: number): this {
    this.levelData.coins.push({ x, y })
    return this
  }

  public addPowerUp(x: number, y: number, type: string): this {
    this.levelData.powerUps.push({ x, y, type })
    return this
  }

  public setPlayerStart(x: number, y: number): this {
    this.levelData.playerStart = { x, y }
    return this
  }

  public addPipe(x: number, y: number, height = 100, isGoal = false): this {
    this.addPlatform(x, y, 64, height, isGoal ? 'goal_pipe' : 'pipe')
    return this
  }

  public addBlock(x: number, y: number, type = 'brick'): this {
    this.addPlatform(x, y, 32, 32, type)
    return this
  }

  public addCoinRow(startX: number, y: number, count: number, spacing = 40): this {
    for (let i = 0; i < count; i++) {
      this.addCoin(startX + i * spacing, y)
    }
    return this
  }

  public addPlatformStairs(startX: number, startY: number, steps: number, stepWidth = 32, stepHeight = 32): this {
    for (let i = 0; i < steps; i++) {
      const width = stepWidth * (steps - i)
      const x = startX + i * stepWidth
      const y = startY - i * stepHeight
      this.addPlatform(x, y, width, stepHeight, 'brick')
    }
    return this
  }

  public addGapWithPlatforms(startX: number, y: number, _gapWidth: number, platformCount: number, platformWidth = 80, spacing = 120): this {
    for (let i = 0; i < platformCount; i++) {
      const x = startX + i * (platformWidth + spacing)
      this.addPlatform(x, y, platformWidth, 20, 'platform')
    }
    return this
  }

  public build(): Level {
    const level = new Level()

    // Add platforms
    this.levelData.platforms.forEach(p => {
      level.addPlatform(p.x, p.y, p.width, p.height, p.type)
    })

    // Add polygons
    this.levelData.polygons.forEach(p => {
      level.addPolygon(p.contours, p.type)
    })

    // Add coins
    this.levelData.coins.forEach(c => {
      level.addCoin(c.x, c.y)
    })

    // Add enemies
    this.levelData.enemies.forEach(e => {
      level.addEnemy(e.x, e.y, e.type)
    })

    // Add power-ups
    this.levelData.powerUps.forEach(p => {
      level.addPowerUp(p.x, p.y, p.type)
    })

    // Set player start position
    const player = new Player(this.levelData.playerStart.x, this.levelData.playerStart.y)
    this.engine.setPlayer(player)

    // Load level into engine
    this.engine.loadLevel(level)

    return level
  }

  // Preset level templates
  public loadPreset(preset: string): this {
    switch(preset) {
      case 'classic':
        this.createClassicLevel()
        break
      case 'underground':
        this.createUndergroundLevel()
        break
      case 'castle':
        this.createCastleLevel()
        break
      default:
        this.createClassicLevel()
    }
    return this
  }

  private createClassicLevel() {
    this.clear()

    // Ground
    this.addPlatform(0, 500, 3000, 76, 'platform')

    // First section - basic platforms and coins
    this.addCoinRow(200, 350, 5)
    this.addPlatform(300, 400, 100, 20, 'platform')

    // Pipe section
    this.addPipe(500, 400)
    this.addEnemy(450, 450, 'goomba')

    // Stairs
    this.addPlatformStairs(700, 500, 4)

    // Gap section with floating platforms
    this.addGapWithPlatforms(900, 350, 400, 3)
    this.addCoinRow(920, 300, 3)
    this.addCoinRow(1040, 300, 3)
    this.addCoinRow(1160, 300, 3)

    // Question blocks with power-ups
    this.addBlock(1400, 350, 'question')
    this.addPowerUp(1400, 350, 'mushroom')

    // Enemy section
    this.addEnemy(1500, 450, 'koopa')
    this.addEnemy(1600, 450, 'goomba')
    this.addEnemy(1700, 450, 'goomba')

    // Final section
    this.addPlatformStairs(2000, 500, 8)
    this.addPlatform(2300, 200, 100, 20, 'platform')
    this.addPowerUp(2350, 150, 'star')

    // Flag/End
    this.addPipe(2500, 400, 150)

    this.setPlayerStart(100, 400)
  }

  private createUndergroundLevel() {
    this.clear()

    // Underground floor and ceiling
    this.addPlatform(0, 550, 3000, 26, 'underground')
    this.addPlatform(0, 0, 3000, 50, 'underground')

    // Pipe entrance
    this.addPipe(100, 450)

    // Underground obstacles
    for (let i = 0; i < 10; i++) {
      const x = 300 + i * 200
      if (i % 2 === 0) {
        this.addPlatform(x, 450, 80, 100, 'underground')
      } else {
        this.addPlatform(x, 200, 80, 100, 'underground')
      }
      this.addCoin(x + 40, i % 2 === 0 ? 400 : 350)
    }

    // Enemies
    this.addEnemy(500, 500, 'goomba')
    this.addEnemy(900, 500, 'koopa')
    this.addEnemy(1300, 500, 'goomba')

    // Power-up
    this.addPowerUp(1500, 400, 'flower')

    // Exit pipe
    this.addPipe(2500, 450)

    this.setPlayerStart(200, 450)
  }

  private createCastleLevel() {
    this.clear()

    // Castle floor
    this.addPlatform(0, 550, 3000, 26, 'castle')

    // Lava pits with platforms
    for (let i = 0; i < 5; i++) {
      const x = 300 + i * 400
      this.addPlatform(x, 500, 50, 50, 'castle')
      this.addPlatform(x + 150, 450, 50, 100, 'castle')
      this.addPlatform(x + 300, 400, 50, 150, 'castle')
    }

    // Moving platforms (simulated as static for now)
    this.addPlatform(600, 350, 80, 20, 'platform')
    this.addPlatform(1000, 300, 80, 20, 'platform')
    this.addPlatform(1400, 350, 80, 20, 'platform')

    // Fire bars obstacles (enemies)
    this.addEnemy(800, 300, 'firebar')
    this.addEnemy(1200, 350, 'firebar')
    this.addEnemy(1600, 300, 'firebar')

    // Bowser at the end
    this.addEnemy(2400, 450, 'bowser')

    // Bridge to axe
    this.addPlatform(2200, 450, 300, 20, 'bridge')

    this.setPlayerStart(100, 450)
  }

  // Import level from JSON
  public importJSON(json: string): this {
    try {
      const data = JSON.parse(json)
      this.levelData = data
      return this
    } catch (e) {
      console.error('Failed to import level JSON:', e)
      return this
    }
  }

  // Export level to JSON
  public exportJSON(): string {
    return JSON.stringify(this.levelData, null, 2)
  }

  // Generate level from image recognition data
  public generateFromImageData(imageData: any[]): this {
    this.clear()

    // Parse image recognition data
    // Expected format: array of objects with type, x, y, width, height
    imageData.forEach(obj => {
      switch(obj.type) {
        case 'platform':
        case 'brick':
        case 'pipe':
          this.addPlatform(obj.x, obj.y, obj.width || 32, obj.height || 32, obj.type)
          break
        case 'coin':
          this.addCoin(obj.x, obj.y)
          break
        case 'enemy':
          this.addEnemy(obj.x, obj.y, obj.enemyType || 'goomba')
          break
        case 'powerup':
          this.addPowerUp(obj.x, obj.y, obj.powerType || 'mushroom')
          break
        case 'player':
          this.setPlayerStart(obj.x, obj.y)
          break
      }
    })

    return this
  }
}