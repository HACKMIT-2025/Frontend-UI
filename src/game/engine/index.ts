/**
 * Mario Game Engine - Main Export File
 *
 * This is the main entry point for the Mario Game Engine.
 * Import GameAPI from here to use in your projects.
 */

// Core API
export { GameAPI, default as MarioGameAPI } from './api/GameAPI'

// Core Engine Components (for advanced users)
export { GameEngine } from './GameEngine'
export { LevelBuilder } from './LevelBuilder'

// Physics
export { PhysicsEngine } from './physics/PhysicsEngine'

// Entities
export { Entity } from './entities/Entity'
export { Player } from './entities/Player'
export { Enemy } from './entities/Enemy'
export { Coin } from './entities/Coin'
export { PowerUp } from './entities/PowerUp'
export { EntityManager } from './entities/EntityManager'

// Level Components
export { Level } from './level/Level'
export { Platform } from './level/Platform'
export { Polygon } from './level/Polygon'

// Rendering
export { Renderer } from './render/Renderer'
export { Camera } from './render/Camera'

// Input
export { InputManager } from './input/InputManager'

// Type exports
export type { GameConfig } from './GameEngine'
export type { LevelData } from './LevelBuilder'
export type { InputState } from './input/InputManager'
export type { Vector2D, AABB } from './physics/PhysicsEngine'
export type { EntityPhysics } from './entities/Entity'
export type { PlayerSize, PlayerState } from './entities/Player'
export type { UIData } from './render/Renderer'