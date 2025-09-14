// Map Processing Service - Integration with OpenCV Backend
const OPENCV_API_URL = 'https://25hackmit--image-recognition-api-process-base64.modal.run';

class MapProcessingService {
  constructor() {
    this.processingSteps = [
      { id: 'scan', label: 'Scanning image', icon: '🔍' },
      { id: 'detect', label: 'Detecting shapes', icon: '📐' },
      { id: 'generate', label: 'Generating level', icon: '🎮' }
    ];
  }

  // Convert file to base64
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data:image/...;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  // Process hand-drawn map with OpenCV backend
  async processMap(imageFile, onProgress) {
    try {
      // Step 1: Scanning
      if (onProgress) onProgress('scan', 'Scanning your hand-drawn map...');

      // Convert image to base64
      const base64Image = await this.fileToBase64(imageFile);

      // Step 2: Detecting shapes
      if (onProgress) onProgress('detect', 'Detecting triangles, circles, and platforms...');

      // Call OpenCV backend
      const response = await fetch(OPENCV_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: base64Image,
          simplify_contours: true,
          max_vertices: 200,
          simplification_factor: 0.1,
          use_convex_decomposition: false
        })
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.status}`);
      }

      const data = await response.json();

      // Step 3: Generating level
      if (onProgress) onProgress('generate', 'Creating Mario level from detected shapes...');

      // Process the response data
      const processedData = this.transformToGameData(data);

      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
        data: processedData,
        rawData: data,
        summary: this.generateSummary(processedData)
      };
    } catch (error) {
      console.error('Error processing map:', error);
      return {
        success: false,
        error: error.message || 'Failed to process map'
      };
    }
  }

  // Transform OpenCV data to game-compatible format
  transformToGameData(cvData) {
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

      platforms: rigid_bodies.map((body, index) => ({
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
        vertices: body.contour_points ? body.contour_points.map(point => ({
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
  generateSummary(gameData) {
    const { startPosition, endPosition, platforms, metadata } = gameData;

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
  validateGameData(gameData) {
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
  getDrawingInstructions() {
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