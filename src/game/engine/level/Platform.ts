export class Platform {
  public x: number
  public y: number
  public width: number
  public height: number
  public type: string
  public solid = true
  public breakable = false
  public isGoal = false
  public invisible = false

  constructor(x: number, y: number, width: number, height: number, type = 'normal') {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.type = type

    // Set properties based on type
    switch(type) {
      case 'platform':
        this.solid = true // Can be jumped through from below
        break
      case 'brick':
        this.breakable = true
        break
      case 'question':
        this.breakable = false
        break
      case 'goal_pipe':
        this.isGoal = true
        break
      case 'boundary':
        this.invisible = true
        this.solid = true
        break
    }
  }

  public getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    }
  }

  public contains(x: number, y: number): boolean {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  public intersects(other: Platform): boolean {
    return !(this.x + this.width < other.x ||
             other.x + other.width < this.x ||
             this.y + this.height < other.y ||
             other.y + other.height < this.y)
  }
}