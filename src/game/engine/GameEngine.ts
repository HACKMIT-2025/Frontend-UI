import { Renderer } from './render/Renderer'
import { PhysicsEngine } from './physics/PhysicsEngine'
import { EntityManager } from './entities/EntityManager'
import { InputManager } from './input/InputManager'
import { Camera } from './render/Camera'
import { Level } from './level/Level'
import { Player } from './entities/Player'
import { Platform } from './level/Platform'
import { Entity } from './entities/Entity'
import { SpriteLoader } from './sprites/SpriteLoader'

export interface GameConfig {
  width?: number
  height?: number
  gravity?: number
  fps?: number
}

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private renderer: Renderer
  private physics: PhysicsEngine
  private entityManager: EntityManager
  private inputManager: InputManager
  private camera: Camera
  private currentLevel: Level | null = null
  private player: Player | null = null

  private running = false
  private paused = false
  private lastTime = 0
  private deltaTime = 0
  private fps = 60
  private frameInterval: number

  private score = 0
  private lives = 3
  private coins = 0
  private spriteLoader: SpriteLoader
  private spritesInitialized = false

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to get 2D rendering context from canvas')
    }
    this.ctx = context

    // Set canvas size
    this.canvas.width = config.width || 1024
    this.canvas.height = config.height || 576

    // Initialize subsystems
    this.renderer = new Renderer(this.ctx, this.canvas.width, this.canvas.height)
    this.physics = new PhysicsEngine(config.gravity || 0.5)
    this.entityManager = new EntityManager()
    this.inputManager = new InputManager()
    this.camera = new Camera(this.canvas.width, this.canvas.height)
    this.spriteLoader = SpriteLoader.getInstance()

    this.fps = config.fps || 60
    this.frameInterval = 1000 / this.fps

    // Setup default demo level
    this.setupDemoLevel()
  }

  private setupDemoLevel() {
    this.currentLevel = new Level()

    const worldWidth = 3000
    const worldHeight = 600

    // Add invisible boundary walls to prevent wall clipping
    // Left boundary wall
    this.currentLevel.addPlatform(-50, -100, 50, worldHeight + 200, 'boundary')
    // Right boundary wall
    this.currentLevel.addPlatform(worldWidth, -100, 50, worldHeight + 200, 'boundary')
    // Top boundary (ceiling)
    this.currentLevel.addPlatform(-50, -100, worldWidth + 100, 50, 'boundary')

    // Add some platforms
    this.currentLevel.addPlatform(0, 500, 2000, 76, 'platform')
    this.currentLevel.addPlatform(300, 400, 100, 20, 'platform')
    this.currentLevel.addPlatform(500, 350, 150, 20, 'platform')
    this.currentLevel.addPlatform(750, 300, 100, 20, 'platform')

    // Add coins
    for (let i = 0; i < 10; i++) {
      this.currentLevel.addCoin(200 + i * 50, 350)
    }

    // Add enemies
    this.currentLevel.addEnemy(400, 450, 'goomba')
    this.currentLevel.addEnemy(600, 450, 'koopa')

    // Create player
    this.player = new Player(100, 400)
    this.entityManager.addEntity(this.player)

    // Load level entities
    this.loadLevel(this.currentLevel)
  }

  public loadLevel(level: Level) {
    this.currentLevel = level
    this.entityManager.clear()

    // Load level entities first
    level.getEntities().forEach(entity => {
      this.entityManager.addEntity(entity)
    })

    // Always add player back if exists
    if (this.player) {
      this.entityManager.addEntity(this.player)
    }
  }

  public async initialize() {
    if (!this.spritesInitialized) {
      console.log('Loading sprites...')
      try {
        await this.spriteLoader.initializeGameSprites()
        this.spritesInitialized = true
        console.log('Sprites loaded!')
      } catch (error) {
        console.warn('Failed to load sprites, falling back to basic rendering:', error)
        this.spritesInitialized = false
      }
    }
  }

  public async start() {
    if (this.running) return

    // Initialize sprites first
    await this.initialize()

    this.running = true
    this.paused = false
    this.lastTime = performance.now()
    this.gameLoop()
  }

  // Getters for debug access
  public getCurrentLevel() {
    return this.currentLevel
  }

  public getEntityManager() {
    return this.entityManager
  }

  public pause() {
    this.paused = !this.paused
  }

  public reset() {
    this.running = false
    this.paused = false
    this.score = 0
    this.lives = 3
    this.coins = 0
    this.entityManager.clear()
    this.setupDemoLevel()
    this.updateUI()
  }

  private gameLoop = () => {
    if (!this.running) return

    const currentTime = performance.now()
    const elapsed = currentTime - this.lastTime

    if (elapsed > this.frameInterval) {
      this.deltaTime = elapsed / 1000 // Convert to seconds

      if (!this.paused) {
        this.update(this.deltaTime)
        this.render()
      }

      this.lastTime = currentTime - (elapsed % this.frameInterval)
    }

    requestAnimationFrame(this.gameLoop)
  }

  private update(dt: number) {
    // IMPORTANT: Update entity manager to process pending adds/removes
    this.entityManager.update()

    // Update input
    const input = this.inputManager.getInput()

    // Update player with input
    if (this.player) {
      this.player.handleInput(input)
    }

    // Update physics for all entities
    const entities = this.entityManager.getEntities()
    const platforms = this.currentLevel?.getPlatforms() || []

    entities.forEach(entity => {
      this.physics.updateEntity(entity, dt, platforms)
    })

    // Check collisions
    this.checkCollisions()

    // Update entities
    entities.forEach(entity => {
      entity.update(dt)
      // Apply world boundaries
      this.enforceWorldBoundaries(entity)
    })

    // Update camera to follow player
    if (this.player) {
      this.camera.follow(this.player)
    }

    // Remove dead entities
    this.entityManager.removeDeadEntities()

    // Update UI
    this.updateUI()
  }

  private checkCollisions() {
    const entities = this.entityManager.getEntities()
    const platforms = this.currentLevel?.getPlatforms() || []
    const polygons = this.currentLevel?.getPolygons() || []

    // Note: Basic platform collisions are now handled by Swept AABB in updateEntity
    // We only need additional collision checks here

    // Check entity vs polygon collisions (still needed for complex shapes)
    entities.forEach(entity => {
      polygons.forEach(polygon => {
        this.physics.checkPolygonCollision(entity, polygon)
      })
    })

    // Check player vs other entities
    if (this.player) {
      entities.forEach(entity => {
        if (entity !== this.player && this.player && this.physics.checkEntityCollision(this.player, entity)) {
          this.handlePlayerCollision(entity)
        }
      })

      // Check for victory condition (player reaching goal pipe)
      platforms.forEach(platform => {
        if (platform.isGoal) {
          const overlap = this.checkPlayerPlatformOverlap(this.player!, platform)
          if (overlap) {
            console.log('🎉 Victory condition triggered!')
            this.victory()
          }
        }
      })
    }
  }

  private checkPlayerPlatformOverlap(player: Player, platform: Platform): boolean {
    return player.position.x < platform.x + platform.width &&
           player.position.x + player.width > platform.x &&
           player.position.y < platform.y + platform.height &&
           player.position.y + player.height > platform.y
  }

  private enforceWorldBoundaries(entity: Entity) {
    const worldWidth = 3000  // Match the ground width
    const worldHeight = 600  // Allow some space above and below

    // Store if collision occurred to prevent momentum issues
    let collisionOccurred = false

    // Horizontal boundaries - use similar logic to platform collision
    if (entity.position.x < 0) {
      // Check if entity was moving from inside the world
      const prevX = entity.previousPosition ? entity.previousPosition.x : entity.position.x - entity.velocity.x
      if (prevX >= 0) {
        // Entity was inside and moved out - proper collision
        entity.position.x = 0
        entity.velocity.x = 0  // Completely stop horizontal movement
        collisionOccurred = true
      } else {
        // Entity was already outside - just clamp position
        entity.position.x = 0
        entity.velocity.x = Math.max(0, entity.velocity.x)
      }
    } else if (entity.position.x + entity.width > worldWidth) {
      // Check if entity was moving from inside the world
      const prevX = entity.previousPosition ? entity.previousPosition.x : entity.position.x - entity.velocity.x
      if (prevX + entity.width <= worldWidth) {
        // Entity was inside and moved out - proper collision
        entity.position.x = worldWidth - entity.width
        entity.velocity.x = 0  // Completely stop horizontal movement
        collisionOccurred = true
      } else {
        // Entity was already outside - just clamp position
        entity.position.x = worldWidth - entity.width
        entity.velocity.x = Math.min(0, entity.velocity.x)
      }
    }

    // If collision occurred, also update previous position to prevent oscillation
    if (collisionOccurred && entity.previousPosition) {
      entity.previousPosition.x = entity.position.x
    }

    // Vertical boundaries (mainly for falling off the world)
    if (entity.position.y > worldHeight + 100) {
      // Entity fell off the world
      if (entity.type === 'player') {
        this.playerHit() // Player loses a life
      } else {
        entity.dead = true // Other entities just die
      }
    }
  }

  private handlePlayerCollision(entity: any) {
    if (!entity || !this.player) return
    
    if (entity.type === 'coin') {
      this.coins++
      this.score += 10
      entity.dead = true
    } else if (entity.type === 'enemy') {
      if (this.player.velocity.y > 0 && this.player.position.y < entity.position.y) {
        // Player jumping on enemy
        this.score += 100
        entity.dead = true
        this.player.velocity.y = -10 // Bounce
      } else {
        // Player hit by enemy
        this.playerHit()
      }
    } else if (entity.type === 'powerup') {
      this.handlePowerUp(entity.powerType)
      entity.dead = true
    }
  }

  private playerHit() {
    if (!this.player || this.player.invulnerable) return

    if (this.player.size === 'big') {
      this.player.shrink()
    } else {
      this.lives--
      if (this.lives <= 0) {
        this.gameOver()
      } else {
        this.respawnPlayer()
      }
    }
  }

  private respawnPlayer() {
    if (this.player) {
      this.player.position.x = 100
      this.player.position.y = 400
      this.player.velocity.x = 0
      this.player.velocity.y = 0
      this.player.makeInvulnerable(2000) // 2 seconds invulnerability
    }
  }

  private handlePowerUp(type: string) {
    if (!this.player) return
    
    switch(type) {
      case 'mushroom':
        this.player.grow()
        this.score += 50
        break
      case 'star':
        this.player.makeInvulnerable(10000) // 10 seconds
        this.score += 100
        break
      case 'flower':
        this.player.enableFireball()
        this.score += 50
        break
    }
  }

  private gameOver() {
    this.running = false
    console.log('Game Over! Score:', this.score)
    // TODO: Show game over screen
  }

  private victory() {
    this.running = false
    this.score += 1000 // Bonus points for completing level
    console.log('🎉 Victory! Score:', this.score)

    // Display victory message on canvas
    this.ctx.save()
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.fillStyle = '#FFD700'
    this.ctx.font = 'bold 48px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('🎉 VICTORY! 🎉', this.canvas.width / 2, this.canvas.height / 2 - 50)

    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '32px Arial'
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20)

    this.ctx.font = '20px Arial'
    this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 60)
    this.ctx.restore()
  }

  private render() {
    // Clear canvas
    this.renderer.clear()

    // Ensure entity manager is up to date before rendering
    this.entityManager.update()

    // Apply camera transform
    this.ctx.save()
    this.ctx.translate(-this.camera.x, -this.camera.y)

    // Render background
    this.renderer.renderBackground()

    // Render level
    if (this.currentLevel) {
      this.renderer.renderLevel(this.currentLevel)
    }

    // Render entities
    const entities = this.entityManager.getEntities()

    // Debug: Log entity count
    if (entities.length === 0) {
      console.warn('No entities to render!')
    }

    entities.forEach(entity => {
      this.renderer.renderEntity(entity)
    })

    this.ctx.restore()

    // Render UI (not affected by camera)
    this.renderer.renderUI({
      score: this.score,
      lives: this.lives,
      coins: this.coins
    })
  }

  private updateUI() {
    const scoreEl = document.getElementById('score')
    const livesEl = document.getElementById('lives')
    const coinsEl = document.getElementById('coins')

    if (scoreEl) scoreEl.textContent = this.score.toString()
    if (livesEl) livesEl.textContent = this.lives.toString()
    if (coinsEl) coinsEl.textContent = this.coins.toString()
  }

  // Public API methods
  public getPhysicsEngine() { return this.physics }
  public getCamera() { return this.camera }
  public getPlayer() { return this.player }
  public setPlayer(player: Player) {
    this.player = player
    this.entityManager.addEntity(player)
  }
  public addScore(points: number) { this.score += points }
  public addCoin() { this.coins++ }
  public addLife() { this.lives++ }
  public getScore(): number { return this.score }
  public getLives(): number { return this.lives }
  public getCoins(): number { return this.coins }
  public getPlatforms(): Platform[] {
    return this.currentLevel ? this.currentLevel.getPlatforms() : []
  }
  public getEntities(): Entity[] {
    return this.entityManager.getEntities()
  }
}