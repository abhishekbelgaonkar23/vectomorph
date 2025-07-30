import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock URL.createObjectURL and URL.revokeObjectURL for testing
global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock FileReader for testing
class MockFileReader implements Partial<FileReader> {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  readyState: 0 | 1 | 2 = 0;
  
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

  readAsDataURL(file: Blob): void {
    this.readyState = 1; // LOADING
    setTimeout(() => {
      this.readyState = 2; // DONE
      this.result = `data:${file.type};base64,mock-base64-data`;
      if (this.onload) {
        this.onload.call(this as any, { target: this } as unknown as ProgressEvent<FileReader>);
      }
    }, 0);
  }

  readAsArrayBuffer(file: Blob): void {
    // Mock implementation
  }

  readAsBinaryString(file: Blob): void {
    // Mock implementation
  }

  readAsText(file: Blob, encoding?: string): void {
    // Mock implementation
  }

  abort(): void {
    this.readyState = 2; // DONE
    if (this.onabort) {
      this.onabort.call(this as any, { target: this } as unknown as ProgressEvent<FileReader>);
    }
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean { return true; }
}

global.FileReader = MockFileReader as any;