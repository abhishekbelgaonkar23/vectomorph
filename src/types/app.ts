// Core application types and interfaces
import type { TracingOptions } from './imagetracer';

export enum ProcessingState {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface AppState {
  uploadedFile: File | null;
  isProcessing: boolean;
  svgResult: string | null;
  error: string | null;
  processingState: ProcessingState;
}

export interface ConversionSession {
  id: string;
  originalFile: File;
  state: ProcessingState;
  startTime: Date;
  endTime?: Date;
  svgResult?: string;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface AppConfig {
  maxFileSize: number; // in bytes
  supportedFormats: string[];
  defaultTracingOptions: TracingOptions;
  ui: {
    theme: 'light' | 'dark';
    animations: boolean;
  };
}

// Component prop interfaces
export interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedTypes: string[];
  maxFileSize: number;
  disabled?: boolean;
}

export interface ImageProcessorProps {
  file: File;
  onProcessingStart: () => void;
  onProcessingComplete: (svg: string) => void;
  onProcessingError: (error: string) => void;
}

export interface LoadingIndicatorProps {
  isVisible: boolean;
  message?: string;
}

export interface SVGPreviewProps {
  svgContent: string;
  originalFileName: string;
}

export interface DownloadButtonProps {
  svgContent: string;
  fileName: string;
  disabled?: boolean;
}

// Service interfaces
export interface ImageProcessingService {
  processImage(file: File, options?: TracingOptions): Promise<string>;
  validateFile(file: File): ValidationResult;
  getDefaultOptions(): TracingOptions;
}

export interface FileHandlingService {
  readFileAsDataURL(file: File): Promise<string>;
  createDownloadBlob(content: string, mimeType: string): Blob;
  triggerDownload(blob: Blob, fileName: string): void;
  validateFileType(file: File, allowedTypes: string[]): boolean;
  validateFileSize(file: File, maxSize: number): boolean;
}

// Error handling types
export enum ErrorCategory {
  FILE_VALIDATION = 'file_validation',
  PROCESSING = 'processing',
  BROWSER_COMPATIBILITY = 'browser_compatibility'
}

export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public userMessage: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export interface ErrorHandler {
  handleFileError(error: AppError): void;
  handleProcessingError(error: AppError): void;
  handleBrowserError(error: AppError): void;
  displayUserFriendlyMessage(error: AppError): void;
}