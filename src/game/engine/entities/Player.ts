import { Entity } from './Entity'
import { SpriteLoader } from '../sprites/SpriteLoader'
import { AnimationController, AnimationPresets } from '../sprites/Animation'

export type PlayerSize = 'small' | 'big'
export type PlayerState = 'idle' | 'running' | 'jumping' | 'falling'

export class Player extends Entity {
  public size: PlayerSize = 'small'
  public state: PlayerState = 'idle'
  public invulnerable = false
  public fireballEnabled = false

  private invulnerableTime = 0
  private animationController: AnimationController
  private spriteLoader: SpriteLoader
  private facing: 'left' | 'right' = 'right'

  private jumpPower = 12
  private moveSpeed = 5
  private runSpeed = 8
  private isRunning = false

  constructor(x: number, y: number) {
    super(x, y, 32, 32, 'player')
    this.setPhysics({ solid: true, gravity: true, mass: 1 })

    // Initialize sprite system
    this.spriteLoader = SpriteLoader.getInstance()
    this.animationController = new AnimationController()

    // Setup animations for different directions
    this.animationController.addAnimation('idle_right', AnimationPresets.createPlayerIdleRightAnimation())
    this.animationController.addAnimation('idle_left', AnimationPresets.createPlayerIdleLeftAnimation())
    this.animationController.addAnimation('running_right', AnimationPresets.createPlayerRunRightAnimation())
    this.animationController.addAnimation('running_left', AnimationPresets.createPlayerRunLeftAnimation())
    this.animationController.addAnimation('jumping', AnimationPresets.createPlayerJumpAnimation())

    // Start with idle animation facing right
    this.animationController.playAnimation('idle_right')
  }

  public update(dt: number) {
    // Update state based on velocity
    if (this.velocity.y < -0.5) {
      this.state = 'jumping'
    } else if (this.velocity.y > 0.5) {
      this.state = 'falling'
    } else if (Math.abs(this.velocity.x) > 0.5) {
      this.state = 'running'
    } else {
      this.state = 'idle'
    }

    // Update animation based on state change or facing direction
    const currentAnimName = this.animationController.getCurrentAnimationName()
    let newAnimName = ''

    switch (this.state) {
      case 'idle':
        newAnimName = this.facing === 'left' ? 'idle_left' : 'idle_right'
        break
      case 'running':
        newAnimName = this.facing === 'left' ? 'running_left' : 'running_right'
        break
      case 'jumping':
      case 'falling':
        newAnimName = 'jumping'
        break
    }

    // Only change animation if it's different from current
    if (currentAnimName !== newAnimName) {
      this.animationController.playAnimation(newAnimName)
    }

    // Update animations
    this.animationController.update(dt)

    // Update invulnerability
    if (this.invulnerable && this.invulnerableTime > 0) {
      this.invulnerableTime -= dt * 1000
      if (this.invulnerableTime <= 0) {
        this.invulnerable = false
      }
    }

    // Update facing direction
    if (this.velocity.x > 0) this.facing = 'right'
    else if (this.velocity.x < 0) this.facing = 'left'
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!ctx) {
      console.warn('Player render called with invalid context')
      return
    }
    
    ctx.save()

