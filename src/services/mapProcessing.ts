// Map Processing Service - Integration with OpenCV Backend


interface GamePosition {
  x: number;
  y: number;
  area?: number;
}

interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centroid: { x: number; y: number };
  area: number;
  vertices: { x: number; y: number }[];
}

interface GameData {
  startPosition: GamePosition | null;
  endPosition: GamePosition | null;
  platforms: Platform[];
  worldSize: { width: number; height: number };
  metadata: {
    totalShapes: number;
    startPoints: number;
    endPoints: number;
    platforms: number;
    scaleFactor: number;
  };
}

interface ProcessingResult {
  success: boolean;
  data?: GameData;
  rawData?: any;
  levelData?: any;
  summary?: string;
  error?: string;
  level_id?: string;
  data_url?: string;
  game_url?: string;
  embed_url?: string;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

interface DrawingInstructions {
  title: string;
  steps: string[];
  tips: string[];
}

type ProgressCallback = (step: string, message: string) => void;

class MapProcessingService {
  constructor() {
    // Processing service initialized
  }

  // Convert file to base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data:image/...;base64, prefix
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  // 前端上传函数 - 仿造示例实现
  async uploadImage(imageFile: File): Promise<any> {
    // 1. 将文件转换为 base64
    const base64String = await this.fileToBase64(imageFile);

    // 2. 发送到 API
    const response = await fetch('https://25hackmit--image-recognition-api-fastapi-app.modal.run/api/levels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_base64: base64String  // 注意：不需要 data:image/jpeg;base64, 前缀
      })
    });

    const result = await response.json();
    return result;
  }

  // Process hand-drawn map with OpenCV backend
  async processMap(imageFile: File, onProgress?: ProgressCallback): Promise<ProcessingResult> {
    try {
      // Step 1: Scanning
      if (onProgress) onProgress('scan', 'Scanning your hand-drawn map...');

      // Step 2: Detecting shapes
      if (onProgress) onProgress('detect', 'Detecting triangles, circles, and platforms...');

      // 使用简化的上传函数
      const result = await this.uploadImage(imageFile);

      // Validate required fields
      if (!result.level_id || !result.data_url) {
        throw new Error('Invalid API response: missing required fields');
      }

      // Step 3: Generating level
      if (onProgress) onProgress('generate', 'Creating Mario level and generating URLs...');

      // Validate data URL accessibility (with error tolerance)
      if (onProgress) onProgress('validate', 'Validating level data accessibility...');

      let levelData = null;
      try {
        const dataUrlResponse = await fetch(result.data_url, {
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });
        if (dataUrlResponse.ok) {
          levelData = await dataUrlResponse.json();
          console.log('✅ Level data validated successfully:', levelData);
        } else {
          console.warn('⚠️ Could not validate data URL, but continuing with level creation');
        }
      } catch (error) {
        console.warn('⚠️ Data URL validation failed, but level was created:', error);
        // Don't throw error, just continue - the level might still work
      }

      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Return the full result from the API with level details
      return {
        success: true,
        level_id: result.level_id,
        data_url: result.data_url,
        game_url: result.game_url,
        embed_url: result.embed_url,
        rawData: result,
        levelData: levelData,
        summary: `Level created successfully! Level ID: ${result.level_id}`,
        data: undefined // We'll use the URLs instead of processing the data locally
      };

    } catch (error) {
      console.error('Error processing map:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process map'
      };
    }
  }

  // Transform OpenCV data to game-compatible format
  transformToGameData(cvData: any): GameData {
    const { starting_points, end_points, rigid_bodies, image_size, scale_factor } = cvData;

    // Scale coordinates to game world
    const gameScale = 1 / (scale_factor || 0.3);

    return {
      startPosition: starting_points.length > 0 ? {
        x: starting_points[0].coordinates[0] * gameScale,
        y: starting_points[0].coordinates[1] * gameScale,
        area: starting_points[0].area
      } : null,

      endPosition: end_points.length > 0 ? {
        x: end_points[0].coordinates[0] * gameScale,
        y: end_points[0].coordinates[1] * gameScale,
        area: end_points[0].area
      } : null,

      platforms: rigid_bodies.map((body: any, index: number) => ({
        id: `platform_${index}`,
        x: body.bounding_box[0] * gameScale,
        y: body.bounding_box[1] * gameScale,
        width: body.bounding_box[2] * gameScale,
        height: body.bounding_box[3] * gameScale,
        centroid: {
          x: body.centroid[0] * gameScale,
          y: body.centroid[1] * gameScale
        },
        area: body.area,
        vertices: body.contour_points ? body.contour_points.map((point: any) => ({
          x: point[0] * gameScale,
          y: point[1] * gameScale
        })) : []
      })),

      worldSize: {
        width: image_size[1] * gameScale,
        height: image_size[0] * gameScale
      },

      metadata: {
        totalShapes: starting_points.length + end_points.length + rigid_bodies.length,
        startPoints: starting_points.length,
        endPoints: end_points.length,
        platforms: rigid_bodies.length,
        scaleFactor: scale_factor
      }
    };
  }

  // Generate a summary message for the user
  generateSummary(gameData: GameData): string {
    const { startPosition, endPosition, platforms } = gameData;

    let summary = `Successfully processed your map! Here's what I found:\n\n`;

    if (startPosition) {
      summary += `✅ **Start Point**: Triangle detected at position (${Math.round(startPosition.x)}, ${Math.round(startPosition.y)})\n`;
    } else {
      summary += `⚠️ **Start Point**: No triangle detected - using default position\n`;
    }

    if (endPosition) {
      summary += `✅ **End Point**: Circle detected at position (${Math.round(endPosition.x)}, ${Math.round(endPosition.y)})\n`;
    } else {
      summary += `⚠️ **End Point**: No circle detected - using default position\n`;
    }

    summary += `🏗️ **Platforms**: ${platforms.length} platforms/obstacles detected\n`;

    if (platforms.length > 0) {
      summary += `\nYour level includes ${platforms.length} custom platforms that Mario can jump on. `;
      summary += `The level spans ${Math.round(gameData.worldSize.width)}x${Math.round(gameData.worldSize.height)} units.`;
    }

    return summary;
  }

  // Validate if the processed data is playable
  validateGameData(gameData: GameData): ValidationResult {
    const issues = [];

    if (!gameData.startPosition) {
      issues.push('No starting point detected (draw a triangle)');
    }

    if (!gameData.endPosition) {
      issues.push('No end point detected (draw a circle)');
    }

    if (gameData.platforms.length === 0) {
      issues.push('No platforms detected (draw rectangles or other shapes)');
    }

    if (gameData.platforms.length > 50) {
      issues.push('Too many platforms detected (max 50) - simplify your drawing');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Generate example map instructions
  getDrawingInstructions(): DrawingInstructions {
    return {
      title: 'How to Draw Your Mario Map',
      steps: [
        '1. Use a white paper and dark pen/marker',
        '2. Draw a **triangle (▲)** where Mario starts',
        '3. Draw a **circle (●)** where the level ends',
        '4. Draw **rectangles, squares, or other shapes** for platforms',
        '5. Keep shapes clear and well-separated',
        '6. Take a photo or scan in good lighting'
      ],
      tips: [
        'Larger shapes are easier to detect',
        'Avoid overlapping shapes',
        'Use thick, dark lines',
        'Keep the background clean'
      ]
    };
  }
}

export default new MapProcessingService();