export interface AnimationFrame {
  frameIndex: number
  duration: number
}

export class Animation {
  private frames: AnimationFrame[]
  private currentFrame: number = 0
  private timer: number = 0
  private loop: boolean
  private playing: boolean = true

  constructor(frames: AnimationFrame[], loop: boolean = true) {
    this.frames = frames
    this.loop = loop
  }

  public update(dt: number): void {
    if (!this.playing || this.frames.length === 0) return

    this.timer += dt * 1000 // Convert to milliseconds

    const currentFrameData = this.frames[this.currentFrame]
    if (this.timer >= currentFrameData.duration) {
      this.timer = 0
      this.currentFrame++

      if (this.currentFrame >= this.frames.length) {
        if (this.loop) {
          this.currentFrame = 0
        } else {
          this.currentFrame = this.frames.length - 1
          this.playing = false
        }
      }
    }
  }

  public getCurrentFrame(): number {
    if (this.frames.length === 0) return 0
    return this.frames[this.currentFrame].frameIndex
  }

  public reset(): void {
    this.currentFrame = 0
    this.timer = 0
    this.playing = true
  }

  public play(): void {
    this.playing = true
  }

  public pause(): void {
    this.playing = false
  }

  public isPlaying(): boolean {
    return this.playing
  }

  public isFinished(): boolean {
    return !this.loop && this.currentFrame >= this.frames.length - 1 && !this.playing
  }
}

// Predefined animations for common game objects
export class AnimationPresets {
  public static createPlayerIdleRightAnimation(): Animation {
    return new Animation([
      { frameIndex: 0, duration: 1000 } // Standing still facing right
    ])
  }

  public static createPlayerIdleLeftAnimation(): Animation {
    return new Animation([
      { frameIndex: 0, duration: 1000 } // Standing still facing left
    ])
  }

  public static createPlayerRunRightAnimation(): Animation {
    return new Animation([
      { frameIndex: 0, duration: 200 }, // Running right frame 1
      { frameIndex: 1, duration: 200 }  // Running right frame 2
    ])
  }

  public static createPlayerRunLeftAnimation(): Animation {
    return new Animation([
      { frameIndex: 0, duration: 200 }, // Running left frame 1
      { frameIndex: 1, duration: 200 }  // Running left frame 2
    ])
  }

  public static createPlayerJumpAnimation(): Animation {
    return new Animation([
      { frameIndex: 0, duration: 1000 } // Jumping pose
    ])
  }

  public static createCoinAnimation(): Animation {
    return new Animation([
      { frameIndex: 0, duration: 150 },
      { frameIndex: 1, duration: 150 },
      { frameIndex: 2, duration: 150 },
      { frameIndex: 3, duration: 150 }
    ])
  }

  public static createGoombaWalkAnimation(): Animation {
    return new Animation([
      { frameIndex: 0, duration: 400 },
      { frameIndex: 1, duration: 400 }
    ])
  }
}

export class AnimationController {
  private animations: Map<string, Animation> = new Map()
  private currentAnimation: string | null = null

  public addAnimation(name: string, animation: Animation): void {
    this.animations.set(name, animation)
  }

  public playAnimation(name: string): void {
    if (this.currentAnimation === name) return

    const animation = this.animations.get(name)
    if (animation) {
      // Pause current animation
      if (this.currentAnimation) {
        const currentAnim = this.animations.get(this.currentAnimation)
        if (currentAnim) {
          currentAnim.pause()
        }
      }

      // Start new animation
      this.currentAnimation = name
      animation.reset()
      animation.play()
    }
  }

  public update(dt: number): void {
    if (this.currentAnimation) {
      const animation = this.animations.get(this.currentAnimation)
      if (animation) {
        animation.update(dt)
      }
    }
  }

  public getCurrentFrame(): number {
    if (this.currentAnimation) {
      const animation = this.animations.get(this.currentAnimation)
      if (animation) {
        return animation.getCurrentFrame()
      }
    }
    return 0
  }

  public getCurrentAnimationName(): string | null {
    return this.currentAnimation
  }
}