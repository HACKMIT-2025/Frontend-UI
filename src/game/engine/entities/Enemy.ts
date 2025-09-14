import { Entity } from './Entity'

export class Enemy extends Entity {
  public enemyType: string
  private direction: number = 1
  private speed: number = 2
  private animationFrame = 0
  private animationTimer = 0
  public customSize?: number

  constructor(x: number, y: number, type: string, size?: number) {
    // Use custom size if provided, otherwise use type-based defaults
    let entitySize = size || (type === 'bowser' ? 64 : type === 'spike' ? 32 : 32)
    super(x, y, entitySize, entitySize, 'enemy')
    this.enemyType = type
    this.customSize = size
    this.setPhysics({ solid: true, gravity: true, mass: 1 })

    // Set speed based on enemy type
    switch(type) {
      case 'goomba':
        this.speed = 1
        break
      case 'koopa':
        this.speed = 1.5
        break
      case 'firebar':
        this.speed = 0
        this.setPhysics({ solid: false, gravity: false })
        break
      case 'bowser':
        this.speed = 0.5
        break
      case 'spike':
        this.speed = 0
        this.setPhysics({ solid: true, gravity: false, mass: 0 })
        break
    }
  }

  public update(dt: number) {
    // Simple patrol AI
    if (this.enemyType !== 'firebar') {
      this.velocity.x = this.speed * this.direction
    } else {
      // Firebar rotation
      this.animationFrame += dt * 5
    }

    // Animation
    this.animationTimer += dt
    if (this.animationTimer > 0.2) {
      this.animationFrame = (this.animationFrame + 1) % 4
      this.animationTimer = 0
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save()

    switch(this.enemyType) {
      case 'goomba':
        ctx.fillStyle = '#8B4513'
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        // Draw mushroom cap
        ctx.fillStyle = '#654321'
        ctx.fillRect(this.position.x - 4, this.position.y, this.width + 8, this.height / 2)
        break

      case 'koopa':
        ctx.fillStyle = '#00FF00'
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        // Draw shell pattern
        ctx.strokeStyle = '#008800'
        ctx.lineWidth = 2
        ctx.strokeRect(this.position.x + 4, this.position.y + 4, this.width - 8, this.height - 8)
        break

      case 'firebar':
        // Draw rotating fire bar
        ctx.translate(this.position.x + this.width/2, this.position.y + this.height/2)
        ctx.rotate(this.animationFrame)
        ctx.fillStyle = '#FF4500'
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(i * 20, -4, 16, 8)
        }
        break

      case 'bowser':
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
        // Draw spikes
        ctx.fillStyle = '#FFFF00'
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(this.position.x + i * 16, this.position.y - 8, 8, 8)
        }
        break

      case 'spike':
        // Draw triangular metallic gray spike that kills on contact
        ctx.fillStyle = '#696969' // Dark gray metallic color
        ctx.strokeStyle = '#404040' // Darker outline
        ctx.lineWidth = 2

        // Calculate spike triangle points
        const centerX = this.position.x + this.width / 2
        const baseY = this.position.y + this.height
        const tipY = this.position.y
        const leftX = this.position.x
        const rightX = this.position.x + this.width

        ctx.beginPath()
        ctx.moveTo(centerX, tipY)    // Top point
        ctx.lineTo(leftX, baseY)     // Bottom left
        ctx.lineTo(rightX, baseY)    // Bottom right
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Add metallic shine effect
        ctx.fillStyle = 'rgba(192, 192, 192, 0.7)' // Light gray shine
        ctx.beginPath()
        ctx.moveTo(centerX, tipY)
        ctx.lineTo(leftX + this.width * 0.3, baseY)
        ctx.lineTo(centerX - this.width * 0.1, baseY)
        ctx.closePath()
        ctx.fill()
        break

      default:
        ctx.fillStyle = '#FF00FF'
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height)
    }

    ctx.restore()
  }

  public turnAround() {
    this.direction *= -1
  }
}