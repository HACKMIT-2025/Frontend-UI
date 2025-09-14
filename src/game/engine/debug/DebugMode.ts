export class DebugMode {
  private static instance: DebugMode
  public enabled = false
  public showCollisionBoxes = true
  public showPlatformLabels = true
  public showEntityInfo = true
  public showSpriteStatus = true

  private constructor() {}

  public static getInstance(): DebugMode {
    if (!DebugMode.instance) {
      DebugMode.instance = new DebugMode()
    }
    return DebugMode.instance
  }

  public toggle(): boolean {
    this.enabled = !this.enabled
    console.log(`🐛 Debug Mode: ${this.enabled ? 'ON' : 'OFF'}`)
    if (this.enabled) {
      console.log('Debug features:')
      console.log('- Red boxes show collision areas')
      console.log('- Platform labels show type')
      console.log('- Entity info shows position/velocity')
      console.log('- Sprite status shows render failures')
    }
    return this.enabled
  }

  public enable(): void {
    this.enabled = true
    console.log('🐛 Debug Mode: ON')
  }

  public disable(): void {
    this.enabled = false
    console.log('🐛 Debug Mode: OFF')
  }

  public drawCollisionBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label?: string,
    color: string = '#FF0000'
  ): void {
    if (!this.enabled || !this.showCollisionBoxes) return

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(x, y, width, height)

    if (label && this.showPlatformLabels) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillRect(x, y - 20, label.length * 8, 16)
      ctx.fillStyle = '#000000'
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(label, x + 2, y - 18)
    }

    ctx.restore()
  }

  public drawEntityInfo(
    ctx: CanvasRenderingContext2D,
    entity: any,
    x: number,
    y: number
  ): void {
    if (!this.enabled || !this.showEntityInfo) return

    const info = [
      `${entity.type || 'unknown'}`,
      `pos: ${Math.round(x)},${Math.round(y)}`,
      `vel: ${Math.round(entity.velocity?.x || 0)},${Math.round(entity.velocity?.y || 0)}`
    ]

    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(x, y - 50, 120, 50)

    ctx.fillStyle = '#00FF00'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    info.forEach((line, i) => {
      ctx.fillText(line, x + 2, y - 48 + i * 12)
    })

    ctx.restore()
  }

  public logSpriteFailure(spriteName: string, error: any): void {
    if (!this.enabled) return
    console.warn(`🖼️ Sprite failed: ${spriteName}`, error)
  }

  public logPlatformRender(platformType: string, spriteSuccess: boolean): void {
    if (!this.enabled || !this.showSpriteStatus) return
    const status = spriteSuccess ? '✅' : '❌'
    console.log(`${status} Platform: ${platformType} - sprite: ${spriteSuccess ? 'OK' : 'FAILED'}`)
  }
}