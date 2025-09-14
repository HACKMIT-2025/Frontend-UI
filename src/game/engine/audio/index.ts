/**
 * Audio System - Main Export File
 *
 * Comprehensive audio system for the Mario Game Engine
 * Includes sound effects, background music, and centralized audio management
 */

// Core audio classes
export { SoundEffect } from './SoundEffect'
export type { SoundOptions } from './SoundEffect'

export { MusicPlayer } from './MusicPlayer'
export type { MusicOptions, MusicTrack } from './MusicPlayer'

export { AudioManager, audioManager } from './AudioManager'
export type { AudioSettings, SoundDefinition } from './AudioManager'

// Re-export the singleton instance as default
export { audioManager as default } from './AudioManager'