    // Flash when invulnerable
    if (this.invulnerable && Math.floor(this.invulnerableTime / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5
    }

    // Keep aspect ratio similar to sprite (64x96), but scale to game size
    const height = this.size === 'big' ? 48 : 32
    const width = this.size === 'big' ? 32 : 21

    // Apply color tint for power-ups
    if (this.fireballEnabled) {
      ctx.filter = 'hue-rotate(30deg) saturate(1.2)' // Orange tint
    } else if (this.size === 'big') {
      ctx.filter = 'hue-rotate(0deg)' // Keep original colors
    }

    // Get current sprite name based on animation
    const currentAnimName = this.animationController.getCurrentAnimationName()
    let spriteName = 'player_idle_right' // default fallback

    // Map animation names to sprite names
    switch (currentAnimName) {
      case 'idle_left':
        spriteName = 'player_idle_left'
        break
      case 'idle_right':
        spriteName = 'player_idle_right'
        break
      case 'running_left':
        // Alternate between two running sprites
        const leftFrame = this.animationController.getCurrentFrame()
        spriteName = leftFrame === 0 ? 'player_run_left_01' : 'player_run_left_02'
        break
      case 'running_right':
        // Alternate between two running sprites
        const rightFrame = this.animationController.getCurrentFrame()
        spriteName = rightFrame === 0 ? 'player_run_right_01' : 'player_run_right_02'
        break
      case 'jumping':
        spriteName = 'player_jump'
        break
    }

    // Try to draw sprite, fallback to rectangle if failed
    const spriteDrawn = this.spriteLoader.drawSprite(
      ctx,
      spriteName,
      0, // Always use frame 0 since each sprite is a complete image
      this.position.x,
      this.position.y,
      width,
      height,
      false // No need to flip since we have separate left/right sprites
    )

    if (!spriteDrawn) {
      // Fallback to original rectangle rendering
      ctx.fillStyle = this.size === 'big' ? '#FF0000' : '#FF6B6B'
      if (this.fireballEnabled) {
        ctx.fillStyle = '#FFA500' // Orange when fire power
      }

      ctx.fillRect(this.position.x, this.position.y, width, height)

      // Draw eyes to show direction
      ctx.fillStyle = '#FFFFFF'
      const eyeOffset = this.facing === 'right' ? width - 12 : 5
      ctx.fillRect(this.position.x + eyeOffset, this.position.y + 8, 4, 4)
      ctx.fillRect(this.position.x + eyeOffset, this.position.y + 16, 4, 4)
    }

    ctx.restore()
  }

  public handleInput(input: any) {
    if (!input) return

    const speed = this.isRunning ? this.runSpeed : this.moveSpeed

    // Horizontal movement - respect wall collisions
    if (input.left && !this.wallCollision.left) {
      this.velocity.x = -speed
    } else if (input.right && !this.wallCollision.right) {
      this.velocity.x = speed
    }

    // Jump - respect ceiling collision
    if (input.jump && this.grounded && !this.ceilingCollision) {
      this.velocity.y = -this.jumpPower
    }

    // Variable jump height
    if (!input.jump && this.velocity.y < -6) {
      this.velocity.y = -6
    }

    // Run
    this.isRunning = input.run

    // Fireball
    if (input.action && this.fireballEnabled) {
      this.throwFireball()
    }
  }

  // Method to check if movement would cause collision (called by GameEngine)
  public wouldCollideWithPlatforms(deltaX: number, deltaY: number, platforms: any[]): boolean {
    const testPosition = {
      x: this.position.x + deltaX,
      y: this.position.y + deltaY,
      width: this.width,
      height: this.height
    }

    for (const platform of platforms) {
      const platformBox = {
        x: platform.position?.x ?? platform.x,
        y: platform.position?.y ?? platform.y,
        width: platform.width,
        height: platform.height
      }

      // Check AABB collision
      if (testPosition.x < platformBox.x + platformBox.width &&
          testPosition.x + testPosition.width > platformBox.x &&
          testPosition.y < platformBox.y + platformBox.height &&
          testPosition.y + testPosition.height > platformBox.y) {
        return true
      }
    }
    return false
  }

  public grow() {
    if (this.size === 'small') {
      this.size = 'big'
      this.height = 64
      // Adjust position so Mario's feet stay at the same level
      this.position.y -= 32
    }
  }

  public shrink() {
    if (this.size === 'big') {
      this.size = 'small'
      this.height = 32
      // Adjust position so Mario's feet stay at the same level
      this.position.y += 32
      this.makeInvulnerable(1500)
    }
  }

  public makeInvulnerable(duration: number) {
    this.invulnerable = true
    this.invulnerableTime = duration
  }

  public enableFireball() {
    this.fireballEnabled = true
    if (this.size === 'small') {
      this.grow()
    }
  }

  private throwFireball() {
    // TODO: Implement fireball throwing
    console.log('Fireball!')
  }

  public reset() {
    this.size = 'small'
    this.state = 'idle'
    this.invulnerable = false
    this.fireballEnabled = false
    this.velocity = { x: 0, y: 0 }
  }
}