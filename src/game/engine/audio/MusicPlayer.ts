/**
 * MusicPlayer Class - Background music management
 * Handles loading, playing, and controlling background music with crossfading
 */

export interface MusicOptions {
  volume?: number
  loop?: boolean
  fadeInDuration?: number
  fadeOutDuration?: number
  crossfadeDuration?: number
}

export interface MusicTrack {
  name: string
  src: string
  options?: MusicOptions
}

export class MusicPlayer {
  private currentTrack: HTMLAudioElement | null = null
  private _volume: number = 0.7
  private _muted: boolean = false
  private fadeIntervals: Set<number> = new Set()
  private loadedTracks: Map<string, HTMLAudioElement> = new Map()

  constructor(private defaultOptions: MusicOptions = {}) {
    this._volume = defaultOptions.volume ?? 0.7
  }

  /**
   * Load a music track
   */
  async loadTrack(track: MusicTrack): Promise<HTMLAudioElement> {
    // Check if already loaded
    if (this.loadedTracks.has(track.name)) {
      return this.loadedTracks.get(track.name)!
    }

    const audio = new Audio()
    const options = { ...this.defaultOptions, ...track.options }

    audio.src = track.src
    audio.loop = options.loop ?? true
    audio.volume = 0 // Start at 0 for fade-in
    audio.preload = 'auto'

    // Set up error handling
    audio.addEventListener('error', (e) => {
      console.error(`Failed to load music track: ${track.name}`, e)
    })

    // Load the track
    await new Promise<void>((resolve, reject) => {
      const onCanPlay = () => {
        audio.removeEventListener('canplaythrough', onCanPlay)
        audio.removeEventListener('error', onError)
        resolve()
      }

      const onError = (_e: Event) => {
        audio.removeEventListener('canplaythrough', onCanPlay)
        audio.removeEventListener('error', onError)
        reject(new Error(`Failed to load music: ${track.name}`))
      }

      audio.addEventListener('canplaythrough', onCanPlay)
      audio.addEventListener('error', onError)
    })

    this.loadedTracks.set(track.name, audio)
    return audio
  }

  /**
   * Play a music track
   */
  async play(track: MusicTrack): Promise<void> {
    try {
      // Load the track if not already loaded
      const audio = await this.loadTrack(track)
      const options = { ...this.defaultOptions, ...track.options }

      // If there's a current track, crossfade
      if (this.currentTrack && this.currentTrack !== audio) {
        await this.crossfade(this.currentTrack, audio, options.crossfadeDuration ?? 1000)
      } else {
        // No current track, just fade in
        this.currentTrack = audio
        audio.currentTime = 0
        await audio.play()

        if (!this._muted) {
          await this.fadeIn(audio, options.fadeInDuration ?? 1000)
        }
      }
    } catch (error) {
      console.warn(`Failed to play music track: ${track.name}`, error)
    }
  }

  /**
   * Stop the current music
   */
  async stop(fadeOutDuration?: number): Promise<void> {
    if (!this.currentTrack) return

    const duration = fadeOutDuration ?? this.defaultOptions.fadeOutDuration ?? 1000

    if (duration > 0 && !this._muted) {
      await this.fadeOut(this.currentTrack, duration)
    }

    this.currentTrack.pause()
    this.currentTrack.currentTime = 0
    this.currentTrack = null
  }

  /**
   * Pause the current music
   */
  async pause(fadeOutDuration?: number): Promise<void> {
    if (!this.currentTrack) return

    const duration = fadeOutDuration ?? 500

    if (duration > 0 && !this._muted) {
      await this.fadeOut(this.currentTrack, duration)
    } else {
      this.currentTrack.pause()
    }
  }

