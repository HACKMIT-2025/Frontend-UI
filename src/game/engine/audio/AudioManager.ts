/**
 * AudioManager - Centralized audio system management
 * Handles all sound effects, music, and audio settings for the Mario game
 */

import { SoundEffect, SoundOptions } from './SoundEffect'
import { MusicPlayer, MusicTrack } from './MusicPlayer'

export interface AudioSettings {
  masterVolume?: number
  sfxVolume?: number
  musicVolume?: number
  muted?: boolean
  sfxMuted?: boolean
  musicMuted?: boolean
}

export interface SoundDefinition {
  name: string
  src: string
  options?: SoundOptions
}

export class AudioManager {
  private static instance: AudioManager | null = null

  private musicPlayer: MusicPlayer
  private soundEffects: Map<string, SoundEffect> = new Map()
  private soundPools: Map<string, SoundEffect[]> = new Map()
  private settings: AudioSettings = {
    masterVolume: 1.0,
    sfxVolume: 0.8,
    musicVolume: 0.7,
    muted: false,
    sfxMuted: false,
    musicMuted: false
  }

  private constructor() {
    this.musicPlayer = new MusicPlayer({
      volume: this.settings.musicVolume,
      loop: true,
      crossfadeDuration: 2000,
      fadeInDuration: 1000,
      fadeOutDuration: 1000
    })

    // Load settings from localStorage if available
    this.loadSettings()
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  /**
   * Initialize the audio system with predefined sounds
   */
  async initialize(): Promise<void> {
    console.log('🔊 Initializing Audio System...')

    // Define Mario game sounds
    const soundDefinitions: SoundDefinition[] = [
      // Player sounds
      { name: 'jump', src: '/audio/sfx/jump.wav', options: { volume: 0.6 } },
      { name: 'land', src: '/audio/sfx/land.wav', options: { volume: 0.4 } },
      { name: 'death', src: '/audio/sfx/death.wav', options: { volume: 0.8 } },
      { name: 'powerup', src: '/audio/sfx/powerup.wav', options: { volume: 0.7 } },

      // Collectibles
      { name: 'coin', src: '/audio/sfx/coin.wav', options: { volume: 0.5 } },
      { name: 'life', src: '/audio/sfx/1up.wav', options: { volume: 0.8 } },

      // Enemies
      { name: 'enemy_stomp', src: '/audio/sfx/stomp.wav', options: { volume: 0.6 } },
      { name: 'enemy_defeat', src: '/audio/sfx/kick.wav', options: { volume: 0.5 } },

      // Environment
      { name: 'block_break', src: '/audio/sfx/break.wav', options: { volume: 0.5 } },
      { name: 'block_bump', src: '/audio/sfx/bump.wav', options: { volume: 0.4 } },
      { name: 'pipe', src: '/audio/sfx/pipe.wav', options: { volume: 0.6 } },

      // UI sounds
      { name: 'menu_select', src: '/audio/sfx/select.wav', options: { volume: 0.3 } },
      { name: 'menu_confirm', src: '/audio/sfx/confirm.wav', options: { volume: 0.5 } },
      { name: 'pause', src: '/audio/sfx/pause.wav', options: { volume: 0.4 } },

      // Level events
      { name: 'level_start', src: '/audio/sfx/level_start.wav', options: { volume: 0.7 } },
      { name: 'level_complete', src: '/audio/sfx/level_complete.wav', options: { volume: 0.8 } },
      { name: 'game_over', src: '/audio/sfx/game_over.wav', options: { volume: 0.8 } }
    ]

    // Load all sound effects
    const loadPromises = soundDefinitions.map(async (def) => {
      try {
        const sound = new SoundEffect(def.name, def.src, def.options)
        await sound.load()
        this.soundEffects.set(def.name, sound)

        // Create sound pools for frequently used sounds
        if (['coin', 'jump', 'enemy_stomp'].includes(def.name)) {
          this.createSoundPool(def.name, def.src, def.options || {}, 3)
        }
      } catch (error) {
        console.warn(`Failed to load sound: ${def.name}`, error)
      }
    })

    await Promise.all(loadPromises)

    console.log(`✅ Loaded ${this.soundEffects.size} sound effects`)

    // Apply current settings
    this.updateVolumes()
  }

  /**
   * Create a pool of sound instances for overlapping sounds
   */
  private createSoundPool(name: string, src: string, options: SoundOptions, poolSize: number): void {
    const pool: SoundEffect[] = []
    for (let i = 0; i < poolSize; i++) {
      pool.push(new SoundEffect(`${name}_${i}`, src, options))
    }
    this.soundPools.set(name, pool)
  }

  /**
   * Get an available sound from the pool
   */
  private getPooledSound(name: string): SoundEffect | null {
    const pool = this.soundPools.get(name)
    if (!pool) return null

    // Find a sound that's not currently playing
    const availableSound = pool.find(sound => !sound.playing)
    return availableSound || pool[0] // Return first if all are playing
  }

  /**
   * Play a sound effect
   */
  async playSound(name: string, options?: { volume?: number; playbackRate?: number }): Promise<void> {
    if (this.settings.muted || this.settings.sfxMuted) {
      return
    }

    try {
      // Try to get from pool first
      let sound = this.getPooledSound(name)

      // Fallback to regular sound effects
      if (!sound) {
        sound = this.soundEffects.get(name) || null
      }

      if (!sound) {
        console.warn(`Sound effect not found: ${name}`)
        return
      }

      const finalVolume = (options?.volume ?? 1.0) * this.settings.sfxVolume! * this.settings.masterVolume!

      await sound.play({
        ...options,
        volume: finalVolume
      })
    } catch (error) {
      console.warn(`Failed to play sound: ${name}`, error)
    }
  }

  /**
   * Stop a sound effect
   */
  stopSound(name: string): void {
    const sound = this.soundEffects.get(name)
    if (sound) {
      sound.stop()
    }

    // Also stop pooled sounds
    const pool = this.soundPools.get(name)
    if (pool) {
      pool.forEach(sound => sound.stop())
    }
  }

  /**
   * Play background music
   */
  async playMusic(track: MusicTrack): Promise<void> {
    if (this.settings.muted || this.settings.musicMuted) {
      this.musicPlayer.setMuted(true)
    } else {
      this.musicPlayer.setMuted(false)
      this.musicPlayer.setVolume(this.settings.musicVolume! * this.settings.masterVolume!)
    }

    await this.musicPlayer.play(track)
  }

  /**
   * Stop background music
   */
  async stopMusic(fadeOut?: boolean): Promise<void> {
    await this.musicPlayer.stop(fadeOut ? undefined : 0)
  }

  /**
   * Pause background music
   */
  async pauseMusic(fadeOut?: boolean): Promise<void> {
    await this.musicPlayer.pause(fadeOut ? undefined : 0)
  }

  /**
   * Resume background music
   */
  async resumeMusic(fadeIn?: boolean): Promise<void> {
    await this.musicPlayer.resume(fadeIn ? undefined : 0)
  }

  /**
   * Update audio settings
   */
  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.updateVolumes()
    this.saveSettings()
  }

