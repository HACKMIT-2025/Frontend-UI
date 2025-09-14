/**
 * SoundEffect Class - Individual sound effect management
 * Handles loading, playing, and controlling individual sound effects
 */

export interface SoundOptions {
  volume?: number
  loop?: boolean
  playbackRate?: number
  preload?: boolean
}

export class SoundEffect {
  private audio: HTMLAudioElement
  private _volume: number = 1
  private _loaded: boolean = false
  private _error: boolean = false
  private loadPromise: Promise<void> | null = null

  constructor(
    public readonly name: string,
    public readonly src: string,
    private options: SoundOptions = {}
  ) {
    this.audio = new Audio()
    this._volume = options.volume ?? 1

    // Set initial properties
    this.audio.loop = options.loop ?? false
    this.audio.playbackRate = options.playbackRate ?? 1.0
    this.audio.volume = this._volume
    this.audio.preload = options.preload ? 'auto' : 'metadata'

    // Set up event listeners
    this.setupEventListeners()

    // Load the audio file
    this.audio.src = src
    if (options.preload) {
      this.load()
    }
  }

  private setupEventListeners(): void {
    this.audio.addEventListener('canplaythrough', () => {
      this._loaded = true
      this._error = false
    })

    this.audio.addEventListener('error', (e) => {
      this._error = true
      this._loaded = false
      console.error(`Failed to load sound: ${this.name}`, e)
    })

    this.audio.addEventListener('loadstart', () => {
      this._loaded = false
      this._error = false
    })
  }

  /**
   * Load the audio file
   */
  async load(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (this._loaded) {
        resolve()
        return
      }

      const onCanPlay = () => {
        this._loaded = true
        this.audio.removeEventListener('canplaythrough', onCanPlay)
        this.audio.removeEventListener('error', onError)
        resolve()
      }

      const onError = (_e: Event) => {
        this._error = true
        this.audio.removeEventListener('canplaythrough', onCanPlay)
        this.audio.removeEventListener('error', onError)
        reject(new Error(`Failed to load sound: ${this.name}`))
      }

      this.audio.addEventListener('canplaythrough', onCanPlay)
      this.audio.addEventListener('error', onError)

      // Trigger loading if not already loading
      if (this.audio.readyState === 0) {
        this.audio.load()
      }
    })

    return this.loadPromise
  }

  /**
   * Play the sound effect
   */
  async play(options?: { volume?: number; playbackRate?: number }): Promise<void> {
    try {
      // Ensure the audio is loaded
      if (!this._loaded && !this._error) {
        await this.load()
      }

      if (this._error) {
        console.warn(`Cannot play sound ${this.name}: audio failed to load`)
        return
      }

      // Apply temporary options
      if (options?.volume !== undefined) {
        this.audio.volume = Math.max(0, Math.min(1, options.volume))
      } else {
        this.audio.volume = this._volume
      }

      if (options?.playbackRate !== undefined) {
        this.audio.playbackRate = Math.max(0.25, Math.min(4.0, options.playbackRate))
      }

      // Reset to beginning and play
      this.audio.currentTime = 0
      await this.audio.play()
    } catch (error) {
      console.warn(`Failed to play sound ${this.name}:`, error)
    }
  }

  /**
   * Stop the sound effect
   */
  stop(): void {
    try {
      this.audio.pause()
      this.audio.currentTime = 0
    } catch (error) {
      console.warn(`Failed to stop sound ${this.name}:`, error)
    }
  }

  /**
   * Pause the sound effect
   */
  pause(): void {
    try {
      this.audio.pause()
    } catch (error) {
      console.warn(`Failed to pause sound ${this.name}:`, error)
    }
  }

  /**
   * Resume the sound effect
   */
  resume(): void {
    try {
      this.audio.play()
    } catch (error) {
      console.warn(`Failed to resume sound ${this.name}:`, error)
    }
  }

  /**
   * Set the volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume))
    this.audio.volume = this._volume
  }

  /**
   * Get the current volume
   */
  get volume(): number {
    return this._volume
  }

  /**
   * Check if the sound is loaded
   */
  get loaded(): boolean {
    return this._loaded
  }

  /**
   * Check if there was an error loading the sound
   */
  get error(): boolean {
    return this._error
  }

  /**
   * Check if the sound is currently playing
   */
  get playing(): boolean {
    return !this.audio.paused && this.audio.currentTime > 0 && !this.audio.ended
  }

  /**
   * Get the duration of the sound
   */
  get duration(): number {
    return this.audio.duration || 0
  }

  /**
   * Get the current playback time
   */
  get currentTime(): number {
    return this.audio.currentTime
  }

  /**
   * Clone this sound effect (useful for overlapping sounds)
   */
  clone(): SoundEffect {
    return new SoundEffect(this.name, this.src, {
      ...this.options,
      volume: this._volume
    })
  }

  /**
   * Dispose of the sound effect
   */
  dispose(): void {
    this.stop()
    this.audio.src = ''
    this.audio.removeAttribute('src')
    this.loadPromise = null
  }
}