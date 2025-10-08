export interface LevelData {
  starting_points: Array<{
    coordinates: [number, number]
  }>
  end_points: Array<{
    coordinates: [number, number]
  }>
  rigid_bodies: Array<{
    contour_points: Array<[number, number]>
  }>
  coins?: Array<{
    x: number
    y: number
  }>
  enemies?: Array<{
    x: number
    y: number
    type: string
  }>
}

export interface LevelLoadResult {
  data: LevelData
  source: 'api' | 'url' | 'json' | 'default' | 'pack'
  id?: string
  packId?: number
  packInfo?: {
    name: string
    totalLevels: number
    currentIndex: number
  }
}

export class LevelLoader {
  private static defaultApiUrl = 'https://25hackmit--image-recognition-api-fastapi-app.modal.run'
  private static backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  /**
   * Load a level pack with all its levels
   */
  static async loadLevelPack(packId: number): Promise<{
    pack: any
    levels: LevelLoadResult[]
  }> {
    try {
      console.log(`🎮 Loading level pack ${packId}...`)

      const response = await fetch(`${this.backendUrl}/api/level-packs/${packId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const packData = await response.json()
      console.log('📦 Level pack data received:', packData)

      // Extract pack info and levels
      const pack = packData.pack
      const rawLevels = packData.levels || []

      // Convert each level to LevelLoadResult format
      const levels: LevelLoadResult[] = rawLevels.map((levelRow: any, index: number) => {
        // Parse the data field if it's a string
        const levelData = typeof levelRow.data === 'string'
          ? JSON.parse(levelRow.data)
          : levelRow.data

        return {
          data: this.validateLevelData(levelData.level_data || levelData),
          source: 'pack' as const,
          id: levelRow.id?.toString(),
          packId: packId,
          packInfo: {
            name: pack.name,
            totalLevels: rawLevels.length,
            currentIndex: index
          }
        }
      })

      console.log(`✅ Loaded ${levels.length} levels from pack "${pack.name}"`)

      return { pack, levels }
    } catch (error) {
      console.error('❌ Failed to load level pack:', error)
      throw error
    }
  }

  /**
   * Load a specific level from a pack by index
   */
  static async loadLevelFromPack(packId: number, levelIndex: number): Promise<LevelLoadResult> {
    const { levels } = await this.loadLevelPack(packId)

    if (levelIndex < 0 || levelIndex >= levels.length) {
      throw new Error(`Level index ${levelIndex} out of range (0-${levels.length - 1})`)
    }

    return levels[levelIndex]
  }

  /**
   * Load level from backend JSON URL directly (for React integration)
   */
  static async loadFromJsonUrl(jsonUrl: string): Promise<LevelLoadResult> {
    try {
      console.log(`🌐 Fetching level data from JSON URL: ${jsonUrl}`)

      const response = await fetch(jsonUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📋 Level data received from JSON URL:', data)

      // Extract level_data from nested response structure
      const levelData = data.level_data || data
      console.log('📋 Extracted level data:', levelData)

      return {
        data: this.validateLevelData(levelData),
        source: 'json',
        id: data.id || this.extractIdFromUrl(jsonUrl)
      }
    } catch (error) {
      console.error('❌ Failed to fetch level data from JSON URL:', error)
      throw error
    }
  }

  /**
   * Load level from API level ID
   */
  static async loadFromLevelId(levelId: string, apiUrl?: string): Promise<LevelLoadResult> {
    const baseUrl = apiUrl || this.defaultApiUrl

    try {
      console.log(`🌐 Fetching level data for ID: ${levelId}`)

      const response = await fetch(`${baseUrl}/api/levels/${levelId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📋 Level data received:', data)

      // Extract level_data from nested response structure
      const levelData = data.level_data || data
      console.log('📋 Extracted level data:', levelData)

      return {
        data: this.validateLevelData(levelData),
        source: 'api',
        id: data.id || levelId
      }
    } catch (error) {
      console.error('❌ Failed to fetch level data:', error)
      throw error
    }
  }

  /**
   * Load level from inline JSON data
   */
  static loadFromJsonData(jsonData: any): LevelLoadResult {
    try {
      console.log('📋 Loading level from inline JSON data:', jsonData)

      return {
        data: this.validateLevelData(jsonData),
        source: 'json',
        id: jsonData.level_id || 'inline'
      }
    } catch (error) {
      console.error('❌ Failed to parse inline JSON data:', error)
      throw error
    }
  }

  /**
   * Get default level data
   */
  static getDefaultLevel(): LevelLoadResult {
    return {
      data: this.getDefaultLevelData(),
      source: 'default',
      id: 'default'
    }
  }

  /**
   * 从URL参数直接加载压缩的数据（备用方案）
   */
  static loadFromURL(): LevelLoadResult | null {
    const urlParams = new URLSearchParams(window.location.search)
    const data = urlParams.get('data')

    if (!data) return null

    try {
      // 如果需要解压缩，这里可以添加解压逻辑
      const decompressed = atob(data) // 简单base64解码
      const levelData = JSON.parse(decompressed)

      console.log('📋 Level data loaded from URL:', levelData)
      return {
        data: this.validateLevelData(levelData),
        source: 'url',
        id: urlParams.get('id') || 'url-data'
      }
    } catch (error) {
      console.error('❌ Failed to parse URL data:', error)
      return null
    }
  }

  /**
   * 验证和规范化地图数据
   */
  static validateLevelData(data: any): LevelData {
    const validated: LevelData = {
      starting_points: [],
      end_points: [],
      rigid_bodies: []
    }

    // 验证起始点
    if (data.starting_points && Array.isArray(data.starting_points)) {
      validated.starting_points = data.starting_points
        .filter((point: any) => point.coordinates && Array.isArray(point.coordinates))
        .map((point: any) => ({
          coordinates: [
            Math.max(0, Math.min(1024, point.coordinates[0])),
            Math.max(0, Math.min(576, point.coordinates[1]))
          ] as [number, number]
        }))
    }

    // 验证终点
    if (data.end_points && Array.isArray(data.end_points)) {
      validated.end_points = data.end_points
        .filter((point: any) => point.coordinates && Array.isArray(point.coordinates))
        .map((point: any) => ({
          coordinates: [
            Math.max(0, Math.min(1024, point.coordinates[0])),
            Math.max(0, Math.min(576, point.coordinates[1]))
          ] as [number, number]
        }))
    }

    // 验证刚体（墙壁和平台）
    if (data.rigid_bodies && Array.isArray(data.rigid_bodies)) {
      validated.rigid_bodies = data.rigid_bodies
        .filter((body: any) => body.contour_points && Array.isArray(body.contour_points))
        .map((body: any) => ({
          contour_points: body.contour_points
            .filter((point: any) => Array.isArray(point) && point.length >= 2)
            .map((point: any) => [
              Math.max(0, Math.min(1024, point[0])),
              Math.max(0, Math.min(576, point[1]))
            ] as [number, number])
        }))
        .filter((body: any) => body.contour_points.length >= 3) // 至少3个点才能形成多边形
    }

    // 验证金币（可选）
    if (data.coins && Array.isArray(data.coins)) {
      validated.coins = data.coins
        .filter((coin: any) => typeof coin.x === 'number' && typeof coin.y === 'number')
        .map((coin: any) => ({
          x: Math.max(0, Math.min(1024, coin.x)),
          y: Math.max(0, Math.min(576, coin.y))
        }))
    }

    // 验证敌人（可选）
    if (data.enemies && Array.isArray(data.enemies)) {
      validated.enemies = data.enemies
        .filter((enemy: any) => typeof enemy.x === 'number' && typeof enemy.y === 'number')
        .map((enemy: any) => ({
          x: Math.max(0, Math.min(1024, enemy.x)),
          y: Math.max(0, Math.min(576, enemy.y)),
          type: enemy.type || 'goomba'
        }))
    }

    console.log('✅ Level data validated:', validated)
    return validated
  }

  /**
   * 获取默认关卡数据（fallback）
   */
  static getDefaultLevelData(): LevelData {
    return {
      starting_points: [{ coordinates: [100, 400] }],
      end_points: [{ coordinates: [900, 400] }],
      rigid_bodies: [
        {
          // 地面
          contour_points: [
            [0, 550],
            [1024, 550],
            [1024, 576],
            [0, 576]
          ]
        },
        {
          // 测试平台
          contour_points: [
            [300, 450],
            [400, 450],
            [400, 470],
            [300, 470]
          ]
        }
      ],
      coins: [
        { x: 350, y: 400 },
        { x: 500, y: 300 }
      ]
    }
  }

  /**
   * Extract level ID from URL
   */
  private static extractIdFromUrl(url: string): string | undefined {
    const matches = url.match(/\/([^\/]+)\.json$/) || url.match(/\/levels\/([^\/\?]+)/)
    return matches ? matches[1] : undefined
  }

  /**
   * 主加载函数 - 智能选择最佳加载方式 (for React components)
   */
  static async loadLevel(options?: {
    jsonUrl?: string
    levelId?: string
    apiUrl?: string
    jsonData?: any
    fallbackToDefault?: boolean
    packId?: number
  }): Promise<LevelLoadResult> {
    const { jsonUrl, levelId, apiUrl, jsonData, fallbackToDefault = true, packId } = options || {}

    try {
      // 1. 优先使用直接提供的JSON数据
      if (jsonData) {
        return this.loadFromJsonData(jsonData)
      }

      // 2. 检查 URL 参数中是否有 pack 参数
      const urlParams = new URLSearchParams(window.location.search)
      const urlPackId = urlParams.get('pack')
      const effectivePackId = packId || (urlPackId ? parseInt(urlPackId) : undefined)

      if (effectivePackId) {
        console.log(`🎮 Loading level pack ${effectivePackId} from URL parameter`)
        const { levels } = await this.loadLevelPack(effectivePackId)
        if (levels.length > 0) {
          return levels[0] // Return first level of the pack
        }
      }

      // 3. 尝试从JSON URL加载
      if (jsonUrl) {
        return await this.loadFromJsonUrl(jsonUrl)
      }

      // 4. 尝试从API level ID加载
      if (levelId) {
        return await this.loadFromLevelId(levelId, apiUrl)
      }

      // 5. 尝试从URL参数加载
      const urlData = this.loadFromURL()
      if (urlData) {
        return urlData
      }

      // 6. 如果启用fallback，返回默认数据
      if (fallbackToDefault) {
        console.log('📋 Using default level data (fallback)')
        return this.getDefaultLevel()
      }

      throw new Error('No level data source provided')

    } catch (error) {
      if (fallbackToDefault) {
        console.warn('⚠️ Failed to load level, using default:', error)
        return this.getDefaultLevel()
      }
      throw error
    }
  }
}