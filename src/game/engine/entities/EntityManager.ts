import { Entity } from './Entity'

export class EntityManager {
  private entities: Entity[] = []
  private entitiesToAdd: Entity[] = []
  private entitiesToRemove: Entity[] = []

  public addEntity(entity: Entity) {
    this.entitiesToAdd.push(entity)
  }

  public removeEntity(entity: Entity) {
    this.entitiesToRemove.push(entity)
  }

  public getEntities(): Entity[] {
    return this.entities
  }

  public getEntitiesByType(type: string): Entity[] {
    return this.entities.filter(e => e.type === type)
  }

  public getEntityAt(x: number, y: number): Entity | null {
    for (const entity of this.entities) {
      const bounds = entity.getBounds()
      if (x >= bounds.left && x <= bounds.right &&
          y >= bounds.top && y <= bounds.bottom) {
        return entity
      }
    }
    return null
  }

  public update() {
    // Add new entities
    if (this.entitiesToAdd.length > 0) {
      this.entities.push(...this.entitiesToAdd)
      this.entitiesToAdd = []
    }

    // Remove entities
    if (this.entitiesToRemove.length > 0) {
      this.entitiesToRemove.forEach(entity => {
        const index = this.entities.indexOf(entity)
        if (index > -1) {
          this.entities.splice(index, 1)
        }
      })
      this.entitiesToRemove = []
    }
  }

  public removeDeadEntities() {
    this.entities = this.entities.filter(e => !e.dead)
  }

  public clear() {
    this.entities = []
    this.entitiesToAdd = []
    this.entitiesToRemove = []
  }

  public getEntityCount(): number {
    return this.entities.length
  }
}