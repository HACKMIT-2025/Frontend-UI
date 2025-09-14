/**
 * AudioGenerator - Generate simple sound effects using Web Audio API
 * Creates placeholder audio files for development and testing
 */

export class AudioGenerator {
  private audioContext: AudioContext | null = null

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('Web Audio API not supported:', error)
    }
  }

  /**
   * Generate a simple beep sound
   */
  generateBeep(frequency: number = 440, duration: number = 0.2, type: OscillatorType = 'sine'): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('Audio context not available'))
        return
      }

      const sampleRate = this.audioContext.sampleRate
      const frameCount = sampleRate * duration
      const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate)
      const channelData = audioBuffer.getChannelData(0)

      // Generate waveform
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate
        const envelope = Math.exp(-t * 3) // Exponential decay envelope

        let sample = 0
        switch (type) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * frequency * t)
            break
          case 'square':
            sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1
            break
          case 'sawtooth':
            sample = 2 * (frequency * t - Math.floor(frequency * t + 0.5))
            break
          case 'triangle':
            sample = 2 * Math.abs(2 * (frequency * t - Math.floor(frequency * t + 0.5))) - 1
            break
        }

        channelData[i] = sample * envelope * 0.3 // Apply envelope and reduce volume
      }

      // Convert to WAV
      this.audioBufferToWav(audioBuffer).then(resolve).catch(reject)
    })
  }

  /**
   * Generate jump sound effect
   */
  async generateJumpSound(): Promise<Blob> {
    return this.generateBeep(523.25, 0.15, 'square') // C5
  }

  /**
   * Generate coin collect sound
   */
  async generateCoinSound(): Promise<Blob> {
    return this.generateBeep(1047, 0.1, 'sine') // C6
  }

  /**
   * Generate enemy stomp sound
   */
  async generateStompSound(): Promise<Blob> {
    return this.generateBeep(165, 0.2, 'square') // E3
  }

  /**
   * Generate power-up sound
   */
  async generatePowerUpSound(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('Audio context not available'))
        return
      }

      const sampleRate = this.audioContext.sampleRate
      const duration = 0.5
      const frameCount = sampleRate * duration
      const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate)
      const channelData = audioBuffer.getChannelData(0)

      // Ascending arpeggio: C4, E4, G4, C5
      const frequencies = [261.63, 329.63, 392.00, 523.25]
      const noteDuration = duration / frequencies.length

      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate
        const noteIndex = Math.floor(t / noteDuration)
        const noteTime = t - (noteIndex * noteDuration)
        const frequency = frequencies[Math.min(noteIndex, frequencies.length - 1)]

        const envelope = Math.exp(-noteTime * 2)
        const sample = Math.sin(2 * Math.PI * frequency * noteTime) * envelope * 0.2

        channelData[i] = sample
      }

      this.audioBufferToWav(audioBuffer).then(resolve).catch(reject)
    })
  }

  /**
   * Generate death sound
   */
  async generateDeathSound(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('Audio context not available'))
        return
      }

      const sampleRate = this.audioContext.sampleRate
      const duration = 1.0
      const frameCount = sampleRate * duration
      const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate)
      const channelData = audioBuffer.getChannelData(0)

      // Descending chromatic scale
      const startFreq = 523.25 // C5
      const endFreq = 261.63   // C4

      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate
        const progress = t / duration

        // Exponential frequency sweep
        const frequency = startFreq * Math.pow(endFreq / startFreq, progress)
        const envelope = Math.exp(-t * 1.5)
        const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3

        channelData[i] = sample
      }

      this.audioBufferToWav(audioBuffer).then(resolve).catch(reject)
    })
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  private async audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const length = audioBuffer.length
    const sampleRate = audioBuffer.sampleRate
    const channelData = audioBuffer.getChannelData(0)

    // WAV file format
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)

    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  /**
   * Create and download generated audio files
   */
  async generateAllSounds(): Promise<Map<string, string>> {
    const sounds = new Map<string, string>()

    try {
      // Generate all sound effects
      const jumpBlob = await this.generateJumpSound()
      const coinBlob = await this.generateCoinSound()
      const stompBlob = await this.generateStompSound()
      const powerUpBlob = await this.generatePowerUpSound()
      const deathBlob = await this.generateDeathSound()

      // Create object URLs
      sounds.set('jump', URL.createObjectURL(jumpBlob))
      sounds.set('coin', URL.createObjectURL(coinBlob))
      sounds.set('stomp', URL.createObjectURL(stompBlob))
      sounds.set('powerup', URL.createObjectURL(powerUpBlob))
      sounds.set('death', URL.createObjectURL(deathBlob))

      console.log('✅ Generated audio files:', Array.from(sounds.keys()))
    } catch (error) {
      console.error('Failed to generate audio files:', error)
    }

    return sounds
  }

  /**
   * Dispose of the audio generator
   */
  dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
  }
}