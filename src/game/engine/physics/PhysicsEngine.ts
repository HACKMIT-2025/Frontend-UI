import { Entity } from '../entities/Entity'
import { Platform } from '../level/Platform'
import { Polygon } from '../level/Polygon'

export interface Vector2D {
  x: number
  y: number
}

export interface AABB {
  x: number
  y: number
  width: number
  height: number
}

export class PhysicsEngine {
  private gravity: number
  private friction = 0.85
  private airResistance = 0.98
  private maxVelocity = { x: 15, y: 20 }

  constructor(gravity = 0.5) {
    this.gravity = gravity
  }

  public updateEntity(entity: Entity, _dt: number, platforms: Platform[] = []) {
    if (!entity.physics) return

    const vel = entity.velocity
    const pos = entity.position

    // Store previous position for collision detection
    if (!entity.previousPosition) {
      entity.previousPosition = { x: pos.x, y: pos.y }
    } else {
      entity.previousPosition.x = pos.x
      entity.previousPosition.y = pos.y
    }

    // Apply gravity if not grounded
    if (!entity.grounded && entity.physics.gravity) {
      vel.y += this.gravity
    }

    // Apply friction
    if (entity.grounded) {
      vel.x *= this.friction
    } else {
      vel.x *= this.airResistance
    }

    // Clamp velocity
    vel.x = Math.max(-this.maxVelocity.x, Math.min(this.maxVelocity.x, vel.x))
    vel.y = Math.max(-this.maxVelocity.y, Math.min(this.maxVelocity.y, vel.y))

    // Use Swept AABB for collision detection to prevent tunneling
    const movement = { x: vel.x, y: vel.y }
    const sweptResult = this.sweptAABB(entity, movement, platforms)

    if (sweptResult.hit && sweptResult.time < 1.0) {
      // Collision detected - move entity to collision point
      pos.x += movement.x * sweptResult.time
      pos.y += movement.y * sweptResult.time

      // Resolve collision based on normal
      if (Math.abs(sweptResult.normal.x) > 0.5) {
        // Horizontal collision
        vel.x = 0
        if (sweptResult.normal.x < 0) {
          entity.wallCollision.right = true
        } else {
          entity.wallCollision.left = true
        }
      }

      if (Math.abs(sweptResult.normal.y) > 0.5) {
        // Vertical collision
        if (sweptResult.normal.y < 0) {
          entity.grounded = true
          vel.y = 0
        } else {
          entity.ceilingCollision = true
          vel.y = 0
        }
      }

      // Add small buffer to prevent sticking
      pos.x += sweptResult.normal.x * 0.1
      pos.y += sweptResult.normal.y * 0.1
    } else {
      // No collision - apply full movement
      pos.x += movement.x
      pos.y += movement.y

      // Reset collision states
      entity.grounded = false
      entity.wallCollision.left = false
      entity.wallCollision.right = false
      entity.ceilingCollision = false
    }
  }

  public checkPlatformCollision(entity: Entity, platform: Platform): boolean {
    if (!entity.physics || !entity.physics.solid) return false

    // First check current position collision
    const entityBox = this.getAABB(entity)
    const platformBox = this.getAABB(platform)

    if (this.isColliding(entityBox, platformBox)) {
      this.resolvePlatformCollision(entity, platform, entityBox, platformBox)
      return true
    }

    // For fast-moving entities or when near platforms, use continuous collision detection
    // Lower threshold to catch small movements that might bypass collision detection
    if (Math.abs(entity.velocity.x) > 0.5 || Math.abs(entity.velocity.y) > 0.5) {
      if (this.checkContinuousCollision(entity, platform)) {
        return true
      }
    }

    return false
  }

  public checkPolygonCollision(entity: Entity, polygon: Polygon): boolean {
    if (!entity.physics || !entity.physics.solid) return false

    const entityBox = this.getAABB(entity)
    const polygonBounds = polygon.getBounds()

    // Convert polygon bounds to AABB format
    const polygonAABB = {
      x: polygonBounds.left,
      y: polygonBounds.top,
      width: polygonBounds.right - polygonBounds.left,
      height: polygonBounds.bottom - polygonBounds.top
    }

    // Quick AABB check first
    if (!this.isColliding(entityBox, polygonAABB)) {
      return false
    }

    // More precise collision check
    if (this.polygonIntersectsAABB(polygon, entityBox)) {
      this.resolvePolygonCollision(entity, polygon, entityBox)
      return true
    }

    return false
  }

