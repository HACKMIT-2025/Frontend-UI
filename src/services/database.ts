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

  // Test database connection
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    if (!this.config) {
      return {
        success: false,
        error: 'Database configuration not found. Please check your .env file.'
      }
    }

    try {
      console.log('🔍 Testing Neon database connection...')
      console.log('📊 Config:', {
        projectId: this.config.projectId,
        branchId: this.config.branchId,
        endpoint: this.config.endpoint,
        hasApiKey: !!this.config.apiKey
      })

      // Test connection with a simple query
      const response = await fetch(`https://console.neon.tech/api/v2/projects/${this.config.projectId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'SELECT 1 as test_connection, NOW() as current_time;',
          database: 'hackmit',
          branch_id: this.config.branchId
        })
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response error:', errorText)
        return {
          success: false,
          error: `Database connection failed: ${response.status} - ${errorText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            errorText
          }
        }
      }

      const result = await response.json()
      console.log('📊 Query result:', result)

      if (result.error) {
        return {
          success: false,
          error: `Database query error: ${result.error.message}`,
          details: result
        }
      }

      return {
        success: true,
        details: {
          connection: 'OK',
          testQuery: result.rows?.[0],
          responseTime: Date.now()
        }
      }

    } catch (error) {
      console.error('🔥 Database connection test failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connection error',
        details: { error: error }
      }
    }
  }

  // Create the mario_maps table if it doesn't exist
  async createTable(): Promise<{ success: boolean; error?: string; details?: any }> {
    if (!this.config) {
      return {
        success: false,
        error: 'Database configuration not found.'
      }
    }

    try {
      const response = await fetch(`https://console.neon.tech/api/v2/projects/${this.config.projectId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            CREATE TABLE IF NOT EXISTS mario_maps (
              id SERIAL PRIMARY KEY,
              level_id VARCHAR(255) UNIQUE NOT NULL,
              json_url TEXT NOT NULL,
              embed_url TEXT NOT NULL,
              game_url TEXT NOT NULL,
              title VARCHAR(500) DEFAULT 'Untitled Mario Level',
              description TEXT DEFAULT 'Hand-drawn Mario level created with AI',
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_mario_maps_created_at ON mario_maps(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_mario_maps_level_id ON mario_maps(level_id);
          `,
          database: 'hackmit',
          branch_id: this.config.branchId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Table creation failed: ${response.status} - ${errorText}`,
          details: { status: response.status, errorText }
        }
      }

      const result = await response.json()

      if (result.error) {
        return {
          success: false,
          error: `Table creation error: ${result.error.message}`,
          details: result
        }
      }

      return {
        success: true,
        details: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown table creation error',
        details: { error }
      }
    }
  }

  async publishMap(mapData: MapData): Promise<{ success: boolean; error?: string; mapId?: string }> {
    if (!this.config) {
      return {
        success: false,
        error: 'Database configuration not found. Please check your .env file.'
      }
    }

    try {
      // Use Neon API for SQL execution
      const response = await fetch(`https://console.neon.tech/api/v2/projects/${this.config.projectId}/query`, {
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
          ],
          database: 'hackmit',
          branch_id: this.config.branchId
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

      // Neon API returns rows in result.rows
      const insertedRow = result.rows?.[0]
      return {
        success: true,
        mapId: insertedRow?.id?.toString()
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
      const response = await fetch(`https://console.neon.tech/api/v2/projects/${this.config.projectId}/query`, {
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
          params: [limit],
          database: 'hackmit',
          branch_id: this.config.branchId
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
        maps: result.rows || []
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