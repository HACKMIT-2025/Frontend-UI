// API Service for Backend Integration
// All API calls are now proxied through our secure backend

interface ConversationMessage {
  role: string;
  content: string;
}

interface APIStatus {
  openRouter: boolean;
  anthropic: boolean;
  ready: boolean;
}

// Backend API URL - Update this when deployed to Modal
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Model configurations
const MODELS = {
  text: 'cerebras/llama3.1-70b', // Cerebras Llama 70B for text
  vision: 'claude-3-5-sonnet-20241022' // Anthropic Claude for image recognition
};

class ChatAPI {
  private backendUrl: string;

  constructor() {
    this.backendUrl = BACKEND_API_URL;
  }

  // Send text message using Cerebras Llama 70B via backend proxy
  async sendTextMessage(message: string, conversationHistory: ConversationMessage[] = []): Promise<string> {
    try {
      const response = await fetch(`${this.backendUrl}/api/chat/openrouter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODELS.text,
          messages: [
            ...conversationHistory,
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Backend API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error sending text message:', error);
      throw error;
    }
  }

  // Send image with message using Anthropic Claude via backend proxy
  async sendImageMessage(message: string, imageBase64: string, _conversationHistory: ConversationMessage[] = []): Promise<string> {
    try {
      // Clean the base64 string
      const cleanedBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

      const response = await fetch(`${this.backendUrl}/api/chat/anthropic/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: cleanedBase64,
          prompt: message || 'What is in this image?',
          detail_level: 'auto'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Backend API error: ${response.status}`);
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Error sending image message:', error);
      throw error;
    }
  }

  // Stream text response from Cerebras Llama 70B via backend proxy
  async streamTextMessage(message: string, conversationHistory: ConversationMessage[] = [], onChunk: (chunk: string) => void): Promise<string> {
    try {
      const response = await fetch(`${this.backendUrl}/api/chat/openrouter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODELS.text,
          messages: [
            ...conversationHistory,
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Backend API error: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                onChunk(content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Error streaming text message:', error);
      throw error;
    }
  }

  // Check if backend API is available and configured
  async isConfigured(): Promise<APIStatus> {
    try {
      const response = await fetch(`${this.backendUrl}/`);
      if (response.ok) {
        const data = await response.json();
        return {
          openRouter: true,
          anthropic: true,
          ready: data.status === 'healthy'
        };
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
    }

    return {
      openRouter: false,
      anthropic: false,
      ready: false
    };
  }

  // Update backend URL (for switching between local and production)
  updateBackendUrl(url: string): void {
    this.backendUrl = url;
  }

  // Get current backend URL
  getBackendUrl(): string {
    return this.backendUrl;
  }
}

// Additional API methods for game-specific functionality

export class GameAPI {
  private backendUrl: string;

  constructor() {
    this.backendUrl = BACKEND_API_URL;
  }

  // Generate game dialog
  async generateDialog(context: string, dialogType: 'teaser' | 'victory' | 'defeat', playerState?: any): Promise<string> {
    try {
      const response = await fetch(`${this.backendUrl}/api/chat/openrouter/game-dialog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          dialog_type: dialogType,
          player_state: playerState || {},
          max_length: 100
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate dialog: ${response.status}`);
      }

      const data = await response.json();
      return data.dialog;
    } catch (error) {
      console.error('Error generating game dialog:', error);
      // Return fallback dialog
      const fallbacks = {
        teaser: "You'll never save the princess!",
        victory: "Congratulations! You did it!",
        defeat: "Don't give up! Try again!"
      };
      return fallbacks[dialogType];
    }
  }

  // Process game level image
  async processLevelImage(imageBase64: string, difficulty: string = 'medium'): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/modal/generate-level`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          difficulty,
          game_type: 'platformer'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to process level image: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing level image:', error);
      throw error;
    }
  }

  // Save level to database
  async saveLevel(name: string, data: any, difficulty: string = 'medium'): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/db/save-level`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: `Level created on ${new Date().toLocaleDateString()}`,
          difficulty,
          data,
          created_by: 'user'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save level: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving level:', error);
      throw error;
    }
  }

  // Load levels from database
  async loadLevels(difficulty?: string, limit: number = 50): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (difficulty) params.append('difficulty', difficulty);
      params.append('limit', limit.toString());

      const response = await fetch(`${this.backendUrl}/api/db/levels?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to load levels: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error loading levels:', error);
      throw error;
    }
  }

  // Get a specific level by ID from database
  async getLevel(levelId: number): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/db/level/${levelId}`);

      if (!response.ok) {
        throw new Error(`Failed to get level: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting level:', error);
      throw error;
    }
  }

  // Scan and enhance document to black/white
  async scanDocument(imageBase64: string, autoDetectEdges: boolean = true, thresholdMethod: string = 'adaptive'): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/opencv/scan-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          auto_detect_edges: autoDetectEdges,
          enhance_contrast: true,
          threshold_method: thresholdMethod
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to scan document: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error scanning document:', error);
      throw error;
    }
  }

  // Process image with OpenCV for shape detection
  async processImageWithOpenCV(imageBase64: string): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/opencv/process-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          simplify_contours: true,
          max_vertices: 150,
          simplification_factor: 0.002
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to process image: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing image with OpenCV:', error);
      throw error;
    }
  }

  // Create a level pack from multiple levels
  async createLevelPack(data: {
    name: string;
    description?: string;
    level_ids: number[];
    created_by: string;
    is_public?: boolean;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/level-packs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || '',
          level_ids: data.level_ids,
          created_by: data.created_by,
          is_public: data.is_public || false
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create level pack: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating level pack:', error);
      throw error;
    }
  }

  // Get level pack details
  async getLevelPack(packId: number): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/level-packs/${packId}`);

      if (!response.ok) {
        throw new Error(`Failed to get level pack: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting level pack:', error);
      throw error;
    }
  }

  // Save player progress for a level pack
  async savePackProgress(packId: number, data: {
    player_nickname: string;
    current_level_index: number;
    completed_levels: number[];
    total_time_ms?: number;
    total_deaths?: number;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.backendUrl}/api/level-packs/${packId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_nickname: data.player_nickname,
          current_level_index: data.current_level_index,
          completed_levels: data.completed_levels,
          total_time_ms: data.total_time_ms || 0,
          total_deaths: data.total_deaths || 0
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save pack progress: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving pack progress:', error);
      throw error;
    }
  }

  // Get player progress for a level pack
  async getPackProgress(packId: number, nickname: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.backendUrl}/api/level-packs/${packId}/progress/${nickname}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get pack progress: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting pack progress:', error);
      throw error;
    }
  }
}

// Export instances
const chatAPI = new ChatAPI();
export const gameAPI = new GameAPI();
export default chatAPI;