  /**
   * Get current audio settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  /**
   * Update all volumes based on current settings
   */
  private updateVolumes(): void {
    // Update music volume
    if (this.settings.muted || this.settings.musicMuted) {
      this.musicPlayer.setMuted(true)
    } else {
      this.musicPlayer.setMuted(false)
      this.musicPlayer.setVolume(this.settings.musicVolume! * this.settings.masterVolume!)
    }

    // Sound effects are updated per-play, so no need to update them here
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('mario-audio-settings', JSON.stringify(this.settings))
    } catch (error) {
      console.warn('Failed to save audio settings:', error)
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('mario-audio-settings')
      if (saved) {
        const parsedSettings = JSON.parse(saved)
        this.settings = { ...this.settings, ...parsedSettings }
      }
    } catch (error) {
      console.warn('Failed to load audio settings:', error)
    }
  }

  /**
   * Get the current music player instance
   */
  getMusicPlayer(): MusicPlayer {
    return this.musicPlayer
  }

  /**
   * Check if a sound is loaded
   */
  isSoundLoaded(name: string): boolean {
    const sound = this.soundEffects.get(name)
    return sound ? sound.loaded : false
  }

  /**
   * Get all loaded sound names
   */
  getLoadedSounds(): string[] {
    return Array.from(this.soundEffects.keys())
  }

  /**
   * Dispose of the audio system
   */
  dispose(): void {
    // Stop all sounds
    this.soundEffects.forEach(sound => sound.dispose())
    this.soundEffects.clear()

    // Dispose sound pools
    this.soundPools.forEach(pool => {
      pool.forEach(sound => sound.dispose())
    })
    this.soundPools.clear()

    // Dispose music player
    this.musicPlayer.dispose()

    AudioManager.instance = null
  }

  /**
   * Quick access methods for common game sounds
   */

  // Player actions
  async jump(): Promise<void> { await this.playSound('jump') }
  async land(): Promise<void> { await this.playSound('land') }
  async death(): Promise<void> { await this.playSound('death') }
  async powerUp(): Promise<void> { await this.playSound('powerup') }

  // Collectibles
  async collectCoin(): Promise<void> { await this.playSound('coin') }
  async extraLife(): Promise<void> { await this.playSound('life') }

  // Enemies
  async stompEnemy(): Promise<void> { await this.playSound('enemy_stomp') }
  async defeatEnemy(): Promise<void> { await this.playSound('enemy_defeat') }

  // Environment
  async breakBlock(): Promise<void> { await this.playSound('block_break') }
  async bumpBlock(): Promise<void> { await this.playSound('block_bump') }
  async enterPipe(): Promise<void> { await this.playSound('pipe') }

  // UI
  async menuSelect(): Promise<void> { await this.playSound('menu_select') }
  async menuConfirm(): Promise<void> { await this.playSound('menu_confirm') }
  async pauseGame(): Promise<void> { await this.playSound('pause') }

  // Level events
  async levelStart(): Promise<void> { await this.playSound('level_start') }
  async levelComplete(): Promise<void> { await this.playSound('level_complete') }
  async gameOver(): Promise<void> { await this.playSound('game_over') }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance()
export default audioManager