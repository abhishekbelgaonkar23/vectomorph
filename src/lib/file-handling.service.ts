import type { FileHandlingService, ValidationResult } from '~/types/app';
import { AppError, ErrorCategory } from '~/types/app';

/**
 * Service class for handling file operations including validation, reading, and downloading
 * All operations are performed client-side without server interaction
 */
export class FileHandlingServiceImpl implements FileHandlingService {
  /**
   * Reads a file and converts it to a data URL using FileReader API
   * @param file - The file to read
   * @returns Promise that resolves to data URL string
   */
  async readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new AppError(
          'No file provided',
          ErrorCategory.FILE_VALIDATION,
          'Please select a file to upload',
          true
        ));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new AppError(
            'Failed to read file as data URL',
            ErrorCategory.FILE_VALIDATION,
            'Unable to read the selected file. Please try again.',
            true
          ));
        }
      };

      reader.onerror = () => {
        reject(new AppError(
          `FileReader error: ${reader.error?.message || 'Unknown error'}`,
          ErrorCategory.FILE_VALIDATION,
          'Error reading file. Please try selecting a different file.',
          true
        ));
      };

      reader.onabort = () => {
        reject(new AppError(
          'File reading was aborted',
          ErrorCategory.FILE_VALIDATION,
          'File reading was cancelled. Please try again.',
          true
        ));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Creates a downloadable blob from content string
   * @param content - The content to create blob from
   * @param mimeType - MIME type for the blob
   * @returns Blob object ready for download
   */
  createDownloadBlob(content: string, mimeType: string): Blob {
    if (!content) {
      throw new AppError(
        'No content provided for blob creation',
        ErrorCategory.FILE_VALIDATION,
        'No content available to download',
        false
      );
    }

    try {
      return new Blob([content], { type: mimeType });
    } catch (error) {
      throw new AppError(
        `Failed to create blob: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.BROWSER_COMPATIBILITY,
        'Unable to prepare file for download. Your browser may not support this feature.',
        false
      );
    }
  }

  /**
   * Triggers download of a blob with specified filename
   * @param blob - The blob to download
   * @param fileName - Name for the downloaded file
   */
  triggerDownload(blob: Blob, fileName: string): void {
    if (!blob) {
      throw new AppError(
        'No blob provided for download',
        ErrorCategory.FILE_VALIDATION,
        'No file available to download',
        false
      );
    }

    if (!fileName) {
      throw new AppError(
        'No filename provided for download',
        ErrorCategory.FILE_VALIDATION,
        'Unable to determine filename for download',
        false
      );
    }

    try {
      // Create object URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create temporary anchor element for download
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      
      // Clean up object URL to prevent memory leaks
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new AppError(
        `Failed to trigger download: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.BROWSER_COMPATIBILITY,
        'Unable to download file. Your browser may not support this feature.',
        false
      );
    }
  }

  /**
   * Validates if file type is in allowed types list
   * @param file - File to validate
   * @param allowedTypes - Array of allowed MIME types or extensions
   * @returns true if file type is allowed
   */
  validateFileType(file: File, allowedTypes: string[]): boolean {
    if (!file) {
      return false;
    }

    if (!allowedTypes || allowedTypes.length === 0) {
      return true; // No restrictions
    }

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    return allowedTypes.some(allowedType => {
      const normalizedType = allowedType.toLowerCase();
      
      // Check MIME type
      if (fileType === normalizedType) {
        return true;
      }
      
      // Check file extension
      if (normalizedType.startsWith('.') && fileName.endsWith(normalizedType)) {
        return true;
      }
      
      // Check if allowedType is extension without dot
      if (!normalizedType.includes('/') && !normalizedType.startsWith('.')) {
        return fileName.endsWith(`.${normalizedType}`);
      }
      
      return false;
    });
  }

  /**
   * Validates if file size is within allowed limit
   * @param file - File to validate
   * @param maxSize - Maximum allowed size in bytes
   * @returns true if file size is within limit
   */
  validateFileSize(file: File, maxSize: number): boolean {
    if (!file) {
      return false;
    }

    if (maxSize <= 0) {
      return true; // No size limit
    }

    return file.size <= maxSize;
  }

  /**
   * Comprehensive file validation combining type and size checks
   * @param file - File to validate
   * @param allowedTypes - Array of allowed MIME types or extensions
   * @param maxSize - Maximum allowed size in bytes
   * @returns ValidationResult with success status and error message
   */
  validateFile(file: File, allowedTypes: string[], maxSize: number): ValidationResult {
    if (!file) {
      return {
        isValid: false,
        error: 'No file provided'
      };
    }

    // Check file type
    if (!this.validateFileType(file, allowedTypes)) {
      const allowedTypesStr = allowedTypes.join(', ');
      return {
        isValid: false,
        error: `File type not supported. Allowed types: ${allowedTypesStr}`
      };
    }

    // Check file size
    if (!this.validateFileSize(file, maxSize)) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
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
   * Utility method to format file size in human-readable format
   * @param bytes - Size in bytes
   * @returns Formatted size string
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Utility method to get file extension from filename
   * @param fileName - Name of the file
   * @returns File extension with dot, or empty string if no extension
   */
  getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  }

  /**
   * Utility method to generate SVG filename from original image filename
   * @param originalFileName - Original image filename
   * @returns SVG filename with .svg extension
   */
  generateSvgFileName(originalFileName: string): string {
    const nameWithoutExtension = originalFileName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExtension}.svg`;
  }
}

// Export singleton instance
export const fileHandlingService = new FileHandlingServiceImpl();