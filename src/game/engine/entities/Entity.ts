export interface EntityPhysics {
  solid: boolean
  gravity: boolean
  mass?: number
}

export abstract class Entity {
  public position: { x: number; y: number }
  public velocity: { x: number; y: number }
  public width: number
  public height: number
  public type: string
  public dead = false
  public grounded = false
  public physics: EntityPhysics | null = null
  public previousPosition?: { x: number; y: number }
  public wallCollision: { left: boolean; right: boolean } = { left: false, right: false }
  public ceilingCollision = false

  constructor(x: number, y: number, width: number, height: number, type: string) {
    this.position = { x, y }
    this.velocity = { x: 0, y: 0 }
    this.width = width
    this.height = height
    this.type = type
  }

  public abstract update(dt: number): void
  public abstract render(ctx: CanvasRenderingContext2D): void

  public getBounds() {
    return {
      left: this.position.x,
      right: this.position.x + this.width,
      top: this.position.y,
      bottom: this.position.y + this.height
    }
  }

  public setPhysics(physics: EntityPhysics) {
    this.physics = physics
  }
}