  public checkEntityCollision(entity1: Entity, entity2: Entity): boolean {
    if (!entity1.physics || !entity2.physics) return false

    const box1 = this.getAABB(entity1)
    const box2 = this.getAABB(entity2)

    return this.isColliding(box1, box2)
  }

  private isColliding(box1: AABB, box2: AABB): boolean {
    return box1.x < box2.x + box2.width &&
           box1.x + box1.width > box2.x &&
           box1.y < box2.y + box2.height &&
           box1.y + box1.height > box2.y
  }

  private resolvePlatformCollision(entity: Entity, platform: Platform, entityBox: AABB, platformBox: AABB) {
    // Calculate overlap on each axis
    const overlapX = Math.min(
      entityBox.x + entityBox.width - platformBox.x,
      platformBox.x + platformBox.width - entityBox.x
    )
    const overlapY = Math.min(
      entityBox.y + entityBox.height - platformBox.y,
      platformBox.y + platformBox.height - entityBox.y
    )

    // One-way platforms (can jump through from below)
    if (platform.type === 'platform' && entity.velocity.y < 0) {
      return
    }

    // Store entity's previous position to determine collision direction
    const prevX = entity.position.x - entity.velocity.x
    const prevY = entity.position.y - entity.velocity.y

    // Determine collision direction based on entity's movement and position
    const comingFromLeft = prevX + entity.width <= platformBox.x
    const comingFromRight = prevX >= platformBox.x + platformBox.width
    const comingFromTop = prevY + entity.height <= platformBox.y
    const comingFromBottom = prevY >= platformBox.y + platformBox.height

    // For ground/solid platforms, we need to handle both horizontal and vertical collisions properly
    if (platform.type === 'ground') {
      // Check if this is primarily a horizontal or vertical collision based on movement direction
      const horizontalCollision = (comingFromLeft || comingFromRight) && Math.abs(entity.velocity.x) > 0.1
      const verticalCollision = (comingFromTop || comingFromBottom) && Math.abs(entity.velocity.y) > 0.1

      // Handle horizontal collision (walls)
      if (horizontalCollision) {
        // Calculate entity's mass center
        const entityCenterY = entityBox.y + entityBox.height / 2
        const platformCenterY = platformBox.y + platformBox.height / 2

        if (comingFromLeft) {
          entity.position.x = platformBox.x - entity.width - 0.1 // Small buffer to prevent sticking
          entity.wallCollision.right = true
          // If collision occurs above platform's mass center, apply elastic collision
          if (entityCenterY < platformCenterY) {
            // Complete elastic collision - reverse velocity with same magnitude
            entity.velocity.x = -Math.abs(entity.velocity.x)
          } else {
            // Normal collision - stop movement
            entity.velocity.x = 0
          }
        } else if (comingFromRight) {
          entity.position.x = platformBox.x + platformBox.width + 0.1 // Small buffer to prevent sticking
          entity.wallCollision.left = true
          // If collision occurs above platform's mass center, apply elastic collision
          if (entityCenterY < platformCenterY) {
            // Complete elastic collision - reverse velocity with same magnitude
            entity.velocity.x = Math.abs(entity.velocity.x)
          } else {
            // Normal collision - stop movement
            entity.velocity.x = 0
          }
        }
      }

      // Handle vertical collision (floor/ceiling)
      if (verticalCollision) {
        // Calculate entity's mass center
        const entityCenterX = entityBox.x + entityBox.width / 2
        const platformCenterX = platformBox.x + platformBox.width / 2

        if (comingFromTop) {
          entity.position.y = platformBox.y - entity.height
          entity.grounded = true
          // For floor collisions, always stop vertical movement (landing)
          entity.velocity.y = 0
        } else if (comingFromBottom) {
          entity.position.y = platformBox.y + platformBox.height
          entity.ceilingCollision = true
          // If collision occurs to the side of platform's mass center, apply elastic collision
          if (Math.abs(entityCenterX - platformCenterX) > platformBox.width / 4) {
            // Complete elastic collision - reverse velocity with same magnitude
            entity.velocity.y = Math.abs(entity.velocity.y)
          } else {
            // Normal ceiling collision - stop movement
            entity.velocity.y = 0
          }
        }
      }

      // If neither horizontal nor vertical collision is clear, use the old method as fallback
      if (!horizontalCollision && !verticalCollision) {
        const entityCenterY = entityBox.y + entityBox.height / 2
        const platformCenterY = platformBox.y + platformBox.height / 2
        const entityCenterX = entityBox.x + entityBox.width / 2
        const platformCenterX = platformBox.x + platformBox.width / 2

        if (overlapX < overlapY) {
          // Horizontal collision
          if (entityBox.x < platformBox.x) {
            entity.position.x = platformBox.x - entity.width - 0.1 // Small buffer to prevent sticking
            entity.wallCollision.right = true
            // Apply elastic collision if above mass center
            if (entityCenterY < platformCenterY) {
              entity.velocity.x = -Math.abs(entity.velocity.x)
            } else {
              entity.velocity.x = 0
            }
          } else {
            entity.position.x = platformBox.x + platformBox.width + 0.1 // Small buffer to prevent sticking
            entity.wallCollision.left = true
            // Apply elastic collision if above mass center
            if (entityCenterY < platformCenterY) {
              entity.velocity.x = Math.abs(entity.velocity.x)
            } else {
              entity.velocity.x = 0
            }
          }
        } else {
          // Vertical collision
          if (entityBox.y < platformBox.y) {
            entity.position.y = platformBox.y - entity.height
            entity.grounded = true
            entity.velocity.y = 0
          } else {
            entity.position.y = platformBox.y + platformBox.height
            entity.ceilingCollision = true
            // Apply elastic collision if to the side of mass center
            if (Math.abs(entityCenterX - platformCenterX) > platformBox.width / 4) {
              entity.velocity.y = Math.abs(entity.velocity.y)
            } else {
              entity.velocity.y = 0
            }
          }
        }
      }
    } else {
      // For regular platforms, apply elastic collision logic as well
      const entityCenterY = entityBox.y + entityBox.height / 2
      const platformCenterY = platformBox.y + platformBox.height / 2
      const entityCenterX = entityBox.x + entityBox.width / 2
      const platformCenterX = platformBox.x + platformBox.width / 2

      if (overlapX < overlapY) {
        // Horizontal collision
        if (entityBox.x < platformBox.x) {
          entity.position.x = platformBox.x - entity.width - 0.1 // Small buffer to prevent sticking
          // Apply elastic collision if above mass center
          if (entityCenterY < platformCenterY) {
            entity.velocity.x = -Math.abs(entity.velocity.x)
          } else {
            entity.velocity.x = 0
          }
        } else {
          entity.position.x = platformBox.x + platformBox.width + 0.1 // Small buffer to prevent sticking
          // Apply elastic collision if above mass center
          if (entityCenterY < platformCenterY) {
            entity.velocity.x = Math.abs(entity.velocity.x)
          } else {
            entity.velocity.x = 0
          }
        }
      } else {
        // Vertical collision
        if (entityBox.y < platformBox.y) {
          entity.position.y = platformBox.y - entity.height
          entity.grounded = true
          entity.velocity.y = 0
        } else {
          entity.position.y = platformBox.y + platformBox.height
          // Apply elastic collision if to the side of mass center
          if (Math.abs(entityCenterX - platformCenterX) > platformBox.width / 4) {
            entity.velocity.y = Math.abs(entity.velocity.y)
          } else {
            entity.velocity.y = 0
          }
        }
      }
    }
  }

