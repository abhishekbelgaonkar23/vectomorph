import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImageProcessingServiceImpl } from '../image-processing.service';
import { AppError, ErrorCategory } from '~/types/app';

// Create global mock
const mockImageDataToSVG = vi.fn();

// Mock imagetracer module
vi.mock('imagetracer', () => ({
  ImageTracer: vi.fn().mockImplementation(() => ({
    imageDataToSVG: mockImageDataToSVG
  }))
}));

// Mock DOM APIs
const mockCanvas = {
  width: 100,
  height: 100,
  getContext: vi.fn(),
  parentNode: null
};

const mockContext = {
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    width: 100,
    height: 100,
    data: new Uint8ClampedArray(100 * 100 * 4)
  })),
  clearRect: vi.fn(),
  putImageData: vi.fn()
};

const mockImage = {
  naturalWidth: 100,
  naturalHeight: 100,
  src: '',
  onload: null as ((event: Event) => void) | null,
  onerror: null as ((event: Event) => void) | null
};

// Mock global objects
Object.defineProperty(global, 'Image', {
  value: vi.fn(() => mockImage),
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => mockCanvas)
  },
  writable: true
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  },
  writable: true
});

describe('ImageProcessingService', () => {
  let service: ImageProcessingServiceImpl;
  let mockFile: File;

  beforeEach(async () => {
    service = new ImageProcessingServiceImpl();
    
    // Reset the mock
    mockImageDataToSVG.mockReset();
    
    // Create mock file
    mockFile = new File(['mock content'], 'test.png', { 
      type: 'image/png',
      lastModified: Date.now()
    });

    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockCanvas.getContext.mockReturnValue(mockContext);
    mockContext.getImageData.mockReturnValue({
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(40000) // 100x100x4
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should return valid for supported image types', () => {
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const bmpFile = new File([''], 'test.bmp', { type: 'image/bmp' });
      const gifFile = new File([''], 'test.gif', { type: 'image/gif' });

      expect(service.validateFile(pngFile)).toEqual({ isValid: true });
      expect(service.validateFile(jpegFile)).toEqual({ isValid: true });
      expect(service.validateFile(bmpFile)).toEqual({ isValid: true });
      expect(service.validateFile(gifFile)).toEqual({ isValid: true });
    });

    it('should return invalid for unsupported file types', () => {
      const textFile = new File([''], 'test.txt', { type: 'text/plain' });
      const result = service.validateFile(textFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should return invalid for files exceeding size limit', () => {
      // Create a mock file that appears to be larger than 10MB
      const largeFile = new File([''], 'large.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB

      const result = service.validateFile(largeFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should return invalid for null/undefined file', () => {
      const result = service.validateFile(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('No file provided');
    });
  });

  describe('getDefaultOptions', () => {
    it('should return default tracing options', () => {
      const options = service.getDefaultOptions();
      
      expect(options).toEqual({
        ltres: 1,
        qtres: 1,
        pathomit: 8,
        colorsampling: 1,
        numberofcolors: 16,
        mincolorratio: 0.02,
        colorquantcycles: 3
      });
    });

    it('should return a copy of options (not reference)', () => {
      const options1 = service.getDefaultOptions();
      const options2 = service.getDefaultOptions();
      
      expect(options1).not.toBe(options2);
      expect(options1).toEqual(options2);
    });
  });

  describe('processImage', () => {
    beforeEach(() => {
      // Mock imageDataToSVG to return valid SVG
      mockImageDataToSVG.mockReturnValue('<svg><rect width="100" height="100"/></svg>');
    });

    it('should successfully process a valid image file', async () => {
      const expectedSvg = '<svg><rect width="100" height="100"/></svg>';
      mockImageDataToSVG.mockReturnValue(expectedSvg);

      const processPromise = service.processImage(mockFile);
      
      // Simulate successful image loading
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload(new Event('load'));
        }
      }, 10);

      const result = await processPromise;
      
      expect(result).toBe(expectedSvg);
      // ImageTracer is called with imageData and default options
      expect(mockImageDataToSVG).toHaveBeenCalledWith(expect.any(Object), {
        ltres: 1,
        qtres: 1,
        pathomit: 8,
        colorsampling: 1,
        numberofcolors: 16,
        mincolorratio: 0.02,
        colorquantcycles: 3,
      });
    });

    it('should use custom options when provided', async () => {
      const customOptions = { numberofcolors: 8, pathomit: 12 };
      const expectedSvg = '<svg><rect width="100" height="100"/></svg>';
      mockImageDataToSVG.mockReturnValue(expectedSvg);

      const processPromise = service.processImage(mockFile, customOptions);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload(new Event('load'));
        }
      }, 10);

      await processPromise;
      
      // ImageTracer is called with imageData and merged options (custom options override defaults)
      expect(mockImageDataToSVG).toHaveBeenCalledWith(expect.any(Object), {
        ltres: 1,           // Default value
        qtres: 1,           // Default value
        pathomit: 12,       // Custom option overrides default
        colorsampling: 1,   // Default value
        numberofcolors: 8,  // Custom option overrides default
        mincolorratio: 0.02, // Default value
        colorquantcycles: 3, // Default value
      });
    });

    it('should throw AppError for invalid file', async () => {
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
      
      await expect(service.processImage(invalidFile)).rejects.toThrow(AppError);
      await expect(service.processImage(invalidFile)).rejects.toThrow('Unsupported file type');
    });

    it('should throw AppError when image fails to load', async () => {
      const processPromise = service.processImage(mockFile);
      
      // Trigger error after a short delay
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror(new Event('error'));
        }
      }, 10);

      await expect(processPromise).rejects.toThrow(AppError);
      await expect(processPromise).rejects.toThrow('Failed to load image');
    });

    it('should throw AppError when canvas context is not available', async () => {
      mockCanvas.getContext.mockReturnValue(null);

      const processPromise = service.processImage(mockFile);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload(new Event('load'));
        }
      }, 10);

      await expect(processPromise).rejects.toThrow(AppError);
      await expect(processPromise).rejects.toThrow('Failed to get 2D context from canvas');
    });

    it('should throw AppError when ImageTracer returns invalid result', async () => {
      mockImageDataToSVG.mockReturnValue(''); // Invalid empty result

      const processPromise = service.processImage(mockFile);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload(new Event('load'));
        }
      }, 10);

      await expect(processPromise).rejects.toThrow(AppError);
      await expect(processPromise).rejects.toThrow('ImageTracer returned invalid result');
    });

    it('should throw AppError when ImageTracer returns malformed SVG', async () => {
      mockImageDataToSVG.mockReturnValue('not an svg'); // Malformed SVG

      const processPromise = service.processImage(mockFile);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload(new Event('load'));
        }
      }, 10);

      await expect(processPromise).rejects.toThrow(AppError);
      await expect(processPromise).rejects.toThrow('Generated SVG is malformed');
    });

    it('should clean up resources after processing', async () => {
      mockImageDataToSVG.mockReturnValue('<svg><rect width="100" height="100"/></svg>');

      const processPromise = service.processImage(mockFile);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload(new Event('load'));
        }
      }, 10);

      await processPromise;
      
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 100, 100);
    });
  });

  describe('getOptimalOptions', () => {
    it('should return default options when canvas context is not available', () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      const options = service.getOptimalOptions(mockCanvas as any);
      
      expect(options).toEqual(service.getDefaultOptions());
    });

    it('should adjust options for large images', () => {
      mockContext.getImageData.mockReturnValue({
        width: 1500,
        height: 1000,
        data: new Uint8ClampedArray(6000000) // 1.5MP
      });

      const options = service.getOptimalOptions(mockCanvas as any);
      
      expect(options.pathomit).toBe(12);
      expect(options.numberofcolors).toBe(12);
    });

    it('should adjust options for medium images', () => {
      mockContext.getImageData.mockReturnValue({
        width: 800,
        height: 700,
        data: new Uint8ClampedArray(2240000) // 0.56MP
      });

      const options = service.getOptimalOptions(mockCanvas as any);
      
      expect(options.pathomit).toBe(10);
      expect(options.numberofcolors).toBe(14);
    });

    it('should use default options for small images', () => {
      mockContext.getImageData.mockReturnValue({
        width: 400,
        height: 400,
        data: new Uint8ClampedArray(640000) // 0.16MP
      });

      const options = service.getOptimalOptions(mockCanvas as any);
      
      expect(options.pathomit).toBe(8); // Default value
      expect(options.numberofcolors).toBe(16); // Default value
    });
  });

  describe('estimateProcessingTime', () => {
    it('should estimate processing time based on file size', () => {
      const smallFile = new File([''], 'small.png', { type: 'image/png' });
      Object.defineProperty(smallFile, 'size', { value: 500 * 1024 }); // 500KB

      const largeFile = new File([''], 'large.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', { value: 3 * 1024 * 1024 }); // 3MB

      expect(service.estimateProcessingTime(smallFile)).toBe(2); // ~3 seconds per MB, minimum 1 second
      expect(service.estimateProcessingTime(largeFile)).toBe(9); // ~3 seconds per MB
    });

    it('should return minimum 1 second for very small files', () => {
      const tinyFile = new File([''], 'tiny.png', { type: 'image/png' });
      Object.defineProperty(tinyFile, 'size', { value: 1024 }); // 1KB

      expect(service.estimateProcessingTime(tinyFile)).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should create AppError with correct category for file validation', async () => {
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
      
      try {
        await service.processImage(invalidFile);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.FILE_VALIDATION);
        expect((error as AppError).recoverable).toBe(true);
      }
    });

    it('should create AppError with correct category for processing errors', async () => {
      mockImageDataToSVG.mockImplementation(() => {
        throw new Error('Processing failed');
      });

      const processPromise = service.processImage(mockFile);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload(new Event('load'));
        }
      }, 10);

      try {
        await processPromise;
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.PROCESSING);
        expect((error as AppError).recoverable).toBe(true);
      }
    });

    it('should create AppError with correct category for browser compatibility', async () => {
      mockCanvas.getContext.mockReturnValue(null);

      const processPromise = service.processImage(mockFile);
      
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload(new Event('load'));
        }
      }, 10);

      try {
        await processPromise;
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.BROWSER_COMPATIBILITY);
        expect((error as AppError).recoverable).toBe(false);
      }
    });
  });
});