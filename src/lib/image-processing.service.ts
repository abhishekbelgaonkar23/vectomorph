import type { ImageProcessingService, ValidationResult } from '~/types/app';
import type { TracingOptions } from '~/types/imagetracer';
import { AppError, ErrorCategory } from '~/types/app';
import { ImageTracer } from 'imagetracer';

/**
 * Service class for processing images and converting them to SVG using ImageTracer.js
 * All processing is done client-side without server interaction
 */
export class ImageProcessingServiceImpl implements ImageProcessingService {
  private readonly supportedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/bmp',
    'image/gif'
  ];

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  /**
   * Default tracing options optimized for quality/performance balance
   */
  private readonly defaultOptions: TracingOptions = {
    ltres: 1,           // Line threshold
    qtres: 1,           // Quad threshold  
    pathomit: 8,        // Path omit threshold
    colorsampling: 1,   // Color sampling
    numberofcolors: 16, // Number of colors
    mincolorratio: 0.02, // Minimum color ratio
    colorquantcycles: 3  // Color quantization cycles
  };

  /**
   * Validates if the file is suitable for image processing
   * @param file - File to validate
   * @returns ValidationResult with success status and error message
   */
  validateFile(file: File): ValidationResult {
    if (!file) {
      return {
        isValid: false,
        error: 'No file provided'
      };
    }

    // Check file type
    if (!this.supportedTypes.includes(file.type.toLowerCase())) {
      return {
        isValid: false,
        error: `Unsupported file type: ${file.type}. Supported types: ${this.supportedTypes.join(', ')}`
      };
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      const maxSizeMB = (this.maxFileSize / (1024 * 1024)).toFixed(1);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        isValid: false,
        error: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
      };
    }

    return {
      isValid: true
    };
  }

  /**
   * Gets the default tracing options
   * @returns Default TracingOptions object
   */
  getDefaultOptions(): TracingOptions {
    return { ...this.defaultOptions };
  }

  /**
   * Processes an image file and converts it to SVG string
   * @param file - Image file to process
   * @param options - Optional tracing options (uses defaults if not provided)
   * @returns Promise that resolves to SVG string
   */
  async processImage(file: File, options?: TracingOptions): Promise<string> {
    // Validate file first
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new AppError(
        `File validation failed: ${validation.error}`,
        ErrorCategory.FILE_VALIDATION,
        validation.error || 'Invalid file',
        true
      );
    }

    try {
      // Load image into canvas - NO PREPROCESSING
      const canvas = await this.loadImageToCanvas(file);

      // Use simple, working ImageTracer options
      const tracingOptions: TracingOptions = {
        ltres: 1,
        qtres: 1,
        pathomit: 8,
        colorsampling: 1,
        numberofcolors: 16,
        mincolorratio: 0.02,
        colorquantcycles: 3,
        ...(options || {})
      };

      // Use the tracing method
      const svgString = await this.traceImageToSvgWithVectorizer(canvas, tracingOptions);

      console.log('ImageTracer output:', svgString.substring(0, 200));
      // Clean up canvas
      this.cleanupCanvas(canvas);
      return svgString;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.PROCESSING,
        'Failed to convert image to SVG. Please try with a different image.',
        true
      );
    }
  }

  /**
   * Loads an image file into a canvas element for processing
   * @param file - Image file to load
   * @returns Promise that resolves to HTMLCanvasElement
   */
  private async loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Create canvas with image dimensions
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new AppError(
              'Failed to get 2D context from canvas',
              ErrorCategory.BROWSER_COMPATIBILITY,
              'Your browser does not support canvas rendering',
              false
            ));
            return;
          }

          // Set canvas dimensions to match image
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw image onto canvas
          ctx.drawImage(img, 0, 0);

          // Clean up image object URL
          URL.revokeObjectURL(img.src);

          resolve(canvas);
        } catch (error) {
          reject(new AppError(
            `Failed to render image to canvas: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ErrorCategory.PROCESSING,
            'Failed to prepare image for processing',
            true
          ));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new AppError(
          'Failed to load image',
          ErrorCategory.FILE_VALIDATION,
          'Unable to load the selected image. Please check if the file is corrupted.',
          true
        ));
      };

      // Create object URL for the file and load it
      try {
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
      } catch (error) {
        reject(new AppError(
          `Failed to create object URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ErrorCategory.BROWSER_COMPATIBILITY,
          'Unable to process the selected file',
          false
        ));
      }
    });
  }

  /**
   * Traces a canvas image to SVG using ImageTracer.js
   * @param canvas - Canvas element containing the image
   * @param options - Tracing options
   * @returns Promise that resolves to SVG string
   */
  private async traceImageToSvgWithVectorizer(canvas: HTMLCanvasElement, options: TracingOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Starting imagetracer processing...');
        console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
        console.log('Processing options:', options);

        // Create ImageTracer instance and get ImageData from canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Cannot get canvas context');
        }
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Create ImageTracer instance and call imageDataToSVG
        const tracer = new ImageTracer();
        const svgString = tracer.imageDataToSVG(imageData, options);

        console.log('ImageTracer returned:', typeof svgString);
        console.log('SVG length:', svgString?.length);
        console.log('SVG preview:', typeof svgString === 'string' ? svgString.substring(0, 200) : 'Not a string');

        if (!svgString || typeof svgString !== 'string') {
          reject(new AppError(
            `ImageTracer returned invalid result: ${typeof svgString} - ${String(svgString).substring(0, 100)}`,
            ErrorCategory.PROCESSING,
            'Failed to generate SVG from image',
            true
          ));
          return;
        }

        // Validate that we got a proper SVG with actual vector content
        if (!svgString.includes('<svg') || !svgString.includes('</svg>')) {
          reject(new AppError(
            `Generated SVG is malformed: ${svgString.substring(0, 200)}`,
            ErrorCategory.PROCESSING,
            'The generated SVG appears to be invalid',
            true
          ));
          return;
        }

        // Check that the SVG contains actual vector paths, not just an empty shell
        const hasVectorContent = svgString.includes('<path') ||
          svgString.includes('<polygon') ||
          svgString.includes('<circle') ||
          svgString.includes('<rect') ||
          svgString.includes('<ellipse') ||
          svgString.includes('<line');

        if (!hasVectorContent) {
          console.warn('SVG contains no vector paths:', svgString.substring(0, 300));
          reject(new AppError(
            `ImageTracer generated an empty SVG without vector paths: ${svgString.substring(0, 200)}`,
            ErrorCategory.PROCESSING,
            'The image could not be converted to vector format. The tracing process failed to generate any paths.',
            true
          ));
          return;
        }

        console.log('SVG validation passed - contains vector content');
        resolve(svgString);
      } catch (error) {
        reject(new AppError(
          `ImageTracer processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ErrorCategory.PROCESSING,
          'Failed to trace image to SVG. Try adjusting the image or using different settings.',
          true
        ));
      }
    });
  }

  /**
   * Cleans up canvas resources
   * @param canvas - Canvas element to clean up
   */
  private cleanupCanvas(canvas: HTMLCanvasElement): void {
    try {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      // Remove canvas from DOM if it was added
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    } catch (error) {
      // Cleanup errors are not critical, just log them
      console.warn('Failed to cleanup canvas:', error);
    }
  }

  /**
   * Utility method to get optimal tracing options based on image characteristics
   * @param canvas - Canvas containing the image
   * @returns Optimized TracingOptions
   */
  getOptimalOptions(canvas: HTMLCanvasElement): TracingOptions {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return this.getDefaultOptions();
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelCount = imageData.width * imageData.height;

    // Adjust options based on image size and complexity
    const options = { ...this.defaultOptions };

    // For larger images, use more aggressive simplification
    if (pixelCount > 1000000) { // > 1MP
      options.pathomit = 12;
      options.numberofcolors = 12;
    } else if (pixelCount > 500000) { // > 0.5MP
      options.pathomit = 10;
      options.numberofcolors = 14;
    }

    return options;
  }

  /**
   * Utility method to estimate processing time based on image size
   * @param file - Image file
   * @returns Estimated processing time in seconds
   */
  estimateProcessingTime(file: File): number {
    // Rough estimation based on file size
    const sizeMB = file.size / (1024 * 1024);
    return Math.max(1, Math.ceil(sizeMB * 3)); // ~3 seconds per MB (more conservative)
  }

  /**
   * Checks if an image might be too complex for fast processing
   * @param canvas - Canvas containing the image
   * @returns True if the image might be complex
   */
  private isImageComplex(canvas: HTMLCanvasElement): boolean {
    const pixelCount = canvas.width * canvas.height;
    const isLarge = pixelCount > 500000; // > 0.5MP

    // Sample some pixels to check for complexity
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    try {
      const sampleSize = Math.min(100, Math.floor(pixelCount / 10000));
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let colorVariations = 0;
      const step = Math.floor(data.length / (sampleSize * 4));

      for (let i = 0; i < data.length - step * 4; i += step * 4) {
        const r1 = data[i] || 0;
        const g1 = data[i + 1] || 0;
        const b1 = data[i + 2] || 0;
        const r2 = data[i + step * 4] || 0;
        const g2 = data[i + step * 4 + 1] || 0;
        const b2 = data[i + step * 4 + 2] || 0;

        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        if (diff > 30) colorVariations++;
      }

      const complexityRatio = colorVariations / sampleSize;
      const isComplex = complexityRatio > 0.3; // More than 30% variation

      console.log(`Image complexity analysis: ${canvas.width}x${canvas.height}, variations: ${complexityRatio.toFixed(2)}, complex: ${isComplex}`);

      return isLarge || isComplex;
    } catch (error) {
      console.warn('Could not analyze image complexity:', error);
      return isLarge;
    }
  }



  // Replace makeWhitePixelsTransparent with a more advanced preprocessing function
  private preprocessLogoCanvas(canvas: HTMLCanvasElement, threshold = 220): { width: number, height: number } {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { width: canvas.width, height: canvas.height };
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      // Remove near-white background
      if (r >= 240 && g >= 240 && b >= 240) {
        data[i + 3] = 0;
        continue;
      }
      // Convert to grayscale
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      // Sharpen contrast: binary threshold
      if (gray < threshold) {
        // Black
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      } else {
        // Transparent
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return { width: canvas.width, height: canvas.height };
  }

  /**
   * Optimizes canvas size for faster processing
   * Reduces large images to a maximum dimension while maintaining aspect ratio
   * @param canvas - Original canvas
   * @returns Optimized canvas
   */
  private optimizeCanvasSize(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const maxDimension = 400; // Maximum width or height for processing (reduced for speed)
    const { width, height } = canvas;

    // If image is already small enough, return as-is
    if (width <= maxDimension && height <= maxDimension) {
      return canvas;
    }

    // Calculate new dimensions maintaining aspect ratio
    let newWidth: number;
    let newHeight: number;

    if (width > height) {
      newWidth = maxDimension;
      newHeight = Math.round((height * maxDimension) / width);
    } else {
      newHeight = maxDimension;
      newWidth = Math.round((width * maxDimension) / height);
    }

    console.log(`Optimizing canvas size from ${width}x${height} to ${newWidth}x${newHeight}`);

    // Create new canvas with optimized size
    const optimizedCanvas = document.createElement('canvas');
    const ctx = optimizedCanvas.getContext('2d');

    if (!ctx) {
      console.warn('Could not get 2D context for optimization, returning original canvas');
      return canvas;
    }

    optimizedCanvas.width = newWidth;
    optimizedCanvas.height = newHeight;

    // Draw the original canvas onto the new canvas with scaling
    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);

    return optimizedCanvas;
  }

  /**
   * Creates a simple geometric SVG approximation when ImageTracer fails
   * This analyzes the image and creates basic shapes as a fallback
   * @param canvas - Canvas element containing the image
   * @returns Simple SVG string with basic shapes
   */
  private createSimpleGeometricSvg(canvas: HTMLCanvasElement): string {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Cannot get canvas context');
      }

      const { width, height } = canvas;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Analyze image to find dominant colors and regions
      const colorMap = new Map<string, number>();
      const sampleStep = Math.max(1, Math.floor(data.length / 40000)); // Sample for performance

      for (let i = 0; i < data.length; i += sampleStep * 4) {
        const r = data[i] || 0;
        const g = data[i + 1] || 0;
        const b = data[i + 2] || 0;
        const a = data[i + 3] || 0;

        if (a > 128) { // Only count non-transparent pixels
          // Quantize colors to reduce complexity
          const qr = Math.floor(r / 64) * 64;
          const qg = Math.floor(g / 64) * 64;
          const qb = Math.floor(b / 64) * 64;
          const colorKey = `rgb(${qr},${qg},${qb})`;

          colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }
      }

      // Get top 3 colors
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      // Create simple geometric shapes
      let shapes = '';

      if (sortedColors.length > 0) {
        // Background rectangle with dominant color
        const dominantColor = sortedColors[0];
        if (dominantColor) {
          shapes += `<rect width="${width}" height="${height}" fill="${dominantColor[0]}" />`;
        }

        // Add some simple shapes based on other colors
        if (sortedColors.length > 1) {
          const secondColor = sortedColors[1];
          if (secondColor) {
            const centerX = width / 2;
            const centerY = height / 2;
            const size = Math.min(width, height) * 0.3;

            shapes += `<circle cx="${centerX}" cy="${centerY}" r="${size}" fill="${secondColor[0]}" opacity="0.7" />`;
          }
        }

        if (sortedColors.length > 2) {
          const thirdColor = sortedColors[2];
          if (thirdColor) {
            const rectWidth = width * 0.6;
            const rectHeight = height * 0.4;
            const rectX = (width - rectWidth) / 2;
            const rectY = (height - rectHeight) / 2;

            shapes += `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="${thirdColor[0]}" opacity="0.5" />`;
          }
        }
      } else {
        // Fallback to a simple gray rectangle
        shapes = `<rect width="${width}" height="${height}" fill="#808080" />`;
      }

      const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${shapes}
</svg>`;

      console.log('Created simple geometric SVG with', sortedColors.length, 'colors');
      return svg;
    } catch (error) {
      throw new Error(`Failed to create geometric SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test if ImageTracer can be loaded
   * @returns Promise that resolves to true if ImageTracer is available
   */
  async testImageTracerAvailability(): Promise<boolean> {
    try {
      console.log('Testing ImageTracer availability...');
      const module = await import('imagetracer');
      console.log('ImageTracer module loaded:', Object.keys(module));

      const hasFunction = !!(module.imageTracer || module.default ||
        (typeof module === 'function'));
      console.log('ImageTracer function available:', hasFunction);

      return hasFunction;
    } catch (error) {
      console.error('ImageTracer not available:', error);
      return false;
    }
  }

  // Add a helper to clean the SVG output
  private cleanSvg(svg: string, width: number, height: number): string {
    // Remove metadata, filters, and groups, keep only paths
    // Set width, height, and viewBox
    // 1. Remove comments, metadata, <defs>, <g>, <filter>, <desc>, <title>
    svg = svg
      .replace(/<\?xml[^>]*>/g, '')
      .replace(/<!--([\s\S]*?)-->/g, '')
      .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
      .replace(/<defs[\s\S]*?<\/defs>/gi, '')
      .replace(/<g[\s\S]*?<\/g>/gi, '')
      .replace(/<filter[\s\S]*?<\/filter>/gi, '')
      .replace(/<desc[\s\S]*?<\/desc>/gi, '')
      .replace(/<title[\s\S]*?<\/title>/gi, '');
    // 2. Remove all group tags but keep their children
    svg = svg.replace(/<g[^>]*>/gi, '').replace(/<\/g>/gi, '');
    // 3. Set width, height, and viewBox on <svg>
    svg = svg.replace(
      /<svg([^>]*)>/i,
      `<svg$1 width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    );
    // 4. Remove any embedded raster images
    svg = svg.replace(/<image[\s\S]*?<\/image>/gi, '');
    // 5. Remove any style or script tags
    svg = svg.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
    // 6. Remove empty lines
    svg = svg.replace(/^\s*\n/gm, '');
    return svg.trim();
  }
}

// Export singleton instance
export const imageProcessingService = new ImageProcessingServiceImpl();