  private getAABB(obj: any): AABB {
    // Validate object has required properties
    if (!obj) {
      console.warn('getAABB called with null/undefined object')
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    const x = obj.position?.x ?? obj.x ?? 0
    const y = obj.position?.y ?? obj.y ?? 0
    const width = obj.width ?? 0
    const height = obj.height ?? 0
    
    // Ensure finite values
    return {
      x: isFinite(x) ? x : 0,
      y: isFinite(y) ? y : 0,
      width: isFinite(width) && width > 0 ? width : 0,
      height: isFinite(height) && height > 0 ? height : 0
    }
  }

  private polygonIntersectsAABB(polygon: Polygon, box: AABB): boolean {
    // Check if any point of the polygon is inside the AABB
    for (const point of polygon.contours) {
      const x = point[0]
      const y = point[1]
      if (x >= box.x && x <= box.x + box.width &&
          y >= box.y && y <= box.y + box.height) {
        return true
      }
    }

    // Check if any point of the AABB is inside the polygon
    const corners = [
      [box.x, box.y],
      [box.x + box.width, box.y],
      [box.x + box.width, box.y + box.height],
      [box.x, box.y + box.height]
    ]

    for (const corner of corners) {
      if (polygon.contains(corner[0], corner[1])) {
        return true
      }
    }

    // Check if any polygon edge intersects any AABB edge
    const polygonSegments = polygon.getSegments()
    const boxSegments = [
      { x1: box.x, y1: box.y, x2: box.x + box.width, y2: box.y },
      { x1: box.x + box.width, y1: box.y, x2: box.x + box.width, y2: box.y + box.height },
      { x1: box.x + box.width, y1: box.y + box.height, x2: box.x, y2: box.y + box.height },
      { x1: box.x, y1: box.y + box.height, x2: box.x, y2: box.y }
    ]

    for (const polySeg of polygonSegments) {
      for (const boxSeg of boxSegments) {
        if (this.lineSegmentsIntersect(polySeg, boxSeg)) {
          return true
        }
      }
    }

    return false
  }

  private lineSegmentsIntersect(seg1: any, seg2: any): boolean {
    const { x1: x1, y1: y1, x2: x2, y2: y2 } = seg1
    const { x1: x3, y1: y3, x2: x4, y2: y4 } = seg2

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    
    // Check for parallel lines (avoid division by zero)
    if (Math.abs(denom) < 0.0001) return false

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    return t >= 0 && t <= 1 && u >= 0 && u <= 1
  }

  private resolvePolygonCollision(entity: Entity, polygon: Polygon, entityBox: AABB) {
    // Find the closest polygon edge to push the entity away from
    const segments = polygon.getSegments()
    let minDistance = Infinity
    let closestEdge = null
    let pushDirection = { x: 0, y: 0 }

    for (const segment of segments) {
      const closestPoint = this.closestPointOnSegment(
        entityBox.x + entityBox.width / 2,
        entityBox.y + entityBox.height / 2,
        segment
      )

      const dx = (entityBox.x + entityBox.width / 2) - closestPoint.x
      const dy = (entityBox.y + entityBox.height / 2) - closestPoint.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) {
        minDistance = distance
        closestEdge = segment
        if (distance > 0) {
          pushDirection = { x: dx / distance, y: dy / distance }
        }
      }
    }

    if (closestEdge && minDistance < Math.max(entityBox.width, entityBox.height) / 2) {
      // Push entity away from polygon
      const pushDistance = 1
      entity.position.x += pushDirection.x * pushDistance
      entity.position.y += pushDirection.y * pushDistance

      // Stop velocity in the direction of collision
      const dotProduct = entity.velocity.x * pushDirection.x + entity.velocity.y * pushDirection.y
      if (dotProduct < 0) {
        entity.velocity.x -= dotProduct * pushDirection.x
        entity.velocity.y -= dotProduct * pushDirection.y
      }

      // Check if entity is landing on top of polygon
      if (Math.abs(pushDirection.y) > 0.7 && pushDirection.y < 0) {
        entity.grounded = true
      }
    }
  }

