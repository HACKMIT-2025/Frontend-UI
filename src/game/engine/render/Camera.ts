import { Entity } from '../entities/Entity'

export class Camera {
  public x: number = 0
  public y: number = 0
  private width: number
  private height: number
  private bounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  public follow(entity: Entity, _offsetX = -this.width/2, _offsetY = -this.height/2 + 100) {
    // Simple camera follow - keep player centered horizontally
    const targetX = entity.position.x - this.width / 2 + entity.width / 2
    const targetY = 0 // Lock Y axis to prevent vertical movement

    // Direct positioning to avoid drift issues
    this.x = targetX
    this.y = targetY

    // Apply world boundaries
    const worldWidth = 3000 // Match the level width
    this.x = Math.max(0, this.x) // Left boundary
    this.x = Math.min(worldWidth - this.width, this.x) // Right boundary
    this.y = 0 // Keep Y locked

    // Apply additional bounds if set
    if (this.bounds) {
      this.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX - this.width, this.x))
      this.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY - this.height, this.y))
    }
  }

  public setBounds(minX: number, maxX: number, minY: number, maxY: number) {
    this.bounds = { minX, maxX, minY, maxY }
  }

  public removeBounds() {
    this.bounds = null
  }

  public setPosition(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public move(dx: number, dy: number) {
    this.x += dx
    this.y += dy
  }

  public getViewport() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    }
  }

  public isInView(x: number, y: number, width: number, height: number): boolean {
    const viewport = this.getViewport()
    return !(x + width < viewport.left ||
             x > viewport.right ||
             y + height < viewport.top ||
             y > viewport.bottom)
  }

  public reset() {
    this.x = 0
    this.y = 0
  }

  public shake(intensity = 5, duration = 500) {
    const startTime = Date.now()
    const originalX = this.x
    const originalY = this.y

    const shakeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > duration) {
        clearInterval(shakeInterval)
        this.x = originalX
        this.y = originalY
        return
      }

      const decay = 1 - (elapsed / duration)
      this.x = originalX + (Math.random() - 0.5) * intensity * decay
      this.y = originalY + (Math.random() - 0.5) * intensity * decay
    }, 16)
  }
}