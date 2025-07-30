import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileHandlingServiceImpl } from '../file-handling.service';
import { ErrorCategory, AppError } from '~/types/app';

describe('FileHandlingService', () => {
  let service: FileHandlingServiceImpl;
  let mockFile: File;

  beforeEach(() => {
    service = new FileHandlingServiceImpl();
    mockFile = new File(['test content'], 'test.png', { type: 'image/png' });
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('readFileAsDataURL', () => {
    it('should successfully read file as data URL', async () => {
      const result = await service.readFileAsDataURL(mockFile);
      
      expect(result).toBe('data:image/png;base64,mock-base64-data');
    });

    it('should reject when no file is provided', async () => {
      await expect(service.readFileAsDataURL(null as any)).rejects.toThrow(AppError);
      
      try {
        await service.readFileAsDataURL(null as any);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.FILE_VALIDATION);
        expect((error as AppError).userMessage).toBe('Please select a file to upload');
        expect((error as AppError).recoverable).toBe(true);
      }
    });

    it('should handle FileReader error', async () => {
      // Mock FileReader to simulate error
      const mockFileReader = {
        readAsDataURL: vi.fn((file: Blob) => {
          setTimeout(() => {
            if (mockFileReader.onerror) {
              mockFileReader.onerror.call(mockFileReader, {} as any);
            }
          }, 0);
        }),
        onload: null,
        onerror: vi.fn(),
        onabort: null,
        error: new DOMException('Mock error'),
      };

      global.FileReader = vi.fn(() => mockFileReader) as any;

      await expect(service.readFileAsDataURL(mockFile)).rejects.toThrow(AppError);
    });

    it('should handle FileReader abort', async () => {
      // Mock FileReader to simulate abort
      const mockFileReader = {
        readAsDataURL: vi.fn((file: Blob) => {
          setTimeout(() => {
            if (mockFileReader.onabort) {
              mockFileReader.onabort.call(mockFileReader, {} as any);
            }
          }, 0);
        }),
        onload: null,
        onerror: null,
        onabort: vi.fn(),
      };

      global.FileReader = vi.fn(() => mockFileReader) as any;

      await expect(service.readFileAsDataURL(mockFile)).rejects.toThrow(AppError);
    });

    it('should handle invalid result type', async () => {
      // Mock FileReader to return non-string result
      const mockFileReader = {
        readAsDataURL: vi.fn((file: Blob) => {
          setTimeout(() => {
            if (mockFileReader.onload) {
              mockFileReader.onload.call(mockFileReader, { target: { result: new ArrayBuffer(8) } } as any);
            }
          }, 0);
        }),
        onload: vi.fn(),
        onerror: null,
        onabort: null,
      };

      global.FileReader = vi.fn(() => mockFileReader) as any;

      await expect(service.readFileAsDataURL(mockFile)).rejects.toThrow(AppError);
    });
  });

  describe('createDownloadBlob', () => {
    it('should create blob with correct content and MIME type', () => {
      const content = '<svg>test</svg>';
      const mimeType = 'image/svg+xml';
      
      const blob = service.createDownloadBlob(content, mimeType);
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe(mimeType);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should throw error when no content provided', () => {
      expect(() => service.createDownloadBlob('', 'image/svg+xml')).toThrow(AppError);
      
      try {
        service.createDownloadBlob('', 'image/svg+xml');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.FILE_VALIDATION);
        expect((error as AppError).recoverable).toBe(false);
      }
    });

    it('should handle Blob constructor error', () => {
      // Mock Blob constructor to throw error
      const originalBlob = global.Blob;
      global.Blob = vi.fn(() => {
        throw new Error('Blob creation failed');
      }) as any;

      expect(() => service.createDownloadBlob('content', 'text/plain')).toThrow(AppError);

      try {
        service.createDownloadBlob('content', 'text/plain');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.BROWSER_COMPATIBILITY);
        expect((error as AppError).recoverable).toBe(false);
      }

      // Restore original Blob
      global.Blob = originalBlob;
    });
  });

  describe('triggerDownload', () => {
    let mockAnchor: any;
    let mockDocument: any;
    let originalBlob: any;

    beforeEach(() => {
      // Store original Blob constructor
      originalBlob = global.Blob;
      
      mockAnchor = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn(),
      };

      mockDocument = {
        createElement: vi.fn(() => mockAnchor),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };

      global.document = mockDocument;
    });

    afterEach(() => {
      // Restore original Blob constructor
      global.Blob = originalBlob;
    });

    it('should trigger download successfully', () => {
      const blob = new originalBlob(['test'], { type: 'text/plain' });
      const fileName = 'test.txt';
      
      service.triggerDownload(blob, fileName);
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe('mock-object-url');
      expect(mockAnchor.download).toBe(fileName);
      expect(mockAnchor.style.display).toBe('none');
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockAnchor);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-object-url');
    });

    it('should throw error when no blob provided', () => {
      expect(() => service.triggerDownload(null as any, 'test.txt')).toThrow(AppError);
      
      try {
        service.triggerDownload(null as any, 'test.txt');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.FILE_VALIDATION);
        expect((error as AppError).recoverable).toBe(false);
      }
    });

    it('should throw error when no filename provided', () => {
      const blob = new originalBlob(['test'], { type: 'text/plain' });
      
      expect(() => service.triggerDownload(blob, '')).toThrow(AppError);
      
      try {
        service.triggerDownload(blob, '');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).category).toBe(ErrorCategory.FILE_VALIDATION);
        expect((error as AppError).recoverable).toBe(false);
      }
    });

    it('should handle download error', () => {
      const blob = new originalBlob(['test'], { type: 'text/plain' });
      
      // Mock createElement to throw error
      mockDocument.createElement = vi.fn(() => {
        throw new Error('createElement failed');
      });
      
      expect(() => service.triggerDownload(blob, 'test.txt')).toThrow(AppError);
    });
  });

  describe('validateFileType', () => {
    it('should return true for valid file type', () => {
      const allowedTypes = ['image/png', 'image/jpeg', '.jpg'];
      
      expect(service.validateFileType(mockFile, allowedTypes)).toBe(true);
    });

    it('should return true for valid file extension', () => {
      const allowedTypes = ['.png', '.jpg'];
      
      expect(service.validateFileType(mockFile, allowedTypes)).toBe(true);
    });

    it('should return true for extension without dot', () => {
      const allowedTypes = ['png', 'jpg'];
      
      expect(service.validateFileType(mockFile, allowedTypes)).toBe(true);
    });

    it('should return false for invalid file type', () => {
      const allowedTypes = ['image/jpeg', '.jpg'];
      
      expect(service.validateFileType(mockFile, allowedTypes)).toBe(false);
    });

    it('should return false when no file provided', () => {
      const allowedTypes = ['image/png'];
      
      expect(service.validateFileType(null as any, allowedTypes)).toBe(false);
    });

    it('should return true when no restrictions', () => {
      expect(service.validateFileType(mockFile, [])).toBe(true);
    });
  });

  describe('validateFileSize', () => {
    it('should return true for valid file size', () => {
      const maxSize = 1024 * 1024; // 1MB
      
      expect(service.validateFileSize(mockFile, maxSize)).toBe(true);
    });

    it('should return false for oversized file', () => {
      const maxSize = 5; // 5 bytes, smaller than our test file
      
      expect(service.validateFileSize(mockFile, maxSize)).toBe(false);
    });

    it('should return false when no file provided', () => {
      const maxSize = 1024 * 1024;
      
      expect(service.validateFileSize(null as any, maxSize)).toBe(false);
    });

    it('should return true when no size limit', () => {
      expect(service.validateFileSize(mockFile, 0)).toBe(true);
      expect(service.validateFileSize(mockFile, -1)).toBe(true);
    });
  });

  describe('validateFile', () => {
    const allowedTypes = ['image/png', 'image/jpeg'];
    const maxSize = 1024 * 1024; // 1MB

    it('should return valid result for good file', () => {
      const result = service.validateFile(mockFile, allowedTypes, maxSize);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid result for no file', () => {
      const result = service.validateFile(null as any, allowedTypes, maxSize);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('should return invalid result for wrong file type', () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = service.validateFile(textFile, allowedTypes, maxSize);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type not supported');
      expect(result.error).toContain('image/png, image/jpeg');
    });

    it('should return invalid result for oversized file', () => {
      const maxSize = 5; // 5 bytes
      const result = service.validateFile(mockFile, allowedTypes, maxSize);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size');
      expect(result.error).toContain('exceeds maximum allowed size');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(service.formatFileSize(0)).toBe('0 Bytes');
      expect(service.formatFileSize(1024)).toBe('1 KB');
      expect(service.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format decimal values correctly', () => {
      expect(service.formatFileSize(1536)).toBe('1.5 KB'); // 1.5 KB
      expect(service.formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB'); // 2.5 MB
    });
  });

  describe('getFileExtension', () => {
    it('should return extension with dot', () => {
      expect(service.getFileExtension('test.png')).toBe('.png');
      expect(service.getFileExtension('image.jpeg')).toBe('.jpeg');
      expect(service.getFileExtension('file.name.with.dots.svg')).toBe('.svg');
    });

    it('should return empty string for no extension', () => {
      expect(service.getFileExtension('filename')).toBe('');
      expect(service.getFileExtension('')).toBe('');
    });
  });

  describe('generateSvgFileName', () => {
    it('should replace extension with .svg', () => {
      expect(service.generateSvgFileName('image.png')).toBe('image.svg');
      expect(service.generateSvgFileName('photo.jpeg')).toBe('photo.svg');
      expect(service.generateSvgFileName('file.name.jpg')).toBe('file.name.svg');
    });

    it('should add .svg to filename without extension', () => {
      expect(service.generateSvgFileName('filename')).toBe('filename.svg');
    });

    it('should handle empty filename', () => {
      expect(service.generateSvgFileName('')).toBe('.svg');
    });
  });
});