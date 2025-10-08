export interface SpriteFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface SpriteData {
  image: HTMLImageElement
  frames: SpriteFrame[]
}

export class SpriteLoader {
  private static instance: SpriteLoader
  private sprites: Map<string, SpriteData> = new Map()
  private loadedImages: Map<string, HTMLImageElement> = new Map()

  private constructor() {}

  public static getInstance(): SpriteLoader {
    if (!SpriteLoader.instance) {
      SpriteLoader.instance = new SpriteLoader()
    }
    return SpriteLoader.instance
  }

  public async loadImage(path: string): Promise<HTMLImageElement> {
    if (this.loadedImages.has(path)) {
      return this.loadedImages.get(path)!
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        console.log(`✅ Loaded sprite: ${path}`)
        this.loadedImages.set(path, img)
        resolve(img)
      }
      img.onerror = (error) => {
        console.error(`❌ Failed to load sprite: ${path}`, error)
        reject(new Error(`Failed to load image: ${path}`))
      }
      img.src = path
    })
  }

  public async loadSprite(name: string, path: string, frames: SpriteFrame[]): Promise<void> {
    try {
      const image = await this.loadImage(path)
      this.sprites.set(name, { image, frames })
    } catch (error) {
      console.warn(`🚨 Failed to load sprite '${name}' from '${path}':`, error)
      // Don't throw - let the game continue with fallback rendering
    }
  }

  public getSprite(name: string): SpriteData | null {
    return this.sprites.get(name) || null
  }

  public async initializeGameSprites(): Promise<void> {
    // Load individual character sprites (each image is 256x256, but character is centered)
    // We'll crop to the actual character area for better display
    const characterFrame = [{ x: 96, y: 80, width: 64, height: 96 }]

    await Promise.all([
      // Character animations (now from engine's own assets)
      this.loadSprite('player_idle_right', './assets/characters/player_right.png', characterFrame),
      this.loadSprite('player_idle_left', './assets/characters/player_left.png', characterFrame),
      this.loadSprite('player_jump', './assets/characters/player_jump.png', characterFrame),
      this.loadSprite('player_run_right_01', './assets/characters/player_run_right_01.png', characterFrame),
      this.loadSprite('player_run_right_02', './assets/characters/player_run_right_02.png', characterFrame),
      this.loadSprite('player_run_left_01', './assets/characters/player_run_left_01.png', characterFrame),
      this.loadSprite('player_run_left_02', './assets/characters/player_run_left_02.png', characterFrame),
      this.loadSprite('player_up', './assets/characters/player_up.png', characterFrame),
      this.loadSprite('player_down', './assets/characters/player_down.png', characterFrame)
    ])

    // Load individual tiles (now from engine's own assets)
    await Promise.all([
      this.loadSprite('grass', './assets/tiles/grass.png', [{ x: 0, y: 0, width: 32, height: 32 }]),
      this.loadSprite('brick', './assets/tiles/brick_block.png', [{ x: 0, y: 0, width: 32, height: 32 }]),
      this.loadSprite('question', './assets/tiles/question_block.png', [{ x: 0, y: 0, width: 32, height: 32 }]),
      this.loadSprite('pipe_top', './assets/tiles/pipe_top.png', [{ x: 0, y: 0, width: 64, height: 32 }]),
      this.loadSprite('pipe_body', './assets/tiles/pipe_body.png', [{ x: 0, y: 0, width: 32, height: 32 }]),
      this.loadSprite('super_mushroom', './assets/tiles/super_mushroom.png', [{ x: 0, y: 0, width: 32, height: 32 }]),
      this.loadSprite('goomba1', './assets/tiles/goomba_walk_01.png', [{ x: 0, y: 0, width: 32, height: 32 }]),
      this.loadSprite('goomba2', './assets/tiles/goomba_walk_02.png', [{ x: 0, y: 0, width: 32, height: 32 }]),
      this.loadSprite('terrain', './assets/tiles/terrain.png', [{ x: 0, y: 0, width: 32, height: 32 }]),
      this.loadSprite('mountain', './assets/tiles/mountain.png', [{ x: 0, y: 0, width: 128, height: 128 }]),
      this.loadSprite('tree', './assets/tiles/tree.png', [{ x: 0, y: 0, width: 64, height: 96 }]),
      this.loadSprite('water', './assets/tiles/water.png', [{ x: 0, y: 0, width: 32, height: 32 }])
    ])

    // Coins now use original rendering (no sprites needed)

    console.log('All game sprites loaded successfully!')
  }

  public drawSprite(
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    frameIndex: number,
    x: number,
    y: number,
    width?: number,
    height?: number,
    flipX: boolean = false
  ): boolean {
    const sprite = this.getSprite(spriteName)
    if (!sprite || frameIndex >= sprite.frames.length) {
      // Return false to indicate sprite drawing failed
      return false
    }

    const frame = sprite.frames[frameIndex]
    const drawWidth = width || frame.width
    const drawHeight = height || frame.height

    ctx.save()

    try {
      if (flipX) {
        ctx.translate(x + drawWidth, y)
        ctx.scale(-1, 1)
        ctx.drawImage(
          sprite.image,
          frame.x, frame.y, frame.width, frame.height,
          0, 0, drawWidth, drawHeight
        )
      } else {
        ctx.drawImage(
          sprite.image,
          frame.x, frame.y, frame.width, frame.height,
          x, y, drawWidth, drawHeight
        )
      }
      ctx.restore()
      return true
    } catch (error) {
      console.warn(`Failed to draw sprite ${spriteName}:`, error)
      ctx.restore()
      return false
    }
  }
}