interface MapData {
  level_id: string
  json_url: string
  embed_url: string
  game_url: string
  created_at?: string
  title?: string
  description?: string
}

interface DatabaseConfig {
  apiKey: string
  projectId: string
  branchId: string
  endpoint: string
}

class DatabaseService {
  private config: DatabaseConfig | null = null

  constructor() {
    this.initializeConfig()
  }

  private initializeConfig() {
    const apiKey = import.meta.env.VITE_NEON_API_KEY
    const projectId = import.meta.env.VITE_NEON_PROJECT_ID
    const branchId = import.meta.env.VITE_NEON_BRANCH_ID
    const endpoint = import.meta.env.VITE_NEON_ENDPOINT

    if (apiKey && projectId && branchId && endpoint) {
      this.config = {
        apiKey,
        projectId,
        branchId,
        endpoint
      }
    }
  }

  isConfigured(): boolean {
    return this.config !== null
  }

  async publishMap(mapData: MapData): Promise<{ success: boolean; error?: string; mapId?: string }> {
    if (!this.config) {
      return {
        success: false,
        error: 'Database configuration not found. Please check your .env file.'
      }
    }

    try {
      // Use Neon's SQL over HTTP API
      const response = await fetch(`https://${this.config.endpoint}/sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            INSERT INTO mario_maps (level_id, json_url, embed_url, game_url, title, description, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, created_at;
          `,
          params: [
            mapData.level_id,
            mapData.json_url,
            mapData.embed_url,
            mapData.game_url,
            mapData.title || `Mario Level ${mapData.level_id}`,
            mapData.description || 'Hand-drawn Mario level created with AI'
          ]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Database error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error.message || 'Unknown database error')
      }

      return {
        success: true,
        mapId: result.results[0]?.id?.toString()
      }

    } catch (error) {
      console.error('Database publish error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish map to database'
      }
    }
  }

  async getPublishedMaps(limit: number = 10): Promise<{ success: boolean; maps?: MapData[]; error?: string }> {
    if (!this.config) {
      return {
        success: false,
        error: 'Database configuration not found.'
      }
    }

    try {
      const response = await fetch(`https://${this.config.endpoint}/sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            SELECT level_id, json_url, embed_url, game_url, title, description, created_at
            FROM mario_maps
            ORDER BY created_at DESC
            LIMIT $1;
          `,
          params: [limit]
        })
      })

      if (!response.ok) {
        throw new Error(`Database error: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error.message)
      }

      return {
        success: true,
        maps: result.results || []
      }

    } catch (error) {
      console.error('Database fetch error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch maps from database'
      }
    }
  }
}

const databaseService = new DatabaseService()
export default databaseService