  private closestPointOnSegment(px: number, py: number, segment: any) {
    const { x1, y1, x2, y2 } = segment
    const dx = x2 - x1
    const dy = y2 - y1
    const lengthSquared = dx * dx + dy * dy

    // Handle degenerate case (zero-length segment)
    if (lengthSquared < 0.0001) return { x: x1, y: y1 }

    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared))
    return {
      x: x1 + t * dx,
      y: y1 + t * dy
    }
  }

  private checkContinuousCollision(entity: Entity, platform: Platform): boolean {
    // Use stored previous position if available, otherwise calculate
    const prevX = entity.previousPosition ? entity.previousPosition.x : entity.position.x - entity.velocity.x
    const prevY = entity.previousPosition ? entity.previousPosition.y : entity.position.y - entity.velocity.y

    // Create AABB for previous position
    const prevEntityBox = {
      x: prevX,
      y: prevY,
      width: entity.width,
      height: entity.height
    }

    const platformBox = this.getAABB(platform)

    // If entity wasn't colliding in previous position but is moving towards platform
    if (!this.isColliding(prevEntityBox, platformBox)) {
      // Create a swept AABB that covers the entire movement path
      const sweptBox = this.getSweptAABB(prevEntityBox, entity.velocity)

      if (this.isColliding(sweptBox, platformBox)) {
        // Use raycast to find exact collision point
        const rayStart = { x: prevX + entity.width / 2, y: prevY + entity.height / 2 }
        const rayEnd = { x: entity.position.x + entity.width / 2, y: entity.position.y + entity.height / 2 }

        // Check if the movement ray intersects with the platform
        if (this.rayIntersectsAABB(rayStart, rayEnd, platformBox)) {
          // Find the collision time (0 to 1 along the movement)
          const collisionTime = this.getRayAABBIntersectionTime(rayStart, rayEnd, platformBox)

          if (collisionTime >= 0 && collisionTime <= 1) {
            // Move entity to collision point
            entity.position.x = prevX + entity.velocity.x * collisionTime
            entity.position.y = prevY + entity.velocity.y * collisionTime

            // Resolve collision at this position
            const collisionEntityBox = this.getAABB(entity)
            this.resolvePlatformCollision(entity, platform, collisionEntityBox, platformBox)
            return true
          }
        }
      }
    }

    return false
  }

  private getSweptAABB(box: AABB, velocity: Vector2D): AABB {
    return {
      x: velocity.x > 0 ? box.x : box.x + velocity.x,
      y: velocity.y > 0 ? box.y : box.y + velocity.y,
      width: box.width + Math.abs(velocity.x),
      height: box.height + Math.abs(velocity.y)
    }
  }

  private rayIntersectsAABB(start: Vector2D, end: Vector2D, box: AABB): boolean {
    const result = this.raycastAABB(start, end, box)
    return result !== null
  }

  private getRayAABBIntersectionTime(start: Vector2D, end: Vector2D, box: AABB): number {
    const result = this.raycastAABB(start, end, box)
    return result ? result.t : -1
  }

  // Advanced physics methods

  public applyForce(entity: Entity, force: Vector2D) {
    if (!entity.physics) return
    entity.velocity.x += force.x
    entity.velocity.y += force.y
  }

  public applyImpulse(entity: Entity, impulse: Vector2D) {
    if (!entity.physics) return
    const mass = entity.physics.mass || 1
    entity.velocity.x += impulse.x / mass
    entity.velocity.y += impulse.y / mass
  }

  public raycast(start: Vector2D, direction: Vector2D, maxDistance: number, platforms: Platform[]): any {
    // Simple raycast implementation for ground checks
    const end = {
      x: start.x + direction.x * maxDistance,
      y: start.y + direction.y * maxDistance
    }

    let closestHit = null
    let closestDistance = maxDistance

    platforms.forEach(platform => {
      const hit = this.raycastAABB(start, end, this.getAABB(platform))
      if (hit && hit.distance < closestDistance) {
        closestDistance = hit.distance
        closestHit = { ...hit, platform }
      }
    })

    return closestHit
  }

  private raycastAABB(start: Vector2D, end: Vector2D, box: AABB): any {
    const dx = end.x - start.x
    const dy = end.y - start.y

    let tMin = 0
    let tMax = 1

    // Check x axis
    if (Math.abs(dx) < 0.0001) {
      if (start.x < box.x || start.x > box.x + box.width) {
        return null
      }
    } else {
      const t1 = (box.x - start.x) / dx
      const t2 = (box.x + box.width - start.x) / dx

      tMin = Math.max(tMin, Math.min(t1, t2))
      tMax = Math.min(tMax, Math.max(t1, t2))

      if (tMin > tMax) return null
    }

    // Check y axis
    if (Math.abs(dy) < 0.0001) {
      if (start.y < box.y || start.y > box.y + box.height) {
        return null
      }
    } else {
      const t1 = (box.y - start.y) / dy
      const t2 = (box.y + box.height - start.y) / dy

      tMin = Math.max(tMin, Math.min(t1, t2))
      tMax = Math.min(tMax, Math.max(t1, t2))

      if (tMin > tMax) return null
    }

    return {
      point: {
        x: start.x + dx * tMin,
        y: start.y + dy * tMin
      },
      distance: Math.sqrt(dx * dx + dy * dy) * tMin,
      t: tMin
    }
  }

  // Swept AABB collision detection to prevent tunneling
  private sweptAABB(entity: Entity, movement: Vector2D, platforms: Platform[]): { hit: boolean; time: number; normal: Vector2D } {
    let nearestTime = 1.0
    let nearestNormal = { x: 0, y: 0 }
    let hit = false

    const entityBox = this.getAABB(entity)

    for (const platform of platforms) {
      // Skip collision for one-way platforms if entity is moving upward
      if (platform.type === 'platform' && movement.y < 0) {
        continue
      }

      const platformBox = this.getAABB(platform)
      const result = this.sweptAABBvsAABB(entityBox, movement, platformBox)

      if (result.hit && result.time < nearestTime && result.time >= 0) {
        nearestTime = result.time
        nearestNormal = result.normal
        hit = true
      }
    }

    return { hit, time: nearestTime, normal: nearestNormal }
  }

  private sweptAABBvsAABB(box1: AABB, movement: Vector2D, box2: AABB): { hit: boolean; time: number; normal: Vector2D } {
    // Expand box2 by box1's dimensions (Minkowski difference)
    const expandedBox = {
      x: box2.x - box1.width,
      y: box2.y - box1.height,
      width: box2.width + box1.width,
      height: box2.height + box1.height
    }

    // Treat box1 as a point and do ray-vs-AABB collision
    const rayOrigin = { x: box1.x, y: box1.y }
    const rayDirection = movement

    return this.rayVsAABB(rayOrigin, rayDirection, expandedBox)
  }

  private rayVsAABB(origin: Vector2D, direction: Vector2D, box: AABB): { hit: boolean; time: number; normal: Vector2D } {
    // Handle zero-direction rays
    if (Math.abs(direction.x) < 0.001 && Math.abs(direction.y) < 0.001) {
      // Check if point is inside box
      if (origin.x >= box.x && origin.x <= box.x + box.width &&
          origin.y >= box.y && origin.y <= box.y + box.height) {
        return { hit: true, time: 0, normal: { x: 0, y: -1 } }
      }
      return { hit: false, time: 1, normal: { x: 0, y: 0 } }
    }

    // Calculate time to hit each side of the box
    const invDirX = Math.abs(direction.x) > 0.001 ? 1.0 / direction.x : (direction.x > 0 ? Infinity : -Infinity)
    const invDirY = Math.abs(direction.y) > 0.001 ? 1.0 / direction.y : (direction.y > 0 ? Infinity : -Infinity)

    let tMinX: number, tMaxX: number
    let tMinY: number, tMaxY: number

    if (invDirX >= 0) {
      tMinX = (box.x - origin.x) * invDirX
      tMaxX = (box.x + box.width - origin.x) * invDirX
    } else {
      tMinX = (box.x + box.width - origin.x) * invDirX
      tMaxX = (box.x - origin.x) * invDirX
    }

    if (invDirY >= 0) {
      tMinY = (box.y - origin.y) * invDirY
      tMaxY = (box.y + box.height - origin.y) * invDirY
    } else {
      tMinY = (box.y + box.height - origin.y) * invDirY
      tMaxY = (box.y - origin.y) * invDirY
    }

    const tNear = Math.max(tMinX, tMinY)
    const tFar = Math.min(tMaxX, tMaxY)

    // Check if ray misses the box or collision is behind the ray
    if (tNear > tFar || tFar < 0 || tNear > 1) {
      return { hit: false, time: 1, normal: { x: 0, y: 0 } }
    }

    // Calculate collision normal based on which face was hit first
    let normal = { x: 0, y: 0 }
    if (tMinX > tMinY) {
      normal.x = invDirX > 0 ? -1 : 1
      normal.y = 0
    } else {
      normal.x = 0
      normal.y = invDirY > 0 ? -1 : 1
    }

    return { hit: true, time: Math.max(0, tNear), normal }
  }

  // Getters and setters
  public setGravity(gravity: number) {
    this.gravity = gravity
  }

  public getGravity(): number {
    return this.gravity
  }

  public setFriction(friction: number) {
    this.friction = friction
  }

  public setMaxVelocity(x: number, y: number) {
    this.maxVelocity = { x, y }
  }
}