  /**
   * Resume the current music
   */
  async resume(fadeInDuration?: number): Promise<void> {
    if (!this.currentTrack) return

    const duration = fadeInDuration ?? 500

    try {
      await this.currentTrack.play()

      if (duration > 0 && !this._muted) {
        this.currentTrack.volume = 0
        await this.fadeIn(this.currentTrack, duration)
      } else {
        this.currentTrack.volume = this._muted ? 0 : this._volume
      }
    } catch (error) {
      console.warn('Failed to resume music:', error)
    }
  }

  /**
   * Set the master volume
   */
  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume))

    if (this.currentTrack && !this._muted) {
      this.currentTrack.volume = this._volume
    }
  }

  /**
   * Get the current volume
   */
  get volume(): number {
    return this._volume
  }

  /**
   * Mute/unmute the music
   */
  setMuted(muted: boolean): void {
    this._muted = muted

    if (this.currentTrack) {
      this.currentTrack.volume = muted ? 0 : this._volume
    }
  }

  /**
   * Get muted status
   */
  get muted(): boolean {
    return this._muted
  }

  /**
   * Check if music is currently playing
   */
  get playing(): boolean {
    return this.currentTrack ? !this.currentTrack.paused : false
  }

  /**
   * Get the name of the currently playing track
   */
  get currentTrackName(): string | null {
    if (!this.currentTrack) return null

    for (const [name, audio] of this.loadedTracks) {
      if (audio === this.currentTrack) return name
    }
    return null
  }

  /**
   * Fade in audio
   */
  private async fadeIn(audio: HTMLAudioElement, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startVolume = 0
      const targetVolume = this._volume
      const steps = 60 // 60 steps for smooth fade
      const stepDuration = duration / steps
      const volumeStep = (targetVolume - startVolume) / steps

      let currentStep = 0
      audio.volume = startVolume

      const intervalId = setInterval(() => {
        currentStep++
        audio.volume = Math.min(targetVolume, startVolume + (volumeStep * currentStep))

        if (currentStep >= steps || audio.volume >= targetVolume) {
          clearInterval(intervalId)
          this.fadeIntervals.delete(intervalId)
          audio.volume = targetVolume
          resolve()
        }
      }, stepDuration)

      this.fadeIntervals.add(intervalId)
    })
  }

  /**
   * Fade out audio
   */
  private async fadeOut(audio: HTMLAudioElement, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startVolume = audio.volume
      const targetVolume = 0
      const steps = 60
      const stepDuration = duration / steps
      const volumeStep = (startVolume - targetVolume) / steps

      let currentStep = 0

      const intervalId = setInterval(() => {
        currentStep++
        audio.volume = Math.max(targetVolume, startVolume - (volumeStep * currentStep))

        if (currentStep >= steps || audio.volume <= targetVolume) {
          clearInterval(intervalId)
          this.fadeIntervals.delete(intervalId)
          audio.volume = targetVolume
          resolve()
        }
      }, stepDuration)

      this.fadeIntervals.add(intervalId)
    })
  }

  /**
   * Crossfade between two tracks
   */
  private async crossfade(fromAudio: HTMLAudioElement, toAudio: HTMLAudioElement, duration: number): Promise<void> {
    toAudio.currentTime = 0
    toAudio.volume = 0

    try {
      await toAudio.play()
    } catch (error) {
      console.warn('Failed to start crossfade:', error)
      return
    }

    // Fade out current track and fade in new track simultaneously
    const promises = [
      this.fadeOut(fromAudio, duration),
      this.fadeIn(toAudio, duration)
    ]

    await Promise.all(promises)

    // Clean up
    fromAudio.pause()
    fromAudio.currentTime = 0
    this.currentTrack = toAudio
  }

  /**
   * Dispose of the music player
   */
  dispose(): void {
    // Clear all fade intervals
    this.fadeIntervals.forEach(id => clearInterval(id))
    this.fadeIntervals.clear()

    // Stop and dispose of all loaded tracks
    this.loadedTracks.forEach(audio => {
      audio.pause()
      audio.src = ''
      audio.removeAttribute('src')
    })
    this.loadedTracks.clear()

    this.currentTrack = null
  }
}