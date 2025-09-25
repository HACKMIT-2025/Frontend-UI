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
  modal_level_id?: string;
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
  private backendUrl: string;

  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    console.log('MapProcessingService initialized with backend URL:', this.backendUrl);
  }

  // 检查后端API健康状态
  async checkBackendHealth(): Promise<{ isHealthy: boolean; message: string; version?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          isHealthy: true,
          message: 'Backend is healthy',
          version: data.version || 'unknown'
        };
      } else {
        return {
          isHealthy: false,
          message: `Backend responded with status: ${response.status}`
        };
      }
    } catch (error) {
      return {
        isHealthy: false,
        message: `Failed to connect to backend: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
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

  // 前端上传函数 - 通过后端API
  async uploadImage(imageFile: File, prompt: string = "Analyze this hand-drawn map and create a Mario game level"): Promise<any> {
    try {
      // 1. 将文件转换为 base64
      const base64String = await this.fileToBase64(imageFile);

      // 2. 发送到我们的后端API，由后端处理OpenCV识别和数据库存储
      console.log('Uploading to backend:', this.backendUrl);

      const response = await fetch(`${this.backendUrl}/api/modal/generate-level`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: base64String,
          prompt: prompt
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('Backend response:', result);

      return result;
    } catch (error) {
      console.error('Error calling backend API:', error);
      throw error;
    }
  }

  // Process hand-drawn map with OpenCV backend
  async processMap(imageFile: File, onProgress?: ProgressCallback): Promise<ProcessingResult> {
    try {
      // Step 1: Scanning
      if (onProgress) onProgress('scan', 'Scanning your hand-drawn map...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Detecting shapes
      if (onProgress) onProgress('detect', 'Using OpenCV to detect shapes (triangles, circles, platforms)...');

      // 调用后端API进行OpenCV图像识别
      const result = await this.uploadImage(imageFile, "Analyze this hand-drawn Mario level map. Detect triangles as start points, circles as end points, and other shapes as platforms.");

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证后端响应
      if (!result.success) {
        throw new Error(result.message || 'Backend processing failed');
      }

      // Step 3: Generating level
      if (onProgress) onProgress('generate', 'Generating Mario level from detected shapes...');

      // 处理后端返回的数据
      let gameData: GameData | undefined = undefined;
      if (result.data) {
        // 如果后端返回了OpenCV处理的数据，转换为游戏格式
        gameData = this.transformOpenCVToGameData(result.data);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // 生成处理摘要
      const summary = gameData
        ? this.generateSummary(gameData)
        : `Level created successfully! Level ID: ${result.level_id}`;

      // 返回处理结果
      return {
        success: true,
        level_id: result.level_id,
        modal_level_id: result.modal_level_id,
        rawData: result,
        levelData: result.data,
        data: gameData,
        summary: summary,
        // 不再暴露直接的Modal URLs，改为通过我们的API访问
        data_url: undefined,
        game_url: undefined,
        embed_url: undefined
      };

    } catch (error) {
      console.error('Error processing map:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process map'
      };
    }
  }

  // Transform backend OpenCV data to game-compatible format
  transformOpenCVToGameData(backendData: any): GameData {
    // 处理后端返回的OpenCV识别数据
    const { starting_points, end_points, rigid_bodies, image_size, scale_factor } = backendData;

    // 默认缩放因子
    const gameScale = 1 / (scale_factor || 0.3);

    return {
      startPosition: starting_points && starting_points.length > 0 ? {
        x: starting_points[0].coordinates[0] * gameScale,
        y: starting_points[0].coordinates[1] * gameScale,
        area: starting_points[0].area || 100
      } : null,

      endPosition: end_points && end_points.length > 0 ? {
        x: end_points[0].coordinates[0] * gameScale,
        y: end_points[0].coordinates[1] * gameScale,
        area: end_points[0].area || 100
      } : null,

      platforms: (rigid_bodies || []).map((body: any, index: number) => ({
        id: `platform_${index}`,
        x: body.centroid ? body.centroid[0] * gameScale : 0,
        y: body.centroid ? body.centroid[1] * gameScale : 0,
        width: body.bounding_box ? body.bounding_box[2] * gameScale : 50,
        height: body.bounding_box ? body.bounding_box[3] * gameScale : 50,
        centroid: {
          x: body.centroid ? body.centroid[0] * gameScale : 0,
          y: body.centroid ? body.centroid[1] * gameScale : 0
        },
        area: body.area || 1000,
        vertices: body.contour_points ? body.contour_points.map((point: any) => ({
          x: point[0] * gameScale,
          y: point[1] * gameScale
        })) : []
      })),

      worldSize: {
        width: image_size ? image_size[1] * gameScale : 800,
        height: image_size ? image_size[0] * gameScale : 600
      },

      metadata: {
        totalShapes: (starting_points?.length || 0) + (end_points?.length || 0) + (rigid_bodies?.length || 0),
        startPoints: starting_points?.length || 0,
        endPoints: end_points?.length || 0,
        platforms: rigid_bodies?.length || 0,
        scaleFactor: scale_factor || 0.3
      }
    };
  }

  // Transform OpenCV data to game-compatible format (legacy)
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