import { Entity } from './Entity'

export class PowerUp extends Entity {
  public powerType: string
  private animationFrame = 0
  private animationTimer = 0
  private emerging = true
  private emergeSpeed = 50
  private targetY: number

  constructor(x: number, y: number, type: string) {
    super(x, y, 28, 28, 'powerup')
    this.powerType = type
    this.targetY = y
    this.position.y = y + 32 // Start below block
    // Mushrooms and stars need solid collision to stand on platforms
    this.setPhysics({ solid: type === 'mushroom' || type === 'star', gravity: type !== 'flower' })
  }

  public update(dt: number) {
    // Emerge from block animation
    if (this.emerging) {
      this.position.y -= this.emergeSpeed * dt
      if (this.position.y <= this.targetY) {
        this.position.y = this.targetY
        this.emerging = false
        if (this.powerType === 'mushroom') {
          this.velocity.x = 2 // Start moving
        }
      }
    }

    // Animation
    this.animationTimer += dt
    if (this.animationTimer > 0.15) {
      this.animationFrame = (this.animationFrame + 1) % 4
      this.animationTimer = 0
    }

    // Star bouncing
    if (this.powerType === 'star' && !this.emerging) {
      if (this.grounded) {
        this.velocity.y = -8
      }
      this.velocity.x = 3
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save()

    switch(this.powerType) {
      case 'mushroom':
        // Red mushroom (Super Mushroom)
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height * 0.6)
        // White spots
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(this.position.x + 4, this.position.y + 4, 6, 6)
        ctx.fillRect(this.position.x + 18, this.position.y + 4, 6, 6)
        // Stem
        ctx.fillStyle = '#FFE4B5'
        ctx.fillRect(this.position.x + 8, this.position.y + 16, 12, 12)
        break

      case 'flower':
        // Fire Flower
        ctx.fillStyle = '#FF4500'
        // Petals
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2
          ctx.beginPath()
          ctx.arc(
            this.position.x + 14 + Math.cos(angle) * 8,
            this.position.y + 14 + Math.sin(angle) * 8,
            6, 0, Math.PI * 2
          )
          ctx.fill()
        }
        // Center
        ctx.fillStyle = '#FFFF00'
        ctx.beginPath()
        ctx.arc(this.position.x + 14, this.position.y + 14, 4, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'star':
        // Invincibility Star
        ctx.fillStyle = this.animationFrame % 2 === 0 ? '#FFD700' : '#FFFF00'
        ctx.translate(this.position.x + 14, this.position.y + 14)
        ctx.rotate(this.animationFrame * 0.5)
        // Draw star shape
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
          const radius = i % 2 === 0 ? 14 : 7
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        break

      case '1up':
        // 1-Up Mushroom
        ctx.fillStyle = '#00FF00'
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height * 0.6)
        // White spots
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(this.position.x + 4, this.position.y + 4, 6, 6)
        ctx.fillRect(this.position.x + 18, this.position.y + 4, 6, 6)
        // Stem
        ctx.fillStyle = '#FFE4B5'
        ctx.fillRect(this.position.x + 8, this.position.y + 16, 12, 12)
        break
    }

    ctx.restore